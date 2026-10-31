import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { IPlayerState } from '../contracts/IPlayerState';
import { CarryingState } from './CarryingState';
import { WalkingState } from './WalkingState';

export class PlayerStateMachine {
  private readonly walkingState = new WalkingState();
  private currentState: IPlayerState = this.walkingState;

  get state(): IPlayerState {
    return this.currentState;
  }

  startCarrying(object: ICarryable): void {
    if (this.currentState.carriedObject) throw new Error('Player is already carrying an object.');
    this.currentState = new CarryingState(object);
  }

  stopCarrying(): void {
    if (!this.currentState.carriedObject) throw new Error('Player is not carrying an object.');
    this.currentState = this.walkingState;
  }
}
