import type { ITuningSettings } from './ITuningSettings.ts';
import type { TuningSettingsDto } from './TuningSettingsDto.ts';

export interface IEditableTuningSettings extends ITuningSettings {
  applySettings(settings: TuningSettingsDto): void;
}
