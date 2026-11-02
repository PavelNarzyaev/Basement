import type { IPlayerState } from '../../contracts/IPlayerState';

export class UnladenState implements IPlayerState {
  readonly movementSpeed = 4;
  readonly carriedObject = undefined;
}
