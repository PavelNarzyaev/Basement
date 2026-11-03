import { playerSettings } from '../../contracts/playerSettings';
import type { IPlayerState } from '../../contracts/IPlayerState';

export class UnladenState implements IPlayerState {
  readonly movementSpeed = playerSettings.unladenMovementSpeed;
  readonly carriedObject = undefined;
}
