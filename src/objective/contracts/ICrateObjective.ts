import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';

export interface ICrateObjective {
  start(crates: readonly ICarryable[], zone: YawBoxDto, onRestart: () => void): void;
  update(carriedCrate: ICarryable | undefined): void;
  dispose(): void;
}
