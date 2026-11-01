import type { PerspectiveCamera } from 'three';
import type { IBombardment } from '../contracts/IBombardment';

export class Bombardment implements IBombardment {
  private readonly audioContext = new AudioContext();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly sources = new Set<AudioBufferSourceNode>();
  private startTime: number | undefined;
  private nextImpactTime = 0;

  async load(): Promise<void> {
    await Promise.all(['background', 'bomb-whistle', 'bomb-explosion', 'siren'].map(async (name) => {
      const response = await fetch(`${import.meta.env.BASE_URL}sounds/${name}.mp3`);
      if (!response.ok) throw new Error(`Could not load sound ${name}: ${response.status}`);
      const buffer = await this.audioContext.decodeAudioData(await response.arrayBuffer());
      this.buffers.set(name, buffer);
    }));
    if (this.buffers.get('bomb-whistle')!.duration > 15) {
      throw new Error('Bomb whistle must fit within the 15-second bombardment interval.');
    }
  }

  start(): void {
    for (const source of this.sources) source.stop();
    this.sources.clear();
    // Resume inside the start/restart gesture to unlock audio on mobile browsers.
    void this.audioContext.resume().catch((error: unknown) => console.error('Could not start audio:', error));
    this.startTime = this.audioContext.currentTime;
    this.nextImpactTime = this.startTime + 15;
    this.play('background', this.startTime, true);
    this.play('siren', this.startTime + 50, true);
    this.scheduleImpact();
  }

  update(camera: PerspectiveCamera): void {
    if (this.startTime === undefined) return;
    const time = this.audioContext.currentTime;
    while (this.nextImpactTime - this.buffers.get('bomb-whistle')!.duration <= time + 1) {
      this.scheduleImpact();
    }
    const elapsed = time - this.startTime;
    if (elapsed < 15) return;
    const impactAge = elapsed % 15;
    if (impactAge >= 1.4) return;
    const strength = 0.035 * Math.pow(1 - impactAge / 1.4, 2);
    // Apply after the orbit controller resets the pose, so shake never accumulates.
    camera.rotateX(Math.sin(impactAge * 83) * strength);
    camera.rotateY(Math.sin(impactAge * 107) * strength * 0.6);
    camera.rotateZ(Math.cos(impactAge * 71) * strength * 0.5);
  }

  dispose(): void {
    for (const source of this.sources) source.stop();
    this.sources.clear();
    void this.audioContext.close();
  }

  private scheduleImpact(): void {
    this.play('bomb-whistle', this.nextImpactTime - this.buffers.get('bomb-whistle')!.duration);
    this.play('bomb-explosion', this.nextImpactTime + 0.2);
    this.nextImpactTime += 15;
  }

  private play(name: string, time: number, isLooping = false): void {
    const source = this.audioContext.createBufferSource();
    source.buffer = this.buffers.get(name)!;
    source.loop = isLooping;
    const gain = this.audioContext.createGain();
    gain.gain.value = name === 'siren' ? 0.3 : 1;
    source.connect(gain);
    gain.connect(this.audioContext.destination);
    source.onended = () => {
      this.sources.delete(source);
      source.disconnect();
      gain.disconnect();
    };
    this.sources.add(source);
    source.start(time);
  }
}
