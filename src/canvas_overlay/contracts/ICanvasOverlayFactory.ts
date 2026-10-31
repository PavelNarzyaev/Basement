import type { ICanvasOverlay } from './ICanvasOverlay';

export interface ICanvasOverlayFactory {
  create(): ICanvasOverlay;
}
