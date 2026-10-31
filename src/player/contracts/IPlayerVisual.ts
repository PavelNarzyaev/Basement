import type { Object3D } from 'three';

export interface IPlayerVisual {
  readonly object: Object3D;
  update(delta: number, speed: number, isCarrying: boolean): void;
  dispose(): void;
}
