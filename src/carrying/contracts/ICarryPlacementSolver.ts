import type { Vector3 } from 'three';
import type { ICarryable } from './ICarryable';

export interface ICarryPlacementSolver {
  findSupportedPlacement(crate: ICarryable): Vector3 | undefined;
}
