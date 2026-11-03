import type { ICarryable } from '../../../carrying/contracts/ICarryable';
import type { ITuningSettings } from '../../../tuning/contracts/ITuningSettings';
import { tuningDefaults } from '../../../tuning/contracts/tuningDefaults';
import type { IPlayerState } from '../../contracts/IPlayerState';

export class CarryingState implements IPlayerState {
  get movementSpeed(): number { return this.settings.carryingMovementSpeed; }

  constructor(readonly carriedObject: ICarryable, private readonly settings: ITuningSettings = tuningDefaults) {}
}
