import type { Vector2 } from 'three';

export interface IJoystickView {
  getJoystickDisplacement(clientX: number, clientY: number): Vector2;
  setJoystickPosition(x: number, y: number): void;
}
