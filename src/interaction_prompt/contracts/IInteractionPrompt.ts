import type { PerspectiveCamera, WebGLRenderer } from 'three';
import type { ICarryable } from '../../carrying/contracts/ICarryable';

export interface IInteractionPrompt {
  enableTouch(): void;
  readInteraction(): boolean;
  resize(width: number, height: number): void;
  update(candidate: ICarryable | undefined, carriedObject: ICarryable | undefined, hasBlockedInteraction: boolean, camera: PerspectiveCamera): void;
  render(renderer: WebGLRenderer): void;
  dispose(): void;
}
