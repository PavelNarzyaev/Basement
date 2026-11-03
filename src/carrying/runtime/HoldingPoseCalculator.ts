import { Vector3 } from 'three';
import { playerSettings } from '../../player/contracts/playerSettings';
import type { ICarryable } from '../contracts/ICarryable';
import type { IHoldingPoseCalculator } from '../contracts/IHoldingPoseCalculator';
import { carryPlacementSettings } from '../contracts/carryPlacementSettings';

export class HoldingPoseCalculator implements IHoldingPoseCalculator {
  private readonly up = new Vector3(0, 1, 0);

  getHoldingCenter(playerCenter: Vector3, rotationY: number, crate: ICarryable, target: Vector3): Vector3 {
    return target.set(0, carryPlacementSettings.holdingHeight, playerSettings.colliderRadius + crate.collider.halfSize.z + carryPlacementSettings.holdingGap)
      .applyAxisAngle(this.up, rotationY).add(playerCenter);
  }
}
