import type { Object3D, PerspectiveCamera } from 'three';
import type { ICameraController } from '../../camera/contracts/ICameraController';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { ICrateInteractionController } from '../../carrying/contracts/ICrateInteractionController';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import type { ControlMode } from '../../input/contracts/ControlMode';
import type { IPlayerInput } from '../../input/contracts/IPlayerInput';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';

export interface IGameplayFactory {
  createCarryable(model: Object3D): ICarryable;
  createCollisionWorld(model: Object3D, boxes: readonly OrientedBoxDto[]): ICollisionWorld;
  createPlayer(world: ICollisionWorld, spawn: PlayerSpawnDto, onProgress: (percentage: number) => void): Promise<IPlayer>;
  createInteractionController(
    player: IPlayer, crates: readonly ICarryable[], world: ICollisionWorld,
  ): ICrateInteractionController;
  createCameraController(camera: PerspectiveCamera, world: ICollisionWorld, initialYaw: number): ICameraController;
  createInput(controlMode: ControlMode): IPlayerInput;
}
