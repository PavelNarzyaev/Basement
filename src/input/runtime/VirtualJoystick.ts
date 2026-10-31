import { CircleGeometry, Group, RingGeometry, Vector2 } from 'three';
import type { BufferGeometry, Mesh, MeshBasicMaterial, WebGLRenderer } from 'three';
import type { ICanvasOverlay } from '../../canvas_overlay/contracts/ICanvasOverlay';
import type { ICanvasOverlayFactory } from '../../canvas_overlay/contracts/ICanvasOverlayFactory';
import type { IVirtualJoystick } from '../contracts/IVirtualJoystick';
import { touchControlLayout } from '../contracts/touchControlLayout';

export class VirtualJoystick implements IVirtualJoystick {
  private readonly overlay: ICanvasOverlay;
  private readonly joystick = new Group();
  private readonly knob: Mesh<BufferGeometry, MeshBasicMaterial>;
  private radius = 64;

  constructor(private readonly canvas: HTMLCanvasElement, overlayFactory: ICanvasOverlayFactory) {
    this.overlay = overlayFactory.create();
    this.knob = this.overlay.createMesh(new CircleGeometry(0.4, 48), '#f5eee4', 0.8);
    const base = this.overlay.createMesh(new CircleGeometry(1, 64), '#202632', 0.55);
    const rim = this.overlay.createMesh(new RingGeometry(0.97, 1, 64), '#f5eee4', 0.65);
    rim.position.z = 0.1;
    this.knob.position.z = 0.2;
    this.joystick.add(base, rim, this.knob);
    this.overlay.scene.add(this.joystick);
  }

  show(): void {
    this.overlay.scene.visible = true;
  }

  resize(width: number, height: number): void {
    this.overlay.resize(width, height);
    this.radius = Math.min(touchControlLayout.maximumRadius, width * touchControlLayout.widthRatio, height * touchControlLayout.heightRatio);
    const margin = touchControlLayout.margin;
    this.joystick.position.set(margin + this.radius, height - margin - this.radius, 0);
    this.joystick.scale.set(this.radius, this.radius, 1);
    this.setJoystickPosition(0, 0);
  }

  getJoystickDisplacement(clientX: number, clientY: number): Vector2 {
    const bounds = this.canvas.getBoundingClientRect();
    return new Vector2(
      (clientX - bounds.left - this.joystick.position.x) / this.radius,
      (clientY - bounds.top - this.joystick.position.y) / this.radius,
    );
  }

  setJoystickPosition(x: number, y: number): void {
    this.knob.position.set(x * 0.6, y * 0.6, 0.2);
  }

  render(renderer: WebGLRenderer): void {
    this.overlay.render(renderer);
  }

  dispose(): void {
    this.overlay.dispose();
  }
}
