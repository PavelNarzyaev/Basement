import { Vector3 } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import type { ICarryable } from '../contracts/ICarryable';
import type { ICarryCollisionValidator } from '../contracts/ICarryCollisionValidator';
import { carryPlacementSettings } from '../contracts/carryPlacementSettings';

export class CarryCollisionValidator implements ICarryCollisionValidator {
  private readonly trialBox = new YawBoxDto(new Vector3(), new Vector3());

  constructor(private readonly world: ICollisionWorld) {}

  canOccupyPose(crate: ICarryable, target: Vector3, rotationY: number): boolean {
    this.trialBox.center.copy(target);
    this.trialBox.halfSize.copy(crate.collider.halfSize);
    this.trialBox.rotationY = rotationY;
    return !this.world.hasBoxCollision(this.trialBox, crate.collider);
  }

  canSweepToPose(crate: ICarryable, target: Vector3, rotationY: number): boolean {
    const crateCollider = crate.collider;
    const angle = Math.atan2(Math.sin(rotationY - crateCollider.rotationY), Math.cos(rotationY - crateCollider.rotationY));
    const travel = crateCollider.center.distanceTo(target) + Math.abs(angle) * crateCollider.halfSize.length();
    const steps = Math.max(1, Math.ceil(travel / carryPlacementSettings.sweepStep));
    this.trialBox.halfSize.copy(crateCollider.halfSize);
    for (let step = 1; step <= steps; step++) {
      this.trialBox.center.lerpVectors(crateCollider.center, target, step / steps);
      this.trialBox.rotationY = crateCollider.rotationY + angle * step / steps;
      if (this.world.hasBoxCollision(this.trialBox, crateCollider)) return false;
    }
    return true;
  }
}
