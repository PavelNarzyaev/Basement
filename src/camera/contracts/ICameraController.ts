import type { Vector3 } from 'three';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';

export interface ICameraController {
  readonly yaw: number;
  addPitchDelta(pitchDeltaRadians: number): void;
  update(target: Vector3, yaw: number, ignoredBox?: OrientedBoxDto): void;
}
