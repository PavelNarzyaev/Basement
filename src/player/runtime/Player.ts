import { Group, MathUtils, Vector3 } from 'three';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { ICarryPlacement } from '../../carrying/contracts/ICarryPlacement';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayer } from '../contracts/IPlayer';
import type { IPlayerVisual } from '../contracts/IPlayerVisual';
import type { PlayerSpawnDto } from '../contracts/PlayerSpawnDto';
import { PlayerMovement } from './PlayerMovement';
import { PlayerStateMachine } from './PlayerStateMachine';

export class Player implements IPlayer {
  readonly object = new Group();
  private readonly movement: PlayerMovement;
  private readonly spawnRotationY: number;
  private readonly movementVelocity = new Vector3();
  private readonly stateMachine = new PlayerStateMachine();
  private readonly holdingCenter = new Vector3();
  private readonly playerCenter = new Vector3();
  private readonly stepStart = new Vector3();
  private traveledDistance = 0;
  private speed = 0;
  private targetRotationY = 0;
  private accumulator = 0;

  constructor(
    world: ICollisionWorld,
    spawn: PlayerSpawnDto,
    private readonly carryPlacement: ICarryPlacement,
    private readonly visual: IPlayerVisual,
  ) {
    this.movement = new PlayerMovement(world, spawn.position);
    this.spawnRotationY = spawn.rotationY;
    this.object.name = 'PlayerController';
    this.visual.object.position.y = -PlayerMovement.colliderHeight / 2;
    this.object.add(this.visual.object);
    this.reset();
  }

  update(delta: number, movement: Vector3, rotationY = this.object.rotation.y): void {
    this.targetRotationY += rotationY - this.object.rotation.y;
    this.movementVelocity.set(movement.x, 0, movement.z).clampLength(0, 1).multiplyScalar(this.stateMachine.state.speed);
    const elapsed = Math.min(delta, 0.1);
    this.accumulator += elapsed;
    this.traveledDistance = 0;
    let simulatedTime = 0;
    while (this.accumulator >= PlayerMovement.fixedStep) {
      this.step();
      this.accumulator -= PlayerMovement.fixedStep;
      simulatedTime += PlayerMovement.fixedStep;
    }
    this.movement.collider.getCenter(this.object.position);
    if (simulatedTime > 0) this.speed = this.traveledDistance / simulatedTime;
    if (this.movementVelocity.lengthSq() === 0) this.speed = 0;
    this.visual.update(elapsed, this.speed, Boolean(this.carriedObject));
  }

  get carriedObject(): ICarryable | undefined {
    return this.stateMachine.state.carriedObject;
  }

  canPickUp(crate: ICarryable): boolean {
    if (this.carriedObject) return false;
    this.movement.collider.getCenter(this.playerCenter);
    this.carryPlacement.getHoldingCenter(this.playerCenter, this.object.rotation.y, crate, this.holdingCenter);
    return this.carryPlacement.canOccupy(crate, this.holdingCenter, this.object.rotation.y);
  }

  canPutDown(): boolean {
    const crate = this.carriedObject;
    return Boolean(crate && this.carryPlacement.findPlacement(crate, this.movement.collider));
  }

  tryPickUp(crate: ICarryable): boolean {
    if (!this.canPickUp(crate)) return false;
    this.stateMachine.startCarrying(crate);
    this.syncCarriedObject();
    return true;
  }

  tryPutDown(): boolean {
    const crate = this.carriedObject;
    if (!crate) return false;
    const center = this.carryPlacement.findPlacement(crate, this.movement.collider);
    if (!center) return false;
    crate.setPose(center, crate.collider.rotationY);
    this.stateMachine.stopCarrying();
    return true;
  }

  dispose(): void {
    this.object.removeFromParent();
    this.visual.dispose();
  }

  private step(): void {
    this.stepStart.copy(this.movement.collider.start);
    this.rotate();
    this.movement.integrateVelocity(this.movementVelocity);
    for (const axis of ['x', 'z', 'y'] as const) {
      this.movement.moveAlongAxis(axis, this.carriedObject?.collider);
      const crate = this.carriedObject;
      if (crate) {
        this.movement.collider.getCenter(this.playerCenter);
        this.carryPlacement.getHoldingCenter(this.playerCenter, this.object.rotation.y, crate, this.holdingCenter);
        if (this.carryPlacement.canMove(crate, this.holdingCenter, this.object.rotation.y)) {
          this.syncCarriedObject();
        } else {
          this.movement.rollbackAxis(axis);
        }
      }
    }
    if (this.movement.hasFallen) {
      this.reset();
      this.traveledDistance = 0;
      return;
    }
    this.traveledDistance += Math.hypot(
      this.movement.collider.start.x - this.stepStart.x, this.movement.collider.start.z - this.stepStart.z,
    );
  }

  private rotate(): void {
    const target = this.targetRotationY;
    const crate = this.carriedObject;
    if (!crate) {
      this.object.rotation.y = target;
      return;
    }
    const angle = Math.atan2(Math.sin(target - this.object.rotation.y), Math.cos(target - this.object.rotation.y));
    const rotation = this.object.rotation.y + MathUtils.clamp(angle, -6 * PlayerMovement.fixedStep, 6 * PlayerMovement.fixedStep);
    this.movement.collider.getCenter(this.playerCenter);
    this.carryPlacement.getHoldingCenter(this.playerCenter, rotation, crate, this.holdingCenter);
    if (this.carryPlacement.canMove(crate, this.holdingCenter, rotation)) {
      this.object.rotation.y = rotation;
      this.syncCarriedObject();
    } else {
      this.targetRotationY = this.object.rotation.y;
    }
  }

  private syncCarriedObject(): void {
    const crate = this.carriedObject;
    if (!crate) return;
    this.movement.collider.getCenter(this.playerCenter);
    this.carryPlacement.getHoldingCenter(this.playerCenter, this.object.rotation.y, crate, this.holdingCenter);
    crate.setPose(this.holdingCenter, this.object.rotation.y);
  }

  restart(): void {
    if (this.carriedObject) this.stateMachine.stopCarrying();
    this.accumulator = 0;
    this.speed = 0;
    this.traveledDistance = 0;
    this.reset();
    this.visual.update(0, 0, false);
  }

  private reset(): void {
    this.movement.reset();
    this.object.rotation.y = this.spawnRotationY;
    this.targetRotationY = this.spawnRotationY;
    this.movement.collider.getCenter(this.object.position);
    this.syncCarriedObject();
  }
}
