import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ICarryPlacement } from '../../carrying/contracts/ICarryPlacement';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IObject3DDisposer } from '../../disposer/contracts/IObject3DDisposer';
import type { IPlayer } from '../contracts/IPlayer';
import type { PlayerSpawnDto } from '../contracts/PlayerSpawnDto';
import { Player } from './Player';
import { PlayerVisual } from './PlayerVisual';

export class PlayerFactory {
  constructor(
    private readonly objectDisposer: IObject3DDisposer,
    private readonly baseUrl: string,
  ) {}

  async create(
    world: ICollisionWorld, spawn: PlayerSpawnDto, carryPlacement: ICarryPlacement,
    onProgress: (percentage: number) => void, signal: AbortSignal,
  ): Promise<IPlayer> {
    signal.throwIfAborted();
    const model = await new GLTFLoader().loadAsync(`${this.baseUrl}models/player/player.glb`, (event) => {
      if (!signal.aborted && event.lengthComputable) onProgress(event.loaded / event.total * 100);
    });
    let visual: PlayerVisual | undefined;
    try {
      signal.throwIfAborted();
      visual = new PlayerVisual(model.scene, model.animations, this.objectDisposer);
      return new Player(world, spawn, carryPlacement, visual);
    } catch (error) {
      if (visual) visual.dispose();
      else this.objectDisposer.dispose(model.scene);
      throw error;
    }
  }
}
