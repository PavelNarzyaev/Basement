import type { WebGLRenderer } from 'three';
import type { StartupSettingsDto } from './StartupSettingsDto';

export interface IStartupSettingsDialog {
  open(onStart: (settings: StartupSettingsDto) => void): void;
  resize(width: number, height: number): void;
  render(renderer: WebGLRenderer): void;
  dispose(): void;
}
