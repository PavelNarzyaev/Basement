import type { Vector3 } from 'three';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';

export interface ICameraController {
  readonly yaw: number;
  addPitchDelta(pitchDeltaRadians: number): void;
  update(target: Vector3, yaw: number, ignoredBox?: YawBoxDto): void;
}
