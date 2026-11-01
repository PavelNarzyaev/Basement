import type { PerspectiveCamera, Vector3 } from 'three';

export interface IBombardment {
  load(): Promise<void>;
  start(): void;
  update(camera: PerspectiveCamera, playerPosition: Vector3): void;
  dispose(): void;
}
