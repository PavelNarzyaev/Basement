import type { IGameplaySession } from '../contracts/IGameplaySession';
import type { IBombardment } from '../../bombardment/contracts/IBombardment';
import { PerspectiveCamera, WebGLRenderer } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IVirtualJoystick } from '../../input/contracts/IVirtualJoystick';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { IGameScene } from '../../scenes/contracts/IGameScene';
import type { StartupSettingsDto } from '../../startup/contracts/StartupSettingsDto';
import type { IStartupSettingsDialog } from '../../startup/contracts/IStartupSettingsDialog';
import type { IInteractionPrompt } from '../../interaction_prompt/contracts/IInteractionPrompt';
import type { IGameplayFactory } from '../contracts/IGameplayFactory';
import type { ICrateObjective } from '../../objective/contracts/ICrateObjective';

export class Application {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private session: IGameplaySession | undefined;
  private previousTime: number | undefined;
  private readonly status = document.createElement('p');
  private isDisposed = false;
  private readonly loadingController = new AbortController();
  private readonly resizeObserver: ResizeObserver;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    private readonly scene: IGameScene,
    private readonly joystick: IVirtualJoystick,
    private readonly interactionPrompt: IInteractionPrompt,
    private readonly startupSettingsDialog: IStartupSettingsDialog,
    private readonly gameplayFactory: IGameplayFactory,
    private readonly objective: ICrateObjective,
    private readonly bombardment: IBombardment,
    renderer = new WebGLRenderer({ canvas, antialias: true }),
  ) {
    this.renderer = renderer;
    this.camera.position.set(2.5, 1.8, 3.5);
    this.camera.lookAt(0, 0, 0);
    this.status.className = 'scene-status';
    this.status.setAttribute('role', 'status');
    this.updateLoadingProgress(0);
    document.body.append(this.status);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
    void this.loadScene();
  }

  dispose(): void {
    this.status.remove();
    this.releaseResources();
  }

  private releaseResources(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.loadingController.abort();
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.session?.dispose();
    this.session = undefined;
    this.startupSettingsDialog.dispose();
    this.joystick.dispose();
    this.interactionPrompt.dispose();
    this.objective.dispose();
    this.bombardment.dispose();
    this.scene.dispose();
    this.renderer.dispose();
  }

  private async loadScene(): Promise<void> {
    let world: ICollisionWorld | undefined;
    let player: IPlayer | undefined;
    try {
      const sceneResult = await this.scene.load((percentage) => this.updateLoadingProgress(percentage * 0.9));
      if (this.isDisposed) return;
      this.camera.near = 0.05;
      this.camera.far = 150;
      this.camera.updateProjectionMatrix();
      const crates = sceneResult.movableCrates.map((spawn) => {
        const crate = this.gameplayFactory.createCarryable(spawn.model);
        crate.setPose(spawn.center, spawn.rotationY);
        return crate;
      });
      world = this.gameplayFactory.createCollisionWorld(sceneResult.staticModel, crates.map((crate) => crate.collider));
      player = await this.gameplayFactory.createPlayer(
        world, sceneResult.playerSpawn,
        (percentage) => this.updateLoadingProgress(90 + percentage * 0.1),
        this.loadingController.signal,
      );
      if (this.isDisposed) {
        return;
      }
      this.session = this.gameplayFactory.createSession(player, world, crates, this.camera, sceneResult);
      player = undefined;
      world = undefined;
      await this.bombardment.load();
      if (this.isDisposed) return;
      this.status.hidden = true;
      const session = this.session;
      this.startupSettingsDialog.open((settings) => this.startGameplay(session, settings));
    } catch (error) {
      if (this.isDisposed) return;
      this.releaseResources();
      this.status.hidden = false;
      this.status.textContent = 'Не удалось запустить сцену. Подробности ошибки — в консоли браузера.';
      this.status.setAttribute('role', 'alert');
      console.error('Scene initialization failed:', error);
    } finally {
      player?.dispose();
      world?.dispose();
    }
  }

  private readonly updateLoadingProgress = (percentage: number): void => {
    if (this.isDisposed) return;
    this.status.textContent = `Загрузка: ${Math.floor(percentage)}%`;
  };

  private readonly startGameplay = (session: IGameplaySession, settings: StartupSettingsDto): void => {
    if (settings.shouldEnterFullscreen && !document.fullscreenElement) {
      // Request within the start gesture to preserve browser user activation.
      void document.documentElement.requestFullscreen().catch((error: unknown) => {
        console.error('Could not enter fullscreen:', error);
      });
    }
    this.previousTime = undefined;
    session.start(settings);
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
    const deltaSeconds = this.previousTime === undefined ? 0 : (time - this.previousTime) / 1000;
    this.previousTime = time;
    this.session?.update(deltaSeconds);
    this.scene.update(deltaSeconds);
    this.renderer.render(this.scene.scene, this.camera);
    this.joystick.render(this.renderer);
    this.interactionPrompt.render(this.renderer);
    this.startupSettingsDialog.render(this.renderer);
  };
}
