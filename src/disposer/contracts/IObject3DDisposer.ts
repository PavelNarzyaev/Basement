import type { Object3D } from 'three';

export interface IObject3DDisposer {
  /** Releases owned mesh resources without removing the object from its parent. */
  dispose(object: Object3D): void;
}
