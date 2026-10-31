import type { Vector3 } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { ICarryable } from './ICarryable';

export interface ICarryPlacement {
  getHoldingCenter(playerCenter: Vector3, rotationY: number, crate: ICarryable, target: Vector3): Vector3;
  canMove(crate: ICarryable, target: Vector3, rotationY: number): boolean;
  findPlacement(crate: ICarryable, playerCollider: Capsule): Vector3 | undefined;
}
