import type { Object3D, Scene } from 'three';

export interface IScene {
  readonly scene: Scene;
  load(): Promise<Object3D | undefined>;
  dispose(): void;
}
