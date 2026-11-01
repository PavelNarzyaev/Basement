import type { Object3D, Vector3 } from 'three';
import type { ICarryable } from '../../carrying/contracts/ICarryable';

export interface IPlayer {
  readonly object: Object3D;
  readonly carriedObject: ICarryable | undefined;
  canPickUp(object: ICarryable): boolean;
  canPutDown(): boolean;
  tryPickUp(object: ICarryable): boolean;
  tryPutDown(): boolean;
  restart(): void;
  /** Movement is a direction in world coordinates, with magnitude capped at one. Yaw is an increment in radians about +Y. */
  update(delta: number, movement: Vector3, yawDeltaRadians?: number): void;
  dispose(): void;
}
