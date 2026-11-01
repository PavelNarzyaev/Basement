export class DustSettingsDto {
  constructor(
    /** Fraction of the particle reserve in use, from 0 to 1. */
    public readonly density = 0.22,
    public readonly opacity = 0.3,
    /** Horizontal drift in world units per second. */
    public readonly driftSpeed = 0.035,
    /** Amplitude of the swirling motion in world units. */
    public readonly turbulence = 0.12,
  ) {}
}
