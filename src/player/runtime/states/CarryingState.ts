import type { ICarryable } from '../../../carrying/contracts/ICarryable';
import { playerSettings } from '../../contracts/playerSettings';
import type { IPlayerState } from '../../contracts/IPlayerState';

export class CarryingState implements IPlayerState {
  readonly movementSpeed = playerSettings.carryingMovementSpeed;

  constructor(readonly carriedObject: ICarryable) {}
}
