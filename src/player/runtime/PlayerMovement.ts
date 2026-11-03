import { Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import { playerSettings } from '../contracts/playerSettings';

export class PlayerMovement {
  readonly collider = new Capsule(
    new Vector3(0, playerSettings.colliderRadius, 0),
    new Vector3(0, playerSettings.colliderHeight - playerSettings.colliderRadius, 0),
    playerSettings.colliderRadius,
  );
  private readonly velocity = new Vector3();
  private readonly displacement = new Vector3();
  private readonly previousCollider = new Capsule();
  private readonly spawn: Vector3;
  private readonly minimumHeight: number;

  constructor(private readonly world: ICollisionWorld, spawn: Vector3) {
    this.spawn = spawn.clone();
    this.minimumHeight = world.bounds.min.y - playerSettings.fallResetDepth;
    this.reset();
  }

  get hasFallen(): boolean {
    return this.collider.start.y < this.minimumHeight;
  }

  integrateVelocity(desiredHorizontalVelocity: Vector3): void {
    this.velocity.x = desiredHorizontalVelocity.x;
    this.velocity.z = desiredHorizontalVelocity.z;
    this.velocity.y -= playerSettings.gravity * playerSettings.fixedStep;
  }

  moveAlongAxis(axis: 'x' | 'y' | 'z', ignoredBox?: YawBoxDto): void {
    this.previousCollider.copy(this.collider);
    this.displacement.set(0, 0, 0);
    this.displacement[axis] = this.velocity[axis] * playerSettings.fixedStep;
    this.collider.translate(this.displacement);
    for (let iteration = 0; iteration < playerSettings.maximumCollisionIterations; iteration++) {
      const collision = this.world.intersectCapsule(this.collider, ignoredBox);
      if (!collision) break;
      this.collider.translate(this.displacement.copy(collision.normal).multiplyScalar(collision.depth + playerSettings.contactSeparation));
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
    this.collider.start.y += playerSettings.colliderRadius;
    this.collider.end.copy(this.spawn);
    this.collider.end.y += playerSettings.colliderHeight - playerSettings.colliderRadius;
    this.velocity.set(0, 0, 0);
  }
}
