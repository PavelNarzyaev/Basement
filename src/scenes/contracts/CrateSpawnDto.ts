import type { Object3D, Vector3 } from 'three';

export class CrateSpawnDto {
  constructor(
    readonly model: Object3D,
    readonly center: Vector3,
    readonly rotationY: number,
  ) {}
}
