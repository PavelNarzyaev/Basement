import { Vector3 } from 'three';
import { bombardmentIntervalSeconds } from '../contracts/bombardmentTiming';
import type { PerspectiveCamera } from 'three';
import type { IBombardmentAudio } from '../contracts/IBombardmentAudio';
import type { IBombardmentClock } from '../contracts/IBombardmentClock';
import type { IBombardment } from '../contracts/IBombardment';
import type { IDustEffect } from '../../dust/contracts/IDustEffect';
import type { ICeilingDebris } from '../../ceiling_debris/contracts/ICeilingDebris';

export class Bombardment implements IBombardment {
  private static readonly audioScheduleLookaheadSeconds = 1;
  private static readonly dustImpactDurationSeconds = 5;
  private static readonly cameraShakeDurationSeconds = 1.4;
  private static readonly cameraShakeAmplitudeRadians = 0.035;
  private static readonly pitchShakeFrequency = 83;
  private static readonly yawShakeFrequency = 107;
  private static readonly rollShakeFrequency = 71;
  private static readonly yawShakeScale = 0.6;
  private static readonly rollShakeScale = 0.5;
  private readonly visibilityController = new AbortController();
  private isDisposed = false;
  private startTime: number | undefined;
  private nextImpactTime = 0;
  private lastImpact = 0;
  private readonly cameraDirection = new Vector3();

  constructor(
    private readonly dust: IDustEffect,
    private readonly ceilingDebris: ICeilingDebris,
    private readonly audio: IBombardmentAudio,
    private readonly clock: IBombardmentClock,
  ) {
    document.addEventListener('visibilitychange', this.handleVisibilityChange, {
      signal: this.visibilityController.signal,
    });
  }

  async load(): Promise<void> {
    try {
      await this.audio.load();
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  start(): void {
    this.lastImpact = 0;
    this.dust.setImpactStrength(0);
    this.ceilingDebris.reset();
    this.startTime = this.clock.currentTime;
    this.audio.start(this.startTime);
    this.nextImpactTime = this.startTime + bombardmentIntervalSeconds;
    if (!document.hidden) this.scheduleImpact();
  }

  update(camera: PerspectiveCamera, playerPosition: Vector3): void {
    if (this.startTime === undefined || document.hidden) return;
    const time = this.clock.currentTime;
    const whistleDuration = this.audio.whistleDuration;
    const nextWhistleTime = this.nextImpactTime - whistleDuration;
    // Skip whole impacts whose whistle can no longer start on time.
    if (nextWhistleTime < time) {
      this.nextImpactTime += Math.ceil((time - nextWhistleTime) / bombardmentIntervalSeconds) * bombardmentIntervalSeconds;
    }
    if (this.nextImpactTime - whistleDuration <= time + Bombardment.audioScheduleLookaheadSeconds) this.scheduleImpact();
    const elapsed = time - this.startTime;
    const impact = Math.floor(elapsed / bombardmentIntervalSeconds);
    const impactAge = elapsed % bombardmentIntervalSeconds;
    this.dust.setImpactStrength(impact > 0 ? Math.pow(Math.max(0, 1 - impactAge / Bombardment.dustImpactDurationSeconds), 2) : 0);
    if (impact > this.lastImpact) {
      this.lastImpact = impact;
      // Do not replay an old burst when returning from a background tab.
      if (impactAge < Bombardment.cameraShakeDurationSeconds) {
        camera.getWorldDirection(this.cameraDirection);
        this.ceilingDebris.burst(playerPosition, this.cameraDirection);
      }
    }
    if (elapsed < bombardmentIntervalSeconds) return;
    if (impactAge >= Bombardment.cameraShakeDurationSeconds) return;
    const strength = Bombardment.cameraShakeAmplitudeRadians * Math.pow(1 - impactAge / Bombardment.cameraShakeDurationSeconds, 2);
    // Apply after the orbit controller resets the pose, so shake never accumulates.
    camera.rotateX(Math.sin(impactAge * Bombardment.pitchShakeFrequency) * strength);
    camera.rotateY(Math.sin(impactAge * Bombardment.yawShakeFrequency) * strength * Bombardment.yawShakeScale);
    camera.rotateZ(Math.cos(impactAge * Bombardment.rollShakeFrequency) * strength * Bombardment.rollShakeScale);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.visibilityController.abort();
    this.audio.dispose();
    this.startTime = undefined;
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.startTime === undefined) return;
    this.audio.stopImpacts();
    this.dust.setImpactStrength(0);
    this.ceilingDebris.reset();
    if (document.hidden) return;
    this.startTime = this.clock.currentTime;
    this.nextImpactTime = this.startTime + bombardmentIntervalSeconds;
    this.lastImpact = 0;
    this.scheduleImpact();
  };

  private scheduleImpact(): void {
    this.audio.scheduleImpact(this.nextImpactTime);
    this.nextImpactTime += bombardmentIntervalSeconds;
  }
}
