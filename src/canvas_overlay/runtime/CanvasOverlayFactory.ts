import type { ICanvasOverlay } from '../contracts/ICanvasOverlay';
import type { ICanvasOverlayFactory } from '../contracts/ICanvasOverlayFactory';
import { CanvasOverlay } from './CanvasOverlay';

export class CanvasOverlayFactory implements ICanvasOverlayFactory {
  create(): ICanvasOverlay {
    return new CanvasOverlay();
  }
}
