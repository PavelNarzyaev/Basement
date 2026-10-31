import type { Object3D, Scene } from 'three';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';

export interface IScene {
  readonly scene: Scene;
  readonly playerSpawn: PlayerSpawnDto;
  readonly movableCrates: readonly Object3D[];
  load(onProgress: (percentage: number) => void): Promise<Object3D | undefined>;
  dispose(): void;
}
