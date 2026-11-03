import type { TuningSettingsDto } from './TuningSettingsDto.ts';

export class TuningSessionDto {
  constructor(
    readonly current: TuningSettingsDto,
    readonly saved: TuningSettingsDto,
    readonly hasUnsavedChanges: boolean,
  ) {}
}
