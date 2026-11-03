import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { IPlayerState } from '../contracts/IPlayerState';
import { CarryingState } from './states/CarryingState';
import { UnladenState } from './states/UnladenState';
import type { ITuningSettings } from '../../tuning/contracts/ITuningSettings';
import { tuningDefaults } from '../../tuning/contracts/tuningDefaults';

export class PlayerStateMachine {
  private readonly unladenState: UnladenState;
  private currentState: IPlayerState;

  constructor(private readonly settings: ITuningSettings = tuningDefaults) {
    this.unladenState = new UnladenState(settings);
    this.currentState = this.unladenState;
  }

  get state(): IPlayerState {
    return this.currentState;
  }

  startCarrying(object: ICarryable): void {
    if (this.currentState.carriedObject) throw new Error('Player is already carrying an object.');
    this.currentState = new CarryingState(object, this.settings);
  }

  stopCarrying(): void {
    if (!this.currentState.carriedObject) throw new Error('Player is not carrying an object.');
    this.currentState = this.unladenState;
  }
}
