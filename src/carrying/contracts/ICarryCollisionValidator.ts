import type { Vector3 } from 'three';
import type { ICarryable } from './ICarryable';

export interface ICarryCollisionValidator {
  canOccupyPose(crate: ICarryable, target: Vector3, rotationY: number): boolean;
  canSweepToPose(crate: ICarryable, target: Vector3, rotationY: number): boolean;
}
