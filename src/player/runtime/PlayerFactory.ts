import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { ICarryPlacementSolver } from '../../carrying/contracts/ICarryPlacementSolver';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IObject3DResourceDisposer } from '../../disposer/contracts/IObject3DResourceDisposer';
import type { IPlayer } from '../contracts/IPlayer';
import type { PlayerSpawnDto } from '../contracts/PlayerSpawnDto';
import { Player } from './Player';
import { PlayerVisual } from './PlayerVisual';
import type { ITuningSettings } from '../../tuning/contracts/ITuningSettings';
import { tuningDefaults } from '../../tuning/contracts/tuningDefaults';

export class PlayerFactory {
  constructor(
    private readonly objectDisposer: IObject3DResourceDisposer,
    private readonly baseUrl: string,
    private readonly settings: ITuningSettings = tuningDefaults,
  ) {}

  async create(
    world: ICollisionWorld, spawn: PlayerSpawnDto, carryPlacement: ICarryPlacementSolver,
    onProgress: (percentage: number | undefined) => void, signal: AbortSignal,
  ): Promise<IPlayer> {
    signal.throwIfAborted();
    const model = await new GLTFLoader().loadAsync(`${this.baseUrl}models/player/player.glb`, (event) => {
      if (!signal.aborted) onProgress(event.lengthComputable ? event.loaded / event.total * 100 : undefined);
    });
    let visual: PlayerVisual | undefined;
    try {
      signal.throwIfAborted();
      visual = new PlayerVisual(model.scene, model.animations, this.objectDisposer);
      const player = new Player(world, spawn, carryPlacement, visual, this.settings);
      onProgress(100);
      return player;
    } catch (error) {
      if (visual) visual.dispose();
      else this.objectDisposer.dispose(model.scene);
      throw error;
    }
  }
}
