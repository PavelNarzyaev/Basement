import type { IBombardmentAudio } from '../contracts/IBombardmentAudio';
import type { IBombardmentClock } from '../contracts/IBombardmentClock';

export class BombardmentAudio implements IBombardmentAudio, IBombardmentClock {
  private readonly audioContext = new AudioContext();
  private readonly buffers = new Map<string, AudioBuffer>();
  private readonly sources = new Set<AudioBufferSourceNode>();
  private readonly impactSources = new Set<AudioBufferSourceNode>();
  private readonly loadingController = new AbortController();
  private isDisposed = false;

  constructor(private readonly baseUrl: string) {}

  get currentTime(): number { return this.audioContext.currentTime; }

  get whistleDuration(): number { return this.buffers.get('bomb-whistle')!.duration; }

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

  start(time: number): void {
    this.stopSources();
    // Resume inside the user gesture to unlock audio on mobile browsers.
    void this.audioContext.resume().catch((error: unknown) => console.error('Could not start audio:', error));
    this.play('background', time, true);
    this.play('siren', time + 50, true);
  }

  scheduleImpact(time: number): void {
    this.impactSources.add(this.play('bomb-whistle', time - this.whistleDuration));
    this.impactSources.add(this.play('bomb-explosion', time + 0.2));
  }

  stopImpacts(): void {
    for (const source of this.impactSources) {
      source.stop();
      this.sources.delete(source);
    }
    this.impactSources.clear();
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.loadingController.abort();
    this.stopSources();
    this.buffers.clear();
    void this.audioContext.close();
  }

  private stopSources(): void {
    for (const source of this.sources) source.stop();
    this.sources.clear();
    this.impactSources.clear();
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
