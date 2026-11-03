export class TuningSettingsPatchDto {
  constructor(
    readonly unladenMovementSpeed?: number,
    readonly carryingMovementSpeed?: number,
    readonly lampColor?: string,
  ) {}
}
