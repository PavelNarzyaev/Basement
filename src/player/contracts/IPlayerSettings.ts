export interface IPlayerSettings {
  readonly colliderHeight: number;
  readonly colliderRadius: number;
  readonly unladenMovementSpeed: number;
  readonly carryingMovementSpeed: number;
  readonly maximumFrameDeltaSeconds: number;
  readonly carryingTurnSpeedRadians: number;
  readonly fallResetDepth: number;
  readonly gravity: number;
  readonly maximumCollisionIterations: number;
  readonly contactSeparation: number;
  readonly fixedStep: number;
  readonly minimumMovementSpeed: number;
  readonly animationBlendRate: number;
}
