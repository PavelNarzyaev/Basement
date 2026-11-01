import type { PerspectiveCamera } from 'three';

export interface IBombardment {
  load(): Promise<void>;
  start(): void;
  update(camera: PerspectiveCamera): void;
  dispose(): void;
}
