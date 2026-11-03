import type { IBombardmentSettings } from './IBombardmentSettings';

export const bombardmentSettings: IBombardmentSettings = {
  intervalSeconds: 15,
  audioScheduleLookaheadSeconds: 1,
  dustImpactDurationSeconds: 5,
  cameraShakeDurationSeconds: 1.4,
  cameraShakeAmplitudeRadians: 0.035,
  pitchShakeFrequency: 83,
  yawShakeFrequency: 107,
  rollShakeFrequency: 71,
  yawShakeScale: 0.6,
  rollShakeScale: 0.5,
  sirenDelaySeconds: 50,
  explosionDelaySeconds: 0.2,
  sirenGain: 0.3,
};
