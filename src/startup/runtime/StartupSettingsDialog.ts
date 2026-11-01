import { Group } from 'three';
import type { BufferGeometry, Mesh, MeshBasicMaterial, WebGLRenderer } from 'three';
import { ControlMode } from '../../input/contracts/ControlMode';
import type { ICanvasOverlay } from '../../canvas_overlay/contracts/ICanvasOverlay';
import type { ICanvasOverlayFactory } from '../../canvas_overlay/contracts/ICanvasOverlayFactory';
import { StartupSettingsDto } from '../contracts/StartupSettingsDto';
import type { IStartupSettingsDialog } from '../contracts/IStartupSettingsDialog';

export class StartupSettingsDialog implements IStartupSettingsDialog {
  private onStart!: (settings: StartupSettingsDto) => void;
  private readonly overlay: ICanvasOverlay;
  private readonly content = new Group();
  private readonly panel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly heading: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly controlLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly toggleBackground: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly selectedBackground: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly desktopLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly mobileLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly fullscreenBackground: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly fullscreenCheck: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly fullscreenLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly startBackground: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly startLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly events = new AbortController();
  private controlMode = ControlMode.Desktop;
  private shouldEnterFullscreen = false;
  private pressedAction: ControlMode | 'fullscreen' | 'start' | undefined;
  private pressedPointer: number | undefined;

  constructor(private readonly canvas: HTMLCanvasElement, overlayFactory: ICanvasOverlayFactory) {
    this.overlay = overlayFactory.create();
    this.panel = this.overlay.createPanel('#202632', 0.97);
    this.heading = this.overlay.createLabel('Настройки запуска', 24);
    this.controlLabel = this.overlay.createLabel('Режим управления', 16);
    this.toggleBackground = this.overlay.createPanel('#30394a');
    this.selectedBackground = this.overlay.createPanel('#596c89');
    this.desktopLabel = this.overlay.createLabel('Десктоп', 18);
    this.mobileLabel = this.overlay.createLabel('Мобильный', 18);
    this.fullscreenBackground = this.overlay.createPanel('#596c89');
    this.fullscreenCheck = this.overlay.createLabel('✓', 22);
    this.fullscreenLabel = this.overlay.createLabel('Развернуть', 18);
    this.startBackground = this.overlay.createPanel('#435b48');
    this.startLabel = this.overlay.createLabel('Запустить', 21);
    this.panel.position.z = -1;
    this.selectedBackground.position.z = 0.1;
    this.desktopLabel.position.z = 0.2;
    this.mobileLabel.position.z = 0.2;
    this.startLabel.position.z = 0.1;
    this.content.add(
      this.panel, this.heading, this.controlLabel, this.toggleBackground, this.selectedBackground,
      this.desktopLabel, this.mobileLabel, this.startBackground, this.startLabel,
      this.fullscreenBackground, this.fullscreenCheck, this.fullscreenLabel,
    );
    this.overlay.scene.add(this.content);
    const options = { signal: this.events.signal };
    canvas.addEventListener('pointerdown', this.onPointerDown, options);
    canvas.addEventListener('pointerup', this.onPointerUp, options);
    canvas.addEventListener('pointercancel', this.clearPress, options);
    window.addEventListener('blur', this.clearPress, options);
  }

  open(onStart: (settings: StartupSettingsDto) => void): void {
    this.onStart = onStart;
    this.clearPress();
    this.controlMode = window.matchMedia('(pointer: coarse)').matches ? ControlMode.Touch : ControlMode.Desktop;
    this.updateSelection();
    this.overlay.scene.visible = true;
  }

