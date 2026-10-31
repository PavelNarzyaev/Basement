import type { ICarryable } from './ICarryable';

export interface ICrateInteractionController {
  readonly candidate: ICarryable | undefined;
  readonly hasBlockedInteraction: boolean;
  update(delta: number, isInteractionPressed: boolean): void;
}
