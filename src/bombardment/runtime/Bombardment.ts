import { Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { IBombardment } from '../contracts/IBombardment';
import type { IDustEffect } from '../../dust/contracts/IDustEffect';
import type { ICeilingDebris } from '../../ceiling_debris/contracts/ICeilingDebris';

export class Bombardment implements IBombardment {
  private readonly audioContext = new AudioContext();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly sources = new Set<AudioBufferSourceNode>();
  private readonly impactSources = new Set<AudioBufferSourceNode>();
  private readonly visibilityController = new AbortController();
  private readonly loadingController = new AbortController();
  private isDisposed = false;
  private startTime: number | undefined;
  private nextImpactTime = 0;
  private lastImpact = 0;
  private readonly cameraDirection = new Vector3();

  constructor(
    private readonly dust: IDustEffect,
    private readonly ceilingDebris: ICeilingDebris,
    private readonly baseUrl: string,
  ) {
    document.addEventListener('visibilitychange', this.handleVisibilityChange, {
      signal: this.visibilityController.signal,
    });
  }

  async load(): Promise<void> {
    const signal = this.loadingController.signal;
    signal.throwIfAborted();
    const buffers = new Map<string, AudioBuffer>();
    try {
      await Promise.all(['background', 'bomb-whistle', 'bomb-explosion', 'siren'].map(async (name) => {
        const response = await fetch(`${this.baseUrl}sounds/${name}.mp3`, { signal });
        if (!response.ok) throw new Error(`Could not load sound ${name}: ${response.status}`);
        const data = await response.arrayBuffer();
        signal.throwIfAborted();
        const buffer = await this.audioContext.decodeAudioData(data);
        signal.throwIfAborted();
        buffers.set(name, buffer);
      }));
      if (buffers.get('bomb-whistle')!.duration > 15) {
        throw new Error('Bomb whistle must fit within the 15-second bombardment interval.');
      }
      for (const [name, buffer] of buffers) this.buffers.set(name, buffer);
    } catch (error) {
      buffers.clear();
      this.dispose();
      throw error;
    }
  }

  start(): void {
    this.lastImpact = 0;
    this.dust.setImpactStrength(0);
    this.ceilingDebris.reset();
    for (const source of this.sources) source.stop();
    this.sources.clear();
    this.impactSources.clear();
    // Resume inside the start/restart gesture to unlock audio on mobile browsers.
    void this.audioContext.resume().catch((error: unknown) => console.error('Could not start audio:', error));
    this.startTime = this.audioContext.currentTime;
    this.nextImpactTime = this.startTime + 15;
    this.play('background', this.startTime, true);
    this.play('siren', this.startTime + 50, true);
    if (!document.hidden) this.scheduleImpact();
  }

  update(camera: PerspectiveCamera, playerPosition: Vector3): void {
    if (this.startTime === undefined || document.hidden) return;
    const time = this.audioContext.currentTime;
    const whistleDuration = this.buffers.get('bomb-whistle')!.duration;
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
    this.loadingController.abort();
    this.visibilityController.abort();
    for (const source of this.sources) source.stop();
    this.sources.clear();
    this.impactSources.clear();
    this.buffers.clear();
    this.startTime = undefined;
    void this.audioContext.close();
  }

  private readonly handleVisibilityChange = (): void => {
    if (this.startTime === undefined) return;
    for (const source of this.impactSources) {
      source.stop();
      this.sources.delete(source);
    }
    this.impactSources.clear();
    this.dust.setImpactStrength(0);
    this.ceilingDebris.reset();
    if (document.hidden) return;
    this.startTime = this.audioContext.currentTime;
    this.nextImpactTime = this.startTime + 15;
    this.lastImpact = 0;
    this.scheduleImpact();
  };

  private scheduleImpact(): void {
    this.impactSources.add(this.play('bomb-whistle', this.nextImpactTime - this.buffers.get('bomb-whistle')!.duration));
    this.impactSources.add(this.play('bomb-explosion', this.nextImpactTime + 0.2));
    this.nextImpactTime += 15;
  }

  private play(name: string, time: number, isLooping = false): AudioBufferSourceNode {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffers.get(name)!;
    source.loop = isLooping;
    const gain = this.audioContext.createGain();
    gain.gain.value = name === 'siren' ? 0.3 : 1;
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.onended = () => {
      this.sources.delete(source);
      this.impactSources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    this.sources.add(source);
    source.start(time);
    return source;
  }
}
