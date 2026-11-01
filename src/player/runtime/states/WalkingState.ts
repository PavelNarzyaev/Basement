import type { IPlayerState } from '../../contracts/IPlayerState';

export class WalkingState implements IPlayerState {
  readonly speed = 4;
  readonly carriedObject = undefined;
}
