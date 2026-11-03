import type { Vector3 } from 'three';
import type { ICarryable } from './ICarryable';

export interface IHoldingPoseCalculator {
  getHoldingCenter(playerCenter: Vector3, rotationY: number, crate: ICarryable, target: Vector3): Vector3;
}
