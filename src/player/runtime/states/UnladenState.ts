import type { ITuningSettings } from '../../../tuning/contracts/ITuningSettings';
import { tuningDefaults } from '../../../tuning/contracts/tuningDefaults';
import type { IPlayerState } from '../../contracts/IPlayerState';

export class UnladenState implements IPlayerState {
  constructor(private readonly settings: ITuningSettings = tuningDefaults) {}

  get movementSpeed(): number { return this.settings.unladenMovementSpeed; }
  readonly carriedObject = undefined;
}
