import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import type { ICrateObjective } from '../contracts/ICrateObjective';
import { CrateObjectiveProgress } from './CrateObjectiveProgress';

export class CrateObjective implements ICrateObjective {
  private readonly panel = document.createElement('section');
  private readonly counter = document.createElement('p');
  private readonly completion = document.createElement('div');
  private readonly restart = document.createElement('button');
  private progress!: CrateObjectiveProgress;
  private placedCount = -1;

  constructor() {
    this.panel.className = 'crate-objective';
    this.panel.hidden = true;
    this.counter.setAttribute('role', 'status');
    const message = document.createElement('p');
    message.textContent = 'Задание выполнено!';
    this.restart.type = 'button';
    this.restart.textContent = 'рестарт';
    this.completion.append(message, this.restart);
    this.panel.append(this.counter, this.completion);
    document.body.append(this.panel);
  }

  start(crates: readonly ICarryable[], zone: OrientedBoxDto, onRestart: () => void): void {
    this.progress = new CrateObjectiveProgress(crates, zone);
    this.restart.onclick = onRestart;
    this.panel.hidden = false;
    this.placedCount = -1;
    this.update(undefined);
  }

  update(carriedCrate: ICarryable | undefined): void {
    const count = this.progress.countPlaced(carriedCrate);
    if (count === this.placedCount) return;
    this.placedCount = count;
    this.counter.textContent = `Ящики в тележке: ${count}/${this.progress.total}`;
    this.completion.hidden = count !== this.progress.total;
  }

  dispose(): void {
    this.restart.onclick = null;
    this.panel.remove();
  }
}
