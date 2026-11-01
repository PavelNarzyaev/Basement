import type { IInteractionButtonView } from './IInteractionButtonView';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import type { ICarryable } from '../../carrying/contracts/ICarryable';

export interface IInteractionPrompt extends IInteractionButtonView {
  enableTouch(): void;
  resize(width: number, height: number): void;
  update(pickupCandidate: ICarryable | undefined, canPutDown: boolean, camera: PerspectiveCamera): void;
  render(renderer: WebGLRenderer): void;
  dispose(): void;
}
