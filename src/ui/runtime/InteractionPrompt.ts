import { Vector3 } from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import { CanvasOverlay } from './CanvasOverlay';

export class InteractionPrompt {
  private readonly overlay = new CanvasOverlay();
  private readonly takeLabel = this.overlay.createLabel('E · Взять', 21);
  private readonly placeLabel = this.overlay.createLabel('E · Поставить', 21);
  private readonly blockedLabel = this.overlay.createLabel('Нет места или опоры для ящика', 17);
  private readonly touchPanel = this.overlay.createPanel('#30394a', 0.92);
  private readonly touchLabel = this.overlay.createLabel('Взять / поставить', 16);
  private readonly screenPosition = new Vector3();
  private readonly events = new AbortController();
  private isTouchEnabled = false;
  private isPressed = false;
  private width = 1;
  private height = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.touchPanel.scale.set(180, 58, 1);
    this.touchLabel.position.z = 0.1;
    this.overlay.scene.add(this.takeLabel, this.placeLabel, this.blockedLabel, this.touchPanel, this.touchLabel);
    // Registered before TouchInput: interaction taps must not also rotate the camera.
    canvas.addEventListener('pointerdown', (event) => {
      if (event.button !== 0 || !this.touchPanel.visible || !this.overlay.scene.visible) return;
      const bounds = canvas.getBoundingClientRect();
      const x = event.clientX - bounds.left - this.touchPanel.position.x;
      const y = event.clientY - bounds.top - this.touchPanel.position.y;
      if (Math.abs(x) > 90 || Math.abs(y) > 29) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      this.isPressed = true;
    }, { signal: this.events.signal });
    window.addEventListener('blur', this.clear, { signal: this.events.signal });
    document.addEventListener('visibilitychange', this.clear, { signal: this.events.signal });
  }

  enableTouch(): void {
    this.isTouchEnabled = true;
  }

  readInteraction(): boolean {
    const pressed = this.isPressed;
    this.isPressed = false;
    return pressed;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.overlay.resize(width, height);
    this.placeLabel.position.set(width / 2, height - 66, 0);
    this.blockedLabel.position.set(width / 2, height - 110, 0);
    const labelScale = Math.min(1, (width - 24) / 512);
    this.blockedLabel.scale.set(512 * labelScale, 64 * labelScale, 1);
    this.touchPanel.position.set(width - 110, height - 65, 0);
    this.touchLabel.position.set(width - 110, height - 65, 0.1);
  }

  update(candidate: ICarryable | undefined, carriedObject: ICarryable | undefined, hasBlockedInteraction: boolean, camera: PerspectiveCamera): void {
    this.overlay.scene.visible = Boolean(candidate || carriedObject || hasBlockedInteraction);
    this.placeLabel.visible = Boolean(carriedObject) && !this.isTouchEnabled;
    this.blockedLabel.visible = hasBlockedInteraction;
    this.touchPanel.visible = this.isTouchEnabled && Boolean(candidate || carriedObject);
    this.touchLabel.visible = this.touchPanel.visible;
    this.takeLabel.visible = false;
    if (!candidate) return;
    this.screenPosition.copy(candidate.collider.center);
    this.screenPosition.y += candidate.collider.halfSize.y + 0.25;
    camera.updateWorldMatrix(true, false);
    this.screenPosition.project(camera);
    this.takeLabel.visible = !this.isTouchEnabled && Math.abs(this.screenPosition.x) < 1
      && Math.abs(this.screenPosition.y) < 1 && Math.abs(this.screenPosition.z) < 1;
    this.takeLabel.position.set((this.screenPosition.x + 1) * this.width / 2, (1 - this.screenPosition.y) * this.height / 2, 0);
  }

  render(renderer: WebGLRenderer): void {
    this.overlay.render(renderer);
  }

  dispose(): void {
    this.events.abort();
    this.overlay.dispose();
  }

  private readonly clear = (): void => {
    this.isPressed = false;
  };
}
