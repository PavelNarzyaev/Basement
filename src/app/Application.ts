import { PerspectiveCamera, Timer, WebGLRenderer } from 'three';
import { createDemoScene } from '../scenes/createDemoScene';

export class Application {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private readonly demoScene = createDemoScene();
  private readonly timer = new Timer();
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera.position.set(2.5, 1.8, 3.5);
    this.camera.lookAt(0, 0, 0);
    this.timer.connect(document);

    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(canvas);
    this.resize();
    this.renderer.setAnimationLoop(this.animate);
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    this.timer.dispose();
    this.demoScene.dispose();
    this.renderer.dispose();
  }

  private readonly resize = (): void => {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
  };

  private readonly animate = (): void => {
    this.timer.update();
    this.demoScene.update(this.timer.getDelta());
    this.renderer.render(this.demoScene.scene, this.camera);
  };
}
