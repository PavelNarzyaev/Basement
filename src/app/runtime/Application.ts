import type { IBombardment } from '../../bombardment/contracts/IBombardment';
import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import type { ICrateInteractionController } from '../../carrying/contracts/ICrateInteractionController';
import type { ICameraController } from '../../camera/contracts/ICameraController';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayerInput } from '../../input/contracts/IPlayerInput';
import { ControlMode } from '../../input/contracts/ControlMode';
import type { IVirtualJoystick } from '../../input/contracts/IVirtualJoystick';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { IScene } from '../../scenes/contracts/IScene';
import type { StartupSettingsDto } from '../../startup/contracts/StartupSettingsDto';
import type { IStartupSettingsDialog } from '../../startup/contracts/IStartupSettingsDialog';
import type { IInteractionPrompt } from '../../interaction_prompt/contracts/IInteractionPrompt';
import type { IGameplayFactory } from '../contracts/IGameplayFactory';
import type { ICrateObjective } from '../../objective/contracts/ICrateObjective';
import type { ICarryable } from '../../carrying/contracts/ICarryable';

export class Application {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private player: IPlayer | undefined;
  private input: IPlayerInput | undefined;
  private cameraController: ICameraController | undefined;
  private collisionWorld: ICollisionWorld | undefined;
  private interactionController: ICrateInteractionController | undefined;
  private crates: readonly ICarryable[] = [];
  private readonly movement = new Vector3();
  private readonly worldUp = new Vector3(0, 1, 0);
  private previousTime: number | undefined;
  private readonly status = document.createElement('p');
  private isDisposed = false;
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scene: IScene,
    private readonly joystick: IVirtualJoystick,
    private readonly interactionPrompt: IInteractionPrompt,
    private readonly startupSettingsDialog: IStartupSettingsDialog,
    private readonly gameplayFactory: IGameplayFactory,
    private readonly objective: ICrateObjective,
    private readonly bombardment: IBombardment,
  ) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera.position.set(2.5, 1.8, 3.5);
    this.camera.lookAt(0, 0, 0);
    this.status.className = 'scene-status';
    this.status.setAttribute('role', 'status');
    this.updateLoadingProgress(0);
    document.body.append(this.status);
    void this.loadScene();

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
  }

  dispose(): void {
    this.isDisposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.disposeGameplay();
    this.startupSettingsDialog.dispose();
    this.joystick.dispose();
    this.interactionPrompt.dispose();
    this.objective.dispose();
    this.bombardment.dispose();
    this.status.remove();
    this.scene.dispose();
    this.renderer.dispose();
  }

  private async loadScene(): Promise<void> {
    try {
      const model = await this.scene.load((percentage) => this.updateLoadingProgress(percentage * 0.9));
      if (this.isDisposed) return;
      if (!model) throw new Error('Scene model was not loaded.');
      this.camera.near = 0.05;
      this.camera.far = 150;
      this.camera.updateProjectionMatrix();
      const crates = this.scene.movableCrates.map((spawn) => {
        const crate = this.gameplayFactory.createCarryable(spawn.model);
        crate.setPose(spawn.center, spawn.rotationY);
        return crate;
      });
      this.collisionWorld = this.gameplayFactory.createCollisionWorld(model, crates.map((crate) => crate.collider));
      const player = await this.gameplayFactory.createPlayer(
        this.collisionWorld, this.scene.playerSpawn,
        (percentage) => this.updateLoadingProgress(90 + percentage * 0.1),
      );
      if (this.isDisposed) {
        player.dispose();
        return;
      }
      this.player = player;
      this.crates = crates;
      this.interactionController = this.gameplayFactory.createInteractionController(this.player, crates, this.collisionWorld);
      // The orbit angle points from the target to the camera, opposite the player's facing direction.
      const cameraYaw = this.scene.playerSpawn.rotationY - Math.PI;
      this.cameraController = this.gameplayFactory.createCameraController(this.camera, this.collisionWorld, cameraYaw);
      this.cameraController.update(this.player.object.position, cameraYaw);
      this.scene.scene.add(this.player.object);
      await this.bombardment.load();
      if (this.isDisposed) return;
      this.status.hidden = true;
      this.startupSettingsDialog.open(this.startGameplay);
    } catch (error) {
      if (this.isDisposed) return;
      this.disposeGameplay();
      this.status.textContent = 'Не удалось запустить сцену. Подробности ошибки — в консоли браузера.';
      this.status.setAttribute('role', 'alert');
      console.error('Scene initialization failed:', error);
    }
  }

  private readonly updateLoadingProgress = (percentage: number): void => {
    this.status.textContent = `Загрузка: ${Math.floor(percentage)}%`;
  };

  private disposeGameplay(): void {
    this.input?.dispose();
    this.player?.dispose();
    this.collisionWorld?.dispose();
    this.input = undefined;
    this.player = undefined;
    this.cameraController = undefined;
    this.collisionWorld = undefined;
    this.interactionController = undefined;
  }

  private readonly startGameplay = (settings: StartupSettingsDto): void => {
    if (settings.shouldEnterFullscreen && !document.fullscreenElement) {
      // Request within the start gesture to preserve browser user activation.
      void document.documentElement.requestFullscreen().catch((error: unknown) => {
        console.error('Could not enter fullscreen:', error);
      });
    }
    if (settings.controlMode === ControlMode.Touch) {
      this.joystick.show();
      this.interactionPrompt.enableTouch();
    }
    this.bombardment.start();
    this.previousTime = undefined;
    this.input = this.gameplayFactory.createInput(settings.controlMode);
    this.objective.start(this.crates, this.scene.trolleyCargoZone, this.restartGameplay);
  };

  private readonly restartGameplay = (): void => {
    this.bombardment.start();
    this.player!.restart();
    this.crates.forEach((crate, index) => {
      const spawn = this.scene.movableCrates[index]!;
      crate.setPose(spawn.center, spawn.rotationY);
    });
    const cameraYaw = this.scene.playerSpawn.rotationY - Math.PI;
    this.cameraController = this.gameplayFactory.createCameraController(this.camera, this.collisionWorld!, cameraYaw);
    this.cameraController.update(this.player!.object.position, cameraYaw);
    this.interactionController!.update(false);
    this.objective.update(undefined);
    this.previousTime = undefined;
    this.canvas.focus();
  };

  private readonly resize = (): void => {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
    this.joystick.resize(width, height);
    this.interactionPrompt.resize(width, height);
    this.startupSettingsDialog.resize(width, height);
  };

  private readonly animate = (time: number): void => {
    const delta = this.previousTime === undefined ? 0 : (time - this.previousTime) / 1000;
    this.previousTime = time;
    if (this.input && this.player && this.cameraController && this.interactionController) {
      const input = this.input.read();
      this.cameraController.rotate(input.lookY);
      this.movement.set(input.movementX, 0, input.movementZ).applyAxisAngle(this.worldUp, this.cameraController.yaw);
      this.player.update(delta, this.movement, this.player.object.rotation.y - input.lookX);
      const isTouchInteractionPressed = this.interactionPrompt.readInteraction();
      this.interactionController.update(input.isInteractionPressed || isTouchInteractionPressed);
      this.objective.update(this.player.carriedObject);
      this.cameraController.update(
        this.player.object.position, this.player.object.rotation.y - Math.PI, this.player.carriedObject?.collider,
      );
      this.bombardment.update(this.camera);
      this.interactionPrompt.update(
        this.interactionController.candidate, this.interactionController.canPutDown, this.camera
      );
    }
    this.scene.update(delta);
    this.renderer.render(this.scene.scene, this.camera);
    this.joystick.render(this.renderer);
    this.interactionPrompt.render(this.renderer);
    this.startupSettingsDialog.render(this.renderer);
  };
}
