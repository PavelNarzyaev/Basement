import type { IBombardment } from '../../bombardment/contracts/IBombardment';
import { PerspectiveCamera, Vector3 } from 'three';
import type { ICrateInteractionController } from '../../carrying/contracts/ICrateInteractionController';
import type { ICameraController } from '../../camera/contracts/ICameraController';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayerInput } from '../../input/contracts/IPlayerInput';
import { ControlMode } from '../../input/contracts/ControlMode';
import type { IVirtualJoystick } from '../../input/contracts/IVirtualJoystick';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { Scene } from 'three';
import type { SceneLoadResultDto } from '../../scenes/contracts/SceneLoadResultDto';
import type { StartupSettingsDto } from '../../startup/contracts/StartupSettingsDto';
import type { IInteractionPrompt } from '../../interaction_prompt/contracts/IInteractionPrompt';
import type { IGameplayFactory } from '../contracts/IGameplayFactory';
import type { ICrateObjective } from '../../objective/contracts/ICrateObjective';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { IGameplaySession } from '../contracts/IGameplaySession';

export class GameplaySession implements IGameplaySession {
  private input: IPlayerInput | undefined;
  private cameraController: ICameraController;

  private readonly interactionController: ICrateInteractionController;

  private readonly worldMovementDirection = new Vector3();
  private readonly worldUp = new Vector3(0, 1, 0);

  private shouldResetDelta = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scene: Scene,
    private readonly camera: PerspectiveCamera,
    private readonly joystick: IVirtualJoystick,
    private readonly interactionPrompt: IInteractionPrompt,
    private readonly gameplayFactory: IGameplayFactory,
    private readonly objective: ICrateObjective,
    private readonly bombardment: IBombardment,
    private readonly player: IPlayer,
    private readonly collisionWorld: ICollisionWorld,
    private readonly crates: readonly ICarryable[],
    private readonly sceneResult: SceneLoadResultDto,
  ) {
    this.interactionController = this.gameplayFactory.createInteractionController(this.player, this.crates, this.collisionWorld);
    // The orbit angle points from the target to the camera, opposite the player's facing direction.
    const cameraYaw = this.sceneResult.playerSpawn.rotationY - Math.PI;
    this.cameraController = this.gameplayFactory.createCameraController(this.camera, this.collisionWorld, cameraYaw);
    this.cameraController.update(this.player.object.position, cameraYaw);
    this.scene.add(this.player.object);
  }

  start(settings: StartupSettingsDto): void {
    if (settings.controlMode === ControlMode.Touch) {
      this.joystick.show();
      this.interactionPrompt.enableTouch();
    }
    this.bombardment.start();
    this.shouldResetDelta = true;
    this.input = this.gameplayFactory.createInput(settings.controlMode);
    this.objective.start(this.crates, this.sceneResult.trolleyCargoZone, this.restart);
  }

  readonly restart = (): void => {
    this.bombardment.start();
    this.player.restart();
    this.crates.forEach((crate, index) => {
      const spawn = this.sceneResult.movableCrates[index]!;
      crate.setPose(spawn.center, spawn.rotationY);
    });
    const cameraYaw = this.sceneResult.playerSpawn.rotationY - Math.PI;
    this.cameraController = this.gameplayFactory.createCameraController(this.camera, this.collisionWorld, cameraYaw);
    this.cameraController.update(this.player.object.position, cameraYaw);
    this.interactionController.update(false);
    this.objective.update(undefined);
    this.shouldResetDelta = true;
    this.canvas.focus();
  };

  update(deltaSeconds: number): void {
    if (!this.input) return;
    if (this.shouldResetDelta) {
      deltaSeconds = 0;
      this.shouldResetDelta = false;
    }
    const input = this.input.read();
    this.cameraController.addPitchDelta(input.pitchDeltaRadians);
    this.worldMovementDirection.set(input.movementX, 0, input.movementZ).applyAxisAngle(this.worldUp, this.cameraController.yaw);
    this.player.update(deltaSeconds, this.worldMovementDirection, input.yawDeltaRadians);
    this.interactionController.update(input.isInteractionPressed);
    this.objective.update(this.player.carriedObject);
    this.cameraController.update(
      this.player.object.position, this.player.object.rotation.y - Math.PI, this.player.carriedObject?.collider,
    );
    this.bombardment.update(this.camera, this.player.object.position);
    this.interactionPrompt.update(
      this.interactionController.pickupCandidate, this.interactionController.canPutDown, this.camera
    );
  }

  dispose(): void {
    this.input?.dispose();
    this.player.dispose();
    this.collisionWorld.dispose();
  }
}
