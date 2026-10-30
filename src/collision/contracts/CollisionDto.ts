import type { Vector3 } from 'three';

export class CollisionDto {
  constructor(
    readonly normal: Vector3,
    readonly depth: number,
  ) {}
}
