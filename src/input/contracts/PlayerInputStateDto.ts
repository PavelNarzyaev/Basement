export class PlayerInputStateDto {
  constructor(
    readonly movementX: number,
    readonly movementZ: number,
    readonly lookX: number,
    readonly lookY: number,
  ) {}
}
