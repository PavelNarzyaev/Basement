import type { ICarryable } from './ICarryable';

export interface ICrateInteractionController {
  readonly candidate: ICarryable | undefined;
  readonly canPutDown: boolean;
  update(isInteractionPressed: boolean): void;
}
