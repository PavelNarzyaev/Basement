import type { Object3D, Vector3 } from 'three';
import type { ICarryable } from '../../carrying/contracts/ICarryable';

export interface IPlayer {
  readonly object: Object3D;
  readonly carriedObject: ICarryable | undefined;
  tryPickUp(object: ICarryable): boolean;
  tryPutDown(): boolean;
  /** Movement is a direction in world coordinates, with magnitude capped at one. */
  update(delta: number, movement: Vector3): void;
  dispose(): void;
}
