import type { ICarryable } from '../../../carrying/contracts/ICarryable';
import { playerMovementSpeeds } from '../../contracts/playerSettings';
import type { IPlayerState } from '../../contracts/IPlayerState';

export class CarryingState implements IPlayerState {
  readonly movementSpeed = playerMovementSpeeds.carrying;

  constructor(readonly carriedObject: ICarryable) {}
}
