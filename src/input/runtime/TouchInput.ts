import { Vector2 } from 'three';
import type { IJoystickView } from '../contracts/IJoystickView';
import type { IPlayerInput } from '../contracts/IPlayerInput';
import { PlayerInputStateDto } from '../contracts/PlayerInputStateDto';

export class TouchInput implements IPlayerInput {
  private readonly events = new AbortController();
  private readonly movement = new Vector2();
  private readonly lookPosition = new Vector2();
  private movementPointer: number | undefined;
  private lookPointer: number | undefined;
  private yawDeltaRadians = 0;
  private pitchDeltaRadians = 0;

  constructor(private readonly canvas: HTMLCanvasElement, private readonly joystick: IJoystickView) {
    const options = { signal: this.events.signal };
    canvas.addEventListener('pointerdown', this.onPointerDown, options);
    canvas.addEventListener('pointermove', this.onPointerMove, options);
    canvas.addEventListener('pointerup', this.onPointerEnd, options);
    canvas.addEventListener('pointercancel', this.onPointerEnd, options);
    canvas.addEventListener('lostpointercapture', this.onPointerEnd, options);
    window.addEventListener('blur', this.clear, options);
    window.addEventListener('resize', this.clear, options);
    document.addEventListener('visibilitychange', this.clear, options);
  }

  read(): PlayerInputStateDto {
    const state = new PlayerInputStateDto(this.movement.x, this.movement.y, this.yawDeltaRadians, this.pitchDeltaRadians);
    this.yawDeltaRadians = 0;
    this.pitchDeltaRadians = 0;
    return state;
  }

  dispose(): void {
    this.events.abort();
    this.clear();
  }

  private readonly onPointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const displacement = this.joystick.getJoystickDisplacement(event.clientX, event.clientY);
    if (displacement.length() <= 1) {
      if (this.movementPointer !== undefined) return;
      this.movementPointer = event.pointerId;
      this.updateMovement(displacement);
    } else {
      if (this.lookPointer !== undefined) return;
      this.lookPointer = event.pointerId;
      this.lookPosition.set(event.clientX, event.clientY);
    }
    this.canvas.setPointerCapture(event.pointerId);
  };

  private readonly onPointerMove = (event: PointerEvent): void => {
    if (event.pointerId === this.movementPointer) {
      this.updateMovement(this.joystick.getJoystickDisplacement(event.clientX, event.clientY));
    } else if (event.pointerId === this.lookPointer) {
      const sensitivity = Math.PI / Math.min(this.canvas.clientWidth, this.canvas.clientHeight);
      this.yawDeltaRadians -= (event.clientX - this.lookPosition.x) * sensitivity;
      this.pitchDeltaRadians += (event.clientY - this.lookPosition.y) * sensitivity;
      this.lookPosition.set(event.clientX, event.clientY);
    }
  };

  private readonly onPointerEnd = (event: PointerEvent): void => {
    if (event.pointerId === this.movementPointer) {
      this.movementPointer = undefined;
      this.movement.set(0, 0);
      this.joystick.setJoystickPosition(0, 0);
    }
    if (event.pointerId === this.lookPointer) this.lookPointer = undefined;
  };

  private updateMovement(displacement: Vector2): void {
    this.movement.copy(displacement).clampLength(0, 1);
    this.joystick.setJoystickPosition(this.movement.x, this.movement.y);
  }

  private readonly clear = (): void => {
    const pointers = [this.movementPointer, this.lookPointer];
    this.movementPointer = undefined;
    this.lookPointer = undefined;
    for (const pointer of pointers) {
      if (pointer !== undefined && this.canvas.hasPointerCapture(pointer)) this.canvas.releasePointerCapture(pointer);
    }
    this.movement.set(0, 0);
    this.yawDeltaRadians = 0;
    this.pitchDeltaRadians = 0;
    this.joystick.setJoystickPosition(0, 0);
  };
}
