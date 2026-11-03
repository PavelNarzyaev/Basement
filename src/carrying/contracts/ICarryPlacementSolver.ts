import type { Vector3 } from 'three';
import type { ICarryable } from './ICarryable';

export interface ICarryPlacementSolver {
  getHoldingCenter(playerCenter: Vector3, rotationY: number, crate: ICarryable, target: Vector3): Vector3;
  canOccupyPose(crate: ICarryable, target: Vector3, rotationY: number): boolean;
  canSweepToPose(crate: ICarryable, target: Vector3, rotationY: number): boolean;
  findSupportedPlacement(crate: ICarryable): Vector3 | undefined;
}
