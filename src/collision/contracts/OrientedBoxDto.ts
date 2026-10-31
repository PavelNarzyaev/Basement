import type { Vector3 } from 'three';

export class OrientedBoxDto {
  constructor(
    readonly center: Vector3,
    readonly halfSize: Vector3,
    public rotationY = 0,
  ) {}
}
