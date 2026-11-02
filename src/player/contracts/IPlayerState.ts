import type { ICarryable } from '../../carrying/contracts/ICarryable';

export interface IPlayerState {
  readonly movementSpeed: number;
  readonly carriedObject: ICarryable | undefined;
}
