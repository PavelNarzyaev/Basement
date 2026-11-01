import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { IBombardmentAudio } from '../contracts/IBombardmentAudio';
import type { IBombardmentClock } from '../contracts/IBombardmentClock';
import type { IBombardment } from '../contracts/IBombardment';
import type { IDustEffect } from '../../dust/contracts/IDustEffect';
import type { ICeilingDebris } from '../../ceiling_debris/contracts/ICeilingDebris';

export class Bombardment implements IBombardment {
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
    this.nextImpactTime = this.startTime + 15;
    if (!document.hidden) this.scheduleImpact();
  }

  update(camera: PerspectiveCamera, playerPosition: Vector3): void {
    if (this.startTime === undefined || document.hidden) return;
    const time = this.clock.currentTime;
    const whistleDuration = this.audio.whistleDuration;
    const nextWhistleTime = this.nextImpactTime - whistleDuration;
    // Skip whole impacts whose whistle can no longer start on time.
    if (nextWhistleTime < time) {
      this.nextImpactTime += Math.ceil((time - nextWhistleTime) / 15) * 15;
    }
    if (this.nextImpactTime - whistleDuration <= time + 1) this.scheduleImpact();
    const elapsed = time - this.startTime;
    const impact = Math.floor(elapsed / 15);
    const impactAge = elapsed % 15;
    this.dust.setImpactStrength(impact > 0 ? Math.pow(Math.max(0, 1 - impactAge / 5), 2) : 0);
    if (impact > this.lastImpact) {
      this.lastImpact = impact;
      // Do not replay an old burst when returning from a background tab.
      if (impactAge < 1.4) {
        camera.getWorldDirection(this.cameraDirection);
        this.ceilingDebris.burst(playerPosition, this.cameraDirection);
      }
    }
    if (elapsed < 15) return;
    if (impactAge >= 1.4) return;
    const strength = 0.035 * Math.pow(1 - impactAge / 1.4, 2);
    // Apply after the orbit controller resets the pose, so shake never accumulates.
    camera.rotateX(Math.sin(impactAge * 83) * strength);
    camera.rotateY(Math.sin(impactAge * 107) * strength * 0.6);
    camera.rotateZ(Math.cos(impactAge * 71) * strength * 0.5);
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
    this.nextImpactTime = this.startTime + 15;
    this.lastImpact = 0;
    this.scheduleImpact();
  };

  private scheduleImpact(): void {
    this.audio.scheduleImpact(this.nextImpactTime);
    this.nextImpactTime += 15;
  }
}
