import type { Object3D, Scene } from 'three';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';

export interface IScene {
  readonly scene: Scene;
  readonly playerSpawn: PlayerSpawnDto;
  load(): Promise<Object3D | undefined>;
  dispose(): void;
}
