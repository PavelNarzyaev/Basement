import type { IThirdPersonCameraSettings } from './IThirdPersonCameraSettings';

export const thirdPersonCameraSettings: IThirdPersonCameraSettings = {
  collisionRadius: 0.18,
  initialPitchRadians: 0.25,
  minimumPitchRadians: -0.35,
  maximumPitchRadians: 1.15,
  targetHeightOffset: 0.35,
  followDistance: 3,
  wallClearance: 0.2,
  collisionSampleStep: 0.05,
  minimumTargetDistance: 0.01,
};
