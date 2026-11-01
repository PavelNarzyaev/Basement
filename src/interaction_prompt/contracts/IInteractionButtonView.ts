import type { InteractionButtonBoundsDto } from './InteractionButtonBoundsDto';

export interface IInteractionButtonView {
  getInteractionButtonBounds(): InteractionButtonBoundsDto | undefined;
}
