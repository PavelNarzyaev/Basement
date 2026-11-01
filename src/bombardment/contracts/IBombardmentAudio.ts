export interface IBombardmentAudio {
  readonly whistleDuration: number;
  load(): Promise<void>;
  start(time: number): void;
  scheduleImpact(time: number): void;
  stopImpacts(): void;
  dispose(): void;
}
