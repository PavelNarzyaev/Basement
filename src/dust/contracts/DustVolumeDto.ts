import type { Box3 } from 'three';

export class DustVolumeDto {
  constructor(
    public readonly bounds: Box3,
  ) {}
}
