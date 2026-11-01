import type { Box3, Object3D, Vector3 } from 'three';

export interface ICeilingDebris {
  readonly object: Object3D;
  initialize(bounds: Box3): void;
  burst(position: Vector3, direction: Vector3): void;
  reset(): void;
  update(deltaSeconds: number): void;
  dispose(): void;
}
