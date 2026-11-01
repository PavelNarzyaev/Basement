import type { Scene } from 'three';
import type { SceneLoadResultDto } from './SceneLoadResultDto';

export interface IGameScene {
  readonly scene: Scene;
  // Rejects with AbortError when disposed before loading completes.
  load(onProgress: (percentage: number) => void): Promise<SceneLoadResultDto>;
  update(deltaSeconds: number): void;
  dispose(): void;
}
