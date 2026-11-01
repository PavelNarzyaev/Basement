import type { IPlayerInput } from '../contracts/IPlayerInput';
import { PlayerInputStateDto } from '../contracts/PlayerInputStateDto';

export class DesktopInput implements IPlayerInput {
  private readonly keys = new Set<string>();
  private yawDeltaRadians = 0;
  private pitchDeltaRadians = 0;
  private isInteractionPressed = false;
  private readonly events = new AbortController();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const options = { signal: this.events.signal };
    canvas.addEventListener('click', () => {
      void canvas.requestPointerLock().catch(console.error);
    }, options);
    window.addEventListener('keydown', (event) => {
      if (document.pointerLockElement === canvas && event.code === 'KeyE') {
        event.preventDefault();
        if (!event.repeat) this.isInteractionPressed = true;
      }
      if (document.pointerLockElement === canvas && ['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(event.code)) {
        event.preventDefault();
        this.keys.add(event.code);
      }
    }, options);
    window.addEventListener('keyup', (event) => this.keys.delete(event.code), options);
    window.addEventListener('blur', this.clear, options);
    document.addEventListener('visibilitychange', this.clear, options);
    document.addEventListener('pointerlockchange', this.clear, options);
    document.addEventListener('mousemove', (event) => {
      if (document.pointerLockElement === canvas) {

        // Work around Chromium's pointer-lock cursor-recentering bug by discarding oversized events.
        if (Math.abs(event.movementX) > window.innerWidth / 3 || Math.abs(event.movementY) > window.innerHeight / 3) return;

        this.yawDeltaRadians -= event.movementX * 0.0025;
        this.pitchDeltaRadians += event.movementY * 0.0025;
      }
    }, options);
  }

  read(): PlayerInputStateDto {
    const state = new PlayerInputStateDto(
      Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')),
      this.yawDeltaRadians,
      this.pitchDeltaRadians,
      this.isInteractionPressed,
    );
    this.yawDeltaRadians = 0;
    this.pitchDeltaRadians = 0;
    this.isInteractionPressed = false;
    return state;
  }

  dispose(): void {
    this.events.abort();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.clear();
  }

  private readonly clear = (): void => {
    this.keys.clear();
    this.yawDeltaRadians = 0;
    this.pitchDeltaRadians = 0;
    this.isInteractionPressed = false;
  };
}
