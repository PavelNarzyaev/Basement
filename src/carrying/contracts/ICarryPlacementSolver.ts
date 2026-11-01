import type { Vector3 } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { ICarryable } from './ICarryable';

export interface ICarryPlacementSolver {
  getHoldingCenter(playerCenter: Vector3, rotationY: number, crate: ICarryable, target: Vector3): Vector3;
  canOccupyPose(crate: ICarryable, target: Vector3, rotationY: number): boolean;
  canSweepToPose(crate: ICarryable, target: Vector3, rotationY: number): boolean;
  findSupportedPlacement(crate: ICarryable, playerCollider: Capsule): Vector3 | undefined;
}
