import type { Box3, Color, Vector3 } from 'three';

export class DustVolumeDto {
  constructor(
    public readonly bounds: Box3,
    public readonly lampPositions: readonly Vector3[],
    public readonly lampColor: Color,
    public readonly lampIntensity: number,
  ) {}
}
