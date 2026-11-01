import type { Object3D } from 'three';

export interface IPlayerVisual {
  readonly object: Object3D;
  update(deltaSeconds: number, actualHorizontalSpeed: number, isCarrying: boolean): void;
  dispose(): void;
}
