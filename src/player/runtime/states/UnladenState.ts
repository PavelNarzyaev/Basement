import { playerMovementSpeeds } from '../../contracts/playerSettings';
import type { IPlayerState } from '../../contracts/IPlayerState';

export class UnladenState implements IPlayerState {
  readonly movementSpeed = playerMovementSpeeds.unladen;
  readonly carriedObject = undefined;
}
