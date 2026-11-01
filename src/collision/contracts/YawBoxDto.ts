import type { Vector3 } from 'three';

/** A box rotated only about world +Y; rotationY is measured in radians. */
export class YawBoxDto {
  constructor(
    readonly center: Vector3,
    readonly halfSize: Vector3,
    public rotationY = 0,
  ) {}
}
