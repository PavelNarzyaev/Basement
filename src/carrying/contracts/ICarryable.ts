import type { Object3D, Vector3 } from 'three';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';

export interface ICarryable {
  readonly object: Object3D;
  readonly collider: OrientedBoxDto;
  setPose(center: Vector3, rotationY: number): void;
}
