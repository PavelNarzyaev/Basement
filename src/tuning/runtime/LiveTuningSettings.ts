import type { IEditableTuningSettings } from '../contracts/IEditableTuningSettings.ts';
import type { ITuningSettings } from '../contracts/ITuningSettings.ts';
import { TuningSettingsDto } from '../contracts/TuningSettingsDto.ts';
import { TuningSettingsValidator } from './TuningSettingsValidator.ts';

export class LiveTuningSettings implements IEditableTuningSettings {
  private settings: TuningSettingsDto;
  private readonly validator = new TuningSettingsValidator();

  constructor(settings: ITuningSettings) {
    this.settings = this.validator.parseSettings(settings);
  }

  get unladenMovementSpeed(): number { return this.settings.unladenMovementSpeed; }
  get carryingMovementSpeed(): number { return this.settings.carryingMovementSpeed; }
  get lampColor(): string { return this.settings.lampColor; }

  applySettings(settings: TuningSettingsDto): void {
    this.settings = this.validator.parseSettings(settings);
  }

  createSnapshot(): TuningSettingsDto {
    return new TuningSettingsDto(this.unladenMovementSpeed, this.carryingMovementSpeed, this.lampColor);
  }
}
