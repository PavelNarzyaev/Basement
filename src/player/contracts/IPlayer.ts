import type { Object3D, Vector3 } from 'three';

export interface IPlayer {
  readonly object: Object3D;
  /** Movement is a direction in world coordinates, with magnitude capped at one. */
  update(delta: number, movement: Vector3): void;
  dispose(): void;
}
