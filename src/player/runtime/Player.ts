import { CapsuleGeometry, MathUtils, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { ICarryPlacement } from '../../carrying/contracts/ICarryPlacement';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayer } from '../contracts/IPlayer';
import type { PlayerSpawnDto } from '../contracts/PlayerSpawnDto';
import { PlayerStateMachine } from './PlayerStateMachine';

export class Player implements IPlayer {
  private static readonly colliderRadius = 0.43;
  private static readonly colliderHeight = 1.8;
  private static readonly fixedStep = 1 / 120;

  readonly object: Mesh<CapsuleGeometry, MeshStandardMaterial>;
  private readonly collider = new Capsule(
    new Vector3(0, Player.colliderRadius, 0),
    new Vector3(0, Player.colliderHeight - Player.colliderRadius, 0),
    Player.colliderRadius,
  );
  private readonly spawn: Vector3;
  private readonly spawnRotationY: number;
  private readonly velocity = new Vector3();
  private readonly movement = new Vector3();
  private readonly displacement = new Vector3();
  private readonly minimumHeight: number;
  private readonly stateMachine = new PlayerStateMachine();
  private readonly holdingCenter = new Vector3();
  private readonly playerCenter = new Vector3();
  private readonly previousCollider = new Capsule();
  private accumulator = 0;

  constructor(
    private readonly world: ICollisionWorld,
    spawn: PlayerSpawnDto,
    private readonly carryPlacement: ICarryPlacement,
  ) {
    this.minimumHeight = world.bounds.min.y - 3;
    this.spawn = spawn.position.clone();
    this.spawnRotationY = spawn.rotationY;
    this.object = new Mesh(
      new CapsuleGeometry(Player.colliderRadius, Player.colliderHeight - 2 * Player.colliderRadius, 8, 16),
      new MeshStandardMaterial({ color: '#e3a34c', roughness: 0.7 }),
    );
    this.reset();
  }

  update(delta: number, movement: Vector3): void {
    this.movement.set(movement.x, 0, movement.z).clampLength(0, 1).multiplyScalar(this.stateMachine.state.speed);
    this.accumulator += Math.min(delta, 0.1);
    while (this.accumulator >= Player.fixedStep) {
      this.step();
      this.accumulator -= Player.fixedStep;
    }
    this.collider.getCenter(this.object.position);
  }

  get carriedObject(): ICarryable | undefined {
    return this.stateMachine.state.carriedObject;
  }

  tryPickUp(crate: ICarryable): boolean {
    if (this.carriedObject) return false;
    this.collider.getCenter(this.playerCenter);
    this.carryPlacement.getHoldingCenter(this.playerCenter, this.object.rotation.y, crate, this.holdingCenter);
    if (!this.carryPlacement.canMove(crate, this.holdingCenter, this.object.rotation.y)) return false;
    this.stateMachine.startCarrying(crate);
    this.syncCarriedObject();
    return true;
  }

  tryPutDown(): boolean {
    const crate = this.carriedObject;
    if (!crate) return false;
    const center = this.carryPlacement.findPlacement(crate, this.collider);
    if (!center) return false;
    crate.setPose(center, crate.collider.rotationY);
    this.stateMachine.stopCarrying();
    return true;
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.geometry.dispose();
    this.object.material.dispose();
  }

  private step(): void {
    this.rotate();
    this.velocity.x = this.movement.x;
    this.velocity.z = this.movement.z;
    this.velocity.y -= 20 * Player.fixedStep;
    for (const axis of ['x', 'z', 'y'] as const) {
      this.previousCollider.copy(this.collider);
      this.displacement.set(0, 0, 0);
      this.displacement[axis] = this.velocity[axis] * Player.fixedStep;
      this.collider.translate(this.displacement);
      for (let iteration = 0; iteration < 6; iteration++) {
        const collision = this.world.intersectCapsule(this.collider, this.carriedObject?.collider);
        if (!collision) break;
        this.collider.translate(this.displacement.copy(collision.normal).multiplyScalar(collision.depth + 0.00001));
        const inwardSpeed = this.velocity.dot(collision.normal);
        if (inwardSpeed < 0) this.velocity.addScaledVector(collision.normal, -inwardSpeed);
      }
      const crate = this.carriedObject;
      if (crate) {
        this.collider.getCenter(this.playerCenter);
        this.carryPlacement.getHoldingCenter(this.playerCenter, this.object.rotation.y, crate, this.holdingCenter);
        if (this.carryPlacement.canMove(crate, this.holdingCenter, this.object.rotation.y)) {
          this.syncCarriedObject();
        } else {
          this.collider.copy(this.previousCollider);
          this.velocity[axis] = 0;
        }
      }
    }
    if (this.collider.start.y < this.minimumHeight) this.reset();
  }

  private rotate(): void {
    if (this.movement.lengthSq() === 0) return;
    const target = Math.atan2(this.movement.x, this.movement.z);
    const crate = this.carriedObject;
    if (!crate) {
      this.object.rotation.y = target;
      return;
    }
    const angle = Math.atan2(Math.sin(target - this.object.rotation.y), Math.cos(target - this.object.rotation.y));
    const rotation = this.object.rotation.y + MathUtils.clamp(angle, -6 * Player.fixedStep, 6 * Player.fixedStep);
    this.collider.getCenter(this.playerCenter);
    this.carryPlacement.getHoldingCenter(this.playerCenter, rotation, crate, this.holdingCenter);
    if (this.carryPlacement.canMove(crate, this.holdingCenter, rotation)) {
      this.object.rotation.y = rotation;
      this.syncCarriedObject();
    }
  }

  private syncCarriedObject(): void {
    const crate = this.carriedObject;
    if (!crate) return;
    this.collider.getCenter(this.playerCenter);
    this.carryPlacement.getHoldingCenter(this.playerCenter, this.object.rotation.y, crate, this.holdingCenter);
    crate.setPose(this.holdingCenter, this.object.rotation.y);
  }

  private reset(): void {
    this.collider.start.copy(this.spawn);
    this.collider.start.y += Player.colliderRadius;
    this.collider.end.copy(this.spawn);
    this.collider.end.y += Player.colliderHeight - Player.colliderRadius;
    this.velocity.set(0, 0, 0);
    this.object.rotation.y = this.spawnRotationY;
    this.collider.getCenter(this.object.position);
    this.syncCarriedObject();
  }
}
