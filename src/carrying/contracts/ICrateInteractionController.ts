import type { ICarryable } from './ICarryable';

export interface ICrateInteractionController {
  readonly pickupCandidate: ICarryable | undefined;
  readonly canPutDown: boolean;
  update(isInteractionPressed: boolean): void;
}
