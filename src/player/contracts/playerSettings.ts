import type { IPlayerSettings } from './IPlayerSettings';

export const playerSettings: IPlayerSettings = {
  colliderHeight: 1.8,
  colliderRadius: 0.43,
  unladenMovementSpeed: 4,
  carryingMovementSpeed: 2.5,
  maximumFrameDeltaSeconds: 0.1,
  carryingTurnSpeedRadians: 6,
  fallResetDepth: 3,
  gravity: 20,
  maximumCollisionIterations: 6,
  contactSeparation: 0.00001,
  fixedStep: 1 / 120,
  minimumMovementSpeed: 0.02,
  animationBlendRate: 20,
};
