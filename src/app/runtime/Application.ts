import { PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import { CrateInteractionController } from '../../carrying/runtime/CrateInteractionController';
import { MovableCrate } from '../../carrying/runtime/MovableCrate';
import type { ICameraController } from '../../camera/contracts/ICameraController';
import { ThirdPersonCameraController } from '../../camera/runtime/ThirdPersonCameraController';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import { CollisionWorld } from '../../collision/runtime/CollisionWorld';
import type { IPlayerInput } from '../../input/contracts/IPlayerInput';
import { ControlMode } from '../../input/contracts/ControlMode';
import { DesktopInput } from '../../input/runtime/DesktopInput';
import { VirtualJoystick } from '../../input/runtime/VirtualJoystick';
import { TouchInput } from '../../input/runtime/TouchInput';
import type { IPlayer } from '../../player/contracts/IPlayer';
import { Player } from '../../player/runtime/Player';
import type { IScene } from '../../scenes/contracts/IScene';
import type { StartupSettingsDto } from '../../startup/contracts/StartupSettingsDto';
import { StartupSettingsDialog } from '../../startup/runtime/StartupSettingsDialog';
import { InteractionPrompt } from '../../ui/runtime/InteractionPrompt';

export class Application {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private player: IPlayer | undefined;
  private input: IPlayerInput | undefined;
  private cameraController: ICameraController | undefined;
  private collisionWorld: ICollisionWorld | undefined;
  private interactionController: CrateInteractionController | undefined;
  private readonly interactionPrompt: InteractionPrompt;
  private readonly movement = new Vector3();
  private readonly worldUp = new Vector3(0, 1, 0);
  private previousTime: number | undefined;
  private readonly status = document.createElement('p');
  private isDisposed = false;
  private readonly resizeObserver: ResizeObserver;
  private readonly joystick: VirtualJoystick;
  private readonly startupSettingsDialog: StartupSettingsDialog;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly scene: IScene) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.joystick = new VirtualJoystick(canvas);
    this.interactionPrompt = new InteractionPrompt(canvas);
    this.startupSettingsDialog = new StartupSettingsDialog(canvas, this.startGameplay);
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
    this.status.remove();
    this.scene.dispose();
    this.renderer.dispose();
  }

  private async loadScene(): Promise<void> {
    try {
      const model = await this.scene.load(this.updateLoadingProgress);
      if (this.isDisposed) return;
      if (!model) throw new Error('Scene model was not loaded.');
      this.camera.near = 0.05;
      this.camera.far = 150;
      this.camera.updateProjectionMatrix();
      const crates = this.scene.movableCrates.map((object) => new MovableCrate(object));
      this.collisionWorld = new CollisionWorld(model, crates.map((crate) => crate.collider));
      this.player = new Player(this.collisionWorld, this.scene.playerSpawn);
      this.interactionController = new CrateInteractionController(this.player, crates, this.collisionWorld);
      // The orbit angle points from the target to the camera, opposite the player's facing direction.
      const cameraYaw = this.scene.playerSpawn.rotationY - Math.PI;
      this.cameraController = new ThirdPersonCameraController(this.camera, this.collisionWorld, cameraYaw);
      this.cameraController.update(this.player.object.position);
      this.scene.scene.add(this.player.object);
      this.status.hidden = true;
      this.startupSettingsDialog.open();
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
    if (settings.controlMode === ControlMode.Touch) {
      this.joystick.show();
      this.interactionPrompt.enableTouch();
      this.input = new TouchInput(this.canvas, this.joystick);
    } else {
      this.input = new DesktopInput(this.canvas);
    }
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
      this.cameraController.rotate(input.lookX, input.lookY);
      this.movement.set(input.movementX, 0, input.movementZ).applyAxisAngle(this.worldUp, this.cameraController.yaw);
      this.player.update(delta, this.movement);
      this.cameraController.update(this.player.object.position);
      const isTouchInteractionPressed = this.interactionPrompt.readInteraction();
      this.interactionController.update(delta, input.isInteractionPressed || isTouchInteractionPressed);
      this.interactionPrompt.update(
        this.interactionController.candidate, this.player.carriedObject,
        this.interactionController.hasBlockedInteraction, this.camera,
      );
    }
    this.renderer.render(this.scene.scene, this.camera);
    this.joystick.render(this.renderer);
    this.interactionPrompt.render(this.renderer);
    this.startupSettingsDialog.render(this.renderer);
  };
}
