import type { PlayerInputStateDto } from './PlayerInputStateDto';

export interface IPlayerInput {
  /** Reads the current state and consumes accumulated look movement. */
  read(): PlayerInputStateDto;
  dispose(): void;
}
