import type { Object3D } from 'three';

export interface IObject3DResourceDisposer {
  /** Releases shared mesh and skeleton resources once across all roots, without detaching objects. */
  dispose(object: Object3D, ...additionalObjects: Object3D[]): void;
}
