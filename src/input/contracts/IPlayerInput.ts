import type { IPlayerInputState } from './IPlayerInputState';

export interface IPlayerInput {
  /** Reads the current state and consumes accumulated look movement. */
  read(): IPlayerInputState;
  dispose(): void;
}
