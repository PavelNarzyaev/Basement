export interface IBombardmentSettings {
  readonly intervalSeconds: number;
  readonly audioScheduleLookaheadSeconds: number;
  readonly dustImpactDurationSeconds: number;
  readonly cameraShakeDurationSeconds: number;
  readonly cameraShakeAmplitudeRadians: number;
  readonly pitchShakeFrequency: number;
  readonly yawShakeFrequency: number;
  readonly rollShakeFrequency: number;
  readonly yawShakeScale: number;
  readonly rollShakeScale: number;
  readonly sirenDelaySeconds: number;
  readonly explosionDelaySeconds: number;
  readonly sirenGain: number;
}
