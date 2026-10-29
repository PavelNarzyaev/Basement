import { Box3, PerspectiveCamera, Vector3, WebGLRenderer } from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { basementModelUrl, createBasementScene } from '../scenes/createBasementScene';

export class Application {
  private readonly renderer: WebGLRenderer;
  private readonly camera = new PerspectiveCamera(50, 1, 0.1, 100);
  private readonly basementScene = createBasementScene();
  private readonly controls: OrbitControls;
  private readonly status = document.createElement('p');
  private isDisposed = false;
  private readonly resizeObserver: ResizeObserver;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new WebGLRenderer({ canvas, antialias: true });
    this.camera.position.set(2.5, 1.8, 3.5);
    this.camera.lookAt(0, 0, 0);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.enableDamping = true;
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
    this.controls.dispose();
    this.status.remove();
    this.basementScene.dispose();
    this.renderer.dispose();
  }

  private async loadBasement(): Promise<void> {
    try {
      const model = await this.basementScene.load();
      if (this.isDisposed) return;
      if (!model) throw new Error('Basement model was not loaded.');
      const bounds = new Box3().setFromObject(model);
      if (bounds.isEmpty()) throw new Error('Basement model contains no geometry.');
      const center = bounds.getCenter(new Vector3());
      const radius = bounds.getSize(new Vector3()).length() / 2;
      const verticalHalfAngle = this.camera.fov * Math.PI / 360;
      const horizontalHalfAngle = Math.atan(Math.tan(verticalHalfAngle) * this.camera.aspect);
      const distance = radius / Math.sin(Math.min(verticalHalfAngle, horizontalHalfAngle)) * 1.1;
      this.camera.position.copy(center).add(new Vector3(1, 0.8, 1).normalize().multiplyScalar(distance));
      this.camera.near = radius / 1000;
      this.camera.far = distance + radius * 10;
      this.camera.updateProjectionMatrix();
      this.controls.target.copy(center);
      this.controls.maxDistance = distance * 2;
      this.controls.update();
      this.status.remove();
    } catch (error) {
      if (this.isDisposed) return;
      this.status.textContent = `Не удалось загрузить подвал. Поместите GLB в public/models/basement/basement.glb и обновите страницу. URL: ${basementModelUrl}`;
      this.status.setAttribute('role', 'alert');
      console.error('Basement loading failed:', error);
    }
  }

  private readonly resize = (): void => {
    const { width, height } = this.canvas.getBoundingClientRect();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width, height, false);
  };

  private readonly animate = (): void => {
    this.controls.update();
    this.renderer.render(this.basementScene.scene, this.camera);
  };
}
