import type { Vector3 } from 'three';

export class CratePlacementDto {
  constructor(readonly center: Vector3, readonly rotationY: number) {}
}
