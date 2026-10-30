import type { Vector3 } from 'three';

export interface ICollision {
  readonly normal: Vector3;
  readonly depth: number;
}
