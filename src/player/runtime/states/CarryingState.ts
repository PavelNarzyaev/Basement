import type { ICarryable } from '../../../carrying/contracts/ICarryable';
import type { IPlayerState } from '../../contracts/IPlayerState';

export class CarryingState implements IPlayerState {
  readonly movementSpeed = 2.5;

  constructor(readonly carriedObject: ICarryable) {}
}
