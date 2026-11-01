import type { Object3D, Scene } from 'three';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import type { CrateSpawnDto } from './CrateSpawnDto';

export interface IScene {
  readonly scene: Scene;
  readonly playerSpawn: PlayerSpawnDto;
  readonly movableCrates: readonly CrateSpawnDto[];
  load(onProgress: (percentage: number) => void): Promise<Object3D | undefined>;
  update(delta: number): void;
  dispose(): void;
}
