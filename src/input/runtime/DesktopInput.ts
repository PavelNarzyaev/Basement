import type { IPlayerInput } from '../contracts/IPlayerInput';
import type { IPlayerInputState } from '../contracts/IPlayerInputState';

export class DesktopInput implements IPlayerInput {
  private readonly keys = new Set<string>();
  private lookX = 0;
  private lookY = 0;
  private readonly events = new AbortController();

  constructor(private readonly canvas: HTMLCanvasElement) {
    const options = { signal: this.events.signal };
    canvas.addEventListener('click', () => {
      void canvas.requestPointerLock().catch(console.error);
    }, options);
    window.addEventListener('keydown', (event) => {
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
        this.lookX += event.movementX;
        this.lookY += event.movementY;
      }
    }, options);
  }

  read(): IPlayerInputState {
    const state = {
      movementX: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
      movementZ: Number(this.keys.has('KeyS')) - Number(this.keys.has('KeyW')),
      lookX: this.lookX * 0.0025,
      lookY: this.lookY * 0.0025,
    };
    this.lookX = 0;
    this.lookY = 0;
    return state;
  }

  dispose(): void {
    this.events.abort();
    if (document.pointerLockElement === this.canvas) document.exitPointerLock();
    this.clear();
  }

  private readonly clear = (): void => {
    this.keys.clear();
    this.lookX = 0;
    this.lookY = 0;
  };
}
