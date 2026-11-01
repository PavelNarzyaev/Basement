import type { Object3D } from 'three';
import type { DustSettingsDto } from './DustSettingsDto';
import type { DustVolumeDto } from './DustVolumeDto';

export interface IDustEffect {
  readonly object: Object3D;
  initialize(volume: DustVolumeDto): void;
  setSettings(settings: DustSettingsDto): void;
  update(delta: number): void;
  dispose(): void;
}
