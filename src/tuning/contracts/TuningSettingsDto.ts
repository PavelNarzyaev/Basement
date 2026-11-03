export class TuningSettingsDto {
  constructor(
    readonly unladenMovementSpeed: number,
    readonly carryingMovementSpeed: number,
    readonly lampColor: string,
  ) {}
}
