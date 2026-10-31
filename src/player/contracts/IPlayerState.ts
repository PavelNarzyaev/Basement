import type { ICarryable } from '../../carrying/contracts/ICarryable';

export interface IPlayerState {
  readonly speed: number;
  readonly carriedObject: ICarryable | undefined;
}
