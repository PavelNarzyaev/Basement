import type { Object3D, Vector3 } from 'three';

export interface ICeilingDebris {
  readonly object: Object3D;
  initialize(model: Object3D): void;
  burst(position: Vector3): void;
  reset(): void;
  update(delta: number): void;
  dispose(): void;
}
