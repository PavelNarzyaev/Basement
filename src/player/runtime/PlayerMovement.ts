import { Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';

export class PlayerMovement {
  static readonly colliderHeight = 1.8;
  static readonly fixedStep = 1 / 120;
  private static readonly colliderRadius = 0.43;

  readonly collider = new Capsule(
    new Vector3(0, PlayerMovement.colliderRadius, 0),
    new Vector3(0, PlayerMovement.colliderHeight - PlayerMovement.colliderRadius, 0),
    PlayerMovement.colliderRadius,
  );
  private readonly velocity = new Vector3();
  private readonly displacement = new Vector3();
  private readonly previousCollider = new Capsule();
  private readonly spawn: Vector3;
  private readonly minimumHeight: number;

  constructor(private readonly world: ICollisionWorld, spawn: Vector3) {
    this.spawn = spawn.clone();
    this.minimumHeight = world.bounds.min.y - 3;
    this.reset();
  }

  get hasFallen(): boolean {
    return this.collider.start.y < this.minimumHeight;
  }

  integrateVelocity(movementVelocity: Vector3): void {
    this.velocity.x = movementVelocity.x;
    this.velocity.z = movementVelocity.z;
    this.velocity.y -= 20 * PlayerMovement.fixedStep;
  }

  moveAlongAxis(axis: 'x' | 'y' | 'z', ignoredBox?: OrientedBoxDto): void {
    this.previousCollider.copy(this.collider);
    this.displacement.set(0, 0, 0);
    this.displacement[axis] = this.velocity[axis] * PlayerMovement.fixedStep;
    this.collider.translate(this.displacement);
    for (let iteration = 0; iteration < 6; iteration++) {
      const collision = this.world.intersectCapsule(this.collider, ignoredBox);
      if (!collision) break;
      this.collider.translate(this.displacement.copy(collision.normal).multiplyScalar(collision.depth + 0.00001));
      const inwardSpeed = this.velocity.dot(collision.normal);
      if (inwardSpeed < 0) this.velocity.addScaledVector(collision.normal, -inwardSpeed);
    }
  }

  // Roll back the last axis movement, preserving contact response on the other axes.
  rollbackAxis(axis: 'x' | 'y' | 'z'): void {
    this.collider.copy(this.previousCollider);
    this.velocity[axis] = 0;
  }

  reset(): void {
    this.collider.start.copy(this.spawn);
    this.collider.start.y += PlayerMovement.colliderRadius;
    this.collider.end.copy(this.spawn);
    this.collider.end.y += PlayerMovement.colliderHeight - PlayerMovement.colliderRadius;
    this.velocity.set(0, 0, 0);
  }
}
