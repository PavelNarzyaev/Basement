import type { WebGLRenderer } from 'three';
import type { IJoystickView } from './IJoystickView';

export interface IVirtualJoystick extends IJoystickView {
  show(): void;
  resize(width: number, height: number): void;
  render(renderer: WebGLRenderer): void;
  dispose(): void;
}
