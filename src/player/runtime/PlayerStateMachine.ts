import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { IPlayerState } from '../contracts/IPlayerState';
import { CarryingState } from './states/CarryingState';
import { UnladenState } from './states/UnladenState';

export class PlayerStateMachine {
  private readonly unladenState = new UnladenState();
  private currentState: IPlayerState = this.unladenState;

  get state(): IPlayerState {
    return this.currentState;
  }

  startCarrying(object: ICarryable): void {
    if (this.currentState.carriedObject) throw new Error('Player is already carrying an object.');
    this.currentState = new CarryingState(object);
  }

  stopCarrying(): void {
    if (!this.currentState.carriedObject) throw new Error('Player is not carrying an object.');
    this.currentState = this.unladenState;
  }
}
