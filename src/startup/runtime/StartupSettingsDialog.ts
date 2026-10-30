import { Group } from 'three';
import type { WebGLRenderer } from 'three';
import { ControlMode } from '../../input/contracts/ControlMode';
import { CanvasOverlay } from '../../ui/runtime/CanvasOverlay';
import { StartupSettingsDto } from '../contracts/StartupSettingsDto';

export class StartupSettingsDialog {
  private readonly overlay = new CanvasOverlay();
  private readonly content = new Group();
  private readonly panel = this.overlay.createPanel('#202632', 0.97);
  private readonly heading = this.overlay.createLabel('Настройки запуска', 24);
  private readonly controlLabel = this.overlay.createLabel('Режим управления', 16);
  private readonly toggleBackground = this.overlay.createPanel('#30394a');
  private readonly selectedBackground = this.overlay.createPanel('#596c89');
  private readonly desktopLabel = this.overlay.createLabel('Десктоп', 18);
  private readonly mobileLabel = this.overlay.createLabel('Мобильный', 18);
  private readonly startBackground = this.overlay.createPanel('#435b48');
  private readonly startLabel = this.overlay.createLabel('Запустить', 21);
  private readonly events = new AbortController();
  private controlMode = ControlMode.Desktop;
  private pressedAction: ControlMode | 'start' | undefined;
  private pressedPointer: number | undefined;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly onStart: (settings: StartupSettingsDto) => void) {
    this.panel.position.z = -1;
    this.selectedBackground.position.z = 0.1;
    this.desktopLabel.position.z = 0.2;
    this.mobileLabel.position.z = 0.2;
    this.startLabel.position.z = 0.1;
    this.content.add(
      this.panel, this.heading, this.controlLabel, this.toggleBackground, this.selectedBackground,
      this.desktopLabel, this.mobileLabel, this.startBackground, this.startLabel,
    );
    this.overlay.scene.add(this.content);
    const options = { signal: this.events.signal };
    canvas.addEventListener('pointerdown', this.onPointerDown, options);
    canvas.addEventListener('pointerup', this.onPointerUp, options);
    canvas.addEventListener('pointercancel', this.clearPress, options);
    window.addEventListener('blur', this.clearPress, options);
  }

  open(): void {
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
    this.panel.scale.set(panelWidth, 290, 1);
    this.heading.position.y = -98;
    this.controlLabel.position.y = -44;
    this.toggleBackground.position.y = 3;
    this.toggleBackground.scale.set(contentWidth, 52, 1);
    this.selectedBackground.scale.set(segmentWidth - 4, 44, 1);
    this.desktopLabel.position.set(-segmentWidth / 2, 3, 0.2);
    this.mobileLabel.position.set(segmentWidth / 2, 3, 0.2);
    this.startBackground.position.y = 94;
    this.startBackground.scale.set(contentWidth, 54, 1);
    this.startLabel.position.y = 94;
    const labelScale = Math.min(1, contentWidth / 320);
    for (const label of [this.heading, this.controlLabel, this.desktopLabel, this.mobileLabel, this.startLabel]) {
      label.scale.set(512 * labelScale, 64 * labelScale, 1);
    }
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
    const label = this.controlMode === ControlMode.Desktop ? this.desktopLabel : this.mobileLabel;
    this.selectedBackground.position.set(label.position.x, label.position.y, 0.1);
  }

  private getAction(clientX: number, clientY: number): ControlMode | 'start' | undefined {
    if (!this.overlay.scene.visible) return undefined;
    const bounds = this.canvas.getBoundingClientRect();
    const x = clientX - bounds.left - this.content.position.x;
    const y = clientY - bounds.top - this.content.position.y;
    if (Math.abs(x) <= this.toggleBackground.scale.x / 2 && Math.abs(y - this.toggleBackground.position.y) <= 26) {
      return x < 0 ? ControlMode.Desktop : ControlMode.Touch;
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
      this.onStart(new StartupSettingsDto(this.controlMode));
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
