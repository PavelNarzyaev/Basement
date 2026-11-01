import type { Object3D, Vector3 } from 'three';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';

export interface ICarryable {
  readonly object: Object3D;
  readonly collider: YawBoxDto;
  setPose(center: Vector3, rotationY: number): void;
}