  resize(width: number, height: number): void {
    this.overlay.resize(width, height);
    const panelWidth = Math.min(400, width - 32);
    const contentWidth = panelWidth - 40;
    const segmentWidth = contentWidth / 2;
    this.content.position.set(width / 2, height / 2, 0);
    this.panel.scale.set(panelWidth, 340, 1);
    this.heading.position.y = -125;
    this.controlLabel.position.y = -75;
    this.toggleBackground.position.y = -28;
    this.toggleBackground.scale.set(contentWidth, 52, 1);
    this.selectedBackground.scale.set(segmentWidth - 4, 44, 1);
    this.desktopLabel.position.set(-segmentWidth / 2, -28, 0.2);
    this.mobileLabel.position.set(segmentWidth / 2, -28, 0.2);
    this.startBackground.position.y = 114;
    this.startBackground.scale.set(contentWidth, 54, 1);
    this.startLabel.position.y = 114;
    const labelScale = Math.min(1, contentWidth / 320);
    for (const label of [this.heading, this.controlLabel, this.desktopLabel, this.mobileLabel, this.startLabel]) {
      label.scale.set(512 * labelScale, 64 * labelScale, 1);
    }
    this.fullscreenBackground.position.set(-76 * labelScale, 40, 0);
    this.fullscreenBackground.scale.set(24, 24, 1);
    this.fullscreenCheck.position.set(-76 * labelScale, 40, 0.1);
    this.fullscreenCheck.scale.set(512, 64, 1);
    this.fullscreenLabel.position.set(15 * labelScale, 40, 0);
    this.fullscreenLabel.scale.set(512 * labelScale, 64 * labelScale, 1);
    this.updateSelection();
    this.clearPress();
  }

  render(renderer: WebGLRenderer): void {
    this.overlay.render(renderer);
  }

  dispose(): void {
    this.events.abort();
    this.overlay.dispose();
  }

  private updateSelection(): void {
    this.fullscreenCheck.visible = this.shouldEnterFullscreen;
    const label = this.controlMode === ControlMode.Desktop ? this.desktopLabel : this.mobileLabel;
    this.selectedBackground.position.set(label.position.x, label.position.y, 0.1);
  }

  private getAction(clientX: number, clientY: number): ControlMode | 'fullscreen' | 'start' | undefined {
    if (!this.overlay.scene.visible) return undefined;
    const bounds = this.canvas.getBoundingClientRect();
    const x = clientX - bounds.left - this.content.position.x;
    const y = clientY - bounds.top - this.content.position.y;
    if (Math.abs(x) <= this.toggleBackground.scale.x / 2 && Math.abs(y - this.toggleBackground.position.y) <= 26) {
      return x < 0 ? ControlMode.Desktop : ControlMode.Touch;
    }
    if (Math.abs(x) <= this.toggleBackground.scale.x / 2 && Math.abs(y - this.fullscreenBackground.position.y) <= 20) {
      return 'fullscreen';
    }
    if (Math.abs(x) <= this.startBackground.scale.x / 2 && Math.abs(y - this.startBackground.position.y) <= 27) {
      return 'start';
    }
    return undefined;
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || this.pressedPointer !== undefined) return;
    this.pressedAction = this.getAction(event.clientX, event.clientY);
    if (this.pressedAction !== undefined) this.pressedPointer = event.pointerId;
  };

  private readonly onPointerUp = (event: PointerEvent): void => {
    if (event.pointerId !== this.pressedPointer) return;
    const action = this.getAction(event.clientX, event.clientY);
    if (action === undefined || action !== this.pressedAction) {
      this.clearPress();
      return;
    }
    this.clearPress();
    if (action === 'start') {
      this.overlay.scene.visible = false;
      this.onStart(new StartupSettingsDto(this.controlMode, this.shouldEnterFullscreen));
    } else if (action === 'fullscreen') {
      this.shouldEnterFullscreen = !this.shouldEnterFullscreen;
      this.updateSelection();
    } else {
      this.controlMode = action;
      this.updateSelection();
    }
  };

  private readonly clearPress = (): void => {
    this.pressedAction = undefined;
    this.pressedPointer = undefined;
  };
}
