import type { Vector3 } from 'three';

export interface ICameraController {
  readonly yaw: number;
  rotate(horizontal: number, vertical: number): void;
  update(target: Vector3): void;
}
