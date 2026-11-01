/** Movement uses local X/Z components in [-1, 1], clamped to unit length by the player. Positive yaw turns about +Y; positive pitch raises the camera. */
export class PlayerInputStateDto {
  constructor(
    readonly movementX: number,
    readonly movementZ: number,
    readonly yawDeltaRadians: number,
    readonly pitchDeltaRadians: number,
    readonly isInteractionPressed = false,
  ) {}
}
