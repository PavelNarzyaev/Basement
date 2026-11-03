export interface IThirdPersonCameraSettings {
  readonly collisionRadius: number;
  readonly initialPitchRadians: number;
  readonly minimumPitchRadians: number;
  readonly maximumPitchRadians: number;
  readonly targetHeightOffset: number;
  readonly followDistance: number;
  readonly wallClearance: number;
  readonly collisionSampleStep: number;
  readonly minimumTargetDistance: number;
}
