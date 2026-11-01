import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';

export interface ICrateObjective {
  start(crates: readonly ICarryable[], zone: OrientedBoxDto, onRestart: () => void): void;
  update(carriedCrate: ICarryable | undefined): void;
  dispose(): void;
}
