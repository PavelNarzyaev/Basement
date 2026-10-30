import { PerspectiveCamera, WebGLRenderer } from 'three';
import { DesktopInput } from '../controls/DesktopInput';
import { ThirdPersonPlayer } from '../player/ThirdPersonPlayer';
import { createBasementScene } from '../scenes/createBasementScene';

export class Application {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private readonly basementScene = createBasementScene();
  private player: ThirdPersonPlayer | undefined;
  private previousTime: number | undefined;
  private readonly status = document.createElement('p');
  private isDisposed = false;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera.position.set(2.5, 1.8, 3.5);
    this.camera.lookAt(0, 0, 0);
    this.status.className = 'scene-status';
    this.status.setAttribute('role', 'status');
    this.status.textContent = 'Загрузка подвала…';
    document.body.append(this.status);
    void this.loadBasement();

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
  }

  dispose(): void {
    this.isDisposed = true;
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.player?.dispose();
    this.status.remove();
    this.basementScene.dispose();
    this.renderer.dispose();
  }

  private async loadBasement(): Promise<void> {
    try {
      const model = await this.basementScene.load();
      if (this.isDisposed) return;
      if (!model) throw new Error('Basement model was not loaded.');
      this.camera.near = 0.05;
      this.camera.far = 150;
      this.camera.updateProjectionMatrix();
      const input = new DesktopInput(this.canvas);
      try {
        this.player = new ThirdPersonPlayer(model, this.camera, input);
      } catch (error) {
        input.dispose();
        throw error;
      }
      this.basementScene.scene.add(this.player.mesh);
      this.status.textContent = 'Клик по сцене — начать · WASD — движение · Мышь — камера · Esc — освободить курсор';
    } catch (error) {
      if (this.isDisposed) return;
      this.status.textContent = 'Не удалось запустить сцену. Подробности ошибки — в консоли браузера.';
      this.status.setAttribute('role', 'alert');
      console.error('Basement initialization failed:', error);
    }
  }

  private readonly resize = (): void => {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
  };

  private readonly animate = (time: number): void => {
    const delta = this.previousTime === undefined ? 0 : (time - this.previousTime) / 1000;
    this.previousTime = time;
    this.player?.update(delta);
    this.renderer.render(this.basementScene.scene, this.camera);
  };
}
