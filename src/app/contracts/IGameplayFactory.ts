import type { SceneLoadResultDto } from '../../scenes/contracts/SceneLoadResultDto';
import type { IGameplaySession } from './IGameplaySession';
import type { Object3D, PerspectiveCamera } from 'three';
import type { ICameraController } from '../../camera/contracts/ICameraController';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { ICrateInteractionController } from '../../carrying/contracts/ICrateInteractionController';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import type { ControlMode } from '../../input/contracts/ControlMode';
import type { IPlayerInput } from '../../input/contracts/IPlayerInput';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';

export interface IGameplayFactory {
  createSession(player: IPlayer, world: ICollisionWorld, crates: readonly ICarryable[], camera: PerspectiveCamera, sceneResult: SceneLoadResultDto): IGameplaySession;
  createCarryable(model: Object3D): ICarryable;
  createCollisionWorld(model: Object3D, boxes: readonly YawBoxDto[]): ICollisionWorld;
  createPlayer(
    world: ICollisionWorld, spawn: PlayerSpawnDto,
    onProgress: (percentage: number | undefined) => void, signal: AbortSignal,
  ): Promise<IPlayer>;
  createInteractionController(
    player: IPlayer, crates: readonly ICarryable[], world: ICollisionWorld,
  ): ICrateInteractionController;
  createCameraController(camera: PerspectiveCamera, world: ICollisionWorld, initialYaw: number): ICameraController;
  createInput(controlMode: ControlMode): IPlayerInput;
}
