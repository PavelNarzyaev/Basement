import type { Vector3 } from 'three';

export class RayHitDto {
  constructor(
    readonly position: Vector3,
    readonly normal: Vector3,
    readonly distance: number,
  ) {}
}
