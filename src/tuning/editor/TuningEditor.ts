import type { IEditableTuningSettings } from '../contracts/IEditableTuningSettings.ts';
import type { TuningSessionDto } from '../contracts/TuningSessionDto.ts';
import { tuningEditorSettings } from '../contracts/tuningEditorSettings.ts';
import { tuningLimits } from '../contracts/tuningLimits.ts';
import './tuning-editor.css';

export class TuningEditor {
  private readonly panel = document.createElement('details');
  private readonly events = new AbortController();
  private readonly status: HTMLElement;
  private readonly inputs: NodeListOf<HTMLInputElement>;
  private pendingRequest: Promise<void> = Promise.resolve();
  private pendingEditCount = 0;
  private latestSession: TuningSessionDto | undefined;

  constructor(private readonly settings: IEditableTuningSettings) {
    this.panel.className = 'tuning-editor';
    this.panel.open = true;
    this.panel.innerHTML = `
      <summary>Настройки сцены <span>DEV</span></summary>
      <form>
        <label>Скорость без груза <span>м/с</span>
          <div><input name="unladenMovementSpeed" type="range"><input name="unladenMovementSpeed" type="number" aria-label="Скорость без груза, м/с"></div>
        </label>
        <label>Скорость с грузом <span>м/с</span>
          <div><input name="carryingMovementSpeed" type="range"><input name="carryingMovementSpeed" type="number" aria-label="Скорость с грузом, м/с"></div>
        </label>
        <label>Цвет ламп
          <div><input name="lampColor" type="color"><input name="lampColor" type="text" aria-label="Цвет ламп в формате HEX" pattern="#[0-9a-fA-F]{6}" maxlength="7"></div>
        </label>
        <p class="tuning-status" role="status">Подключение…</p>
        <footer><button type="submit">Сохранить в проект</button><button type="button">Сбросить</button></footer>
      </form>`;
    this.status = this.panel.querySelector('.tuning-status')!;
    this.inputs = this.panel.querySelectorAll('input');
    for (const input of this.inputs) {
      if (input.type === 'range' || input.type === 'number') {
        input.min = String(tuningLimits.minimumMovementSpeed);
        input.max = String(tuningLimits.maximumMovementSpeed);
        input.step = String(tuningLimits.movementSpeedStep);
      }
      input.addEventListener('input', () => {
        if (!input.checkValidity()) return;
        const value = input.name === 'lampColor' ? input.value : input.valueAsNumber;
        this.enqueueRequest('', { [input.name]: value });
      }, { signal: this.events.signal });
    }
    const form = this.panel.querySelector('form')!;
    form.addEventListener('submit', event => {
      event.preventDefault();
      this.enqueueRequest('/save');
    }, { signal: this.events.signal });
    form.querySelector('button[type="button"]')!.addEventListener('click', () => this.enqueueRequest('/reset'), { signal: this.events.signal });
    // Editing a field must not also move the player when gameplay has focus.
    this.panel.addEventListener('keydown', event => event.stopPropagation(), { signal: this.events.signal });
    document.body.append(this.panel);
    import.meta.hot!.on(tuningEditorSettings.updateEvent, this.applySession);
    this.pendingRequest = this.request('', undefined, 'GET').catch(this.reportError);
  }

  dispose(): void {
    this.events.abort();
    import.meta.hot!.off(tuningEditorSettings.updateEvent, this.applySession);
    this.panel.remove();
  }

  private enqueueRequest(action: string, patch?: Record<string, number | string>): void {
    this.pendingEditCount++;
    this.pendingRequest = this.pendingRequest.then(() => this.request(action, patch)).catch(this.reportError).finally(() => {
      this.pendingEditCount--;
      if (this.pendingEditCount === 0 && this.latestSession) this.applySession(this.latestSession);
    });
  }

  private async request(action: string, patch?: Record<string, number | string>, method = 'POST'): Promise<void> {
    const response = await fetch(`${tuningEditorSettings.endpoint}${action}`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      ...(patch ? { body: JSON.stringify(patch) } : {}),
      signal: this.events.signal,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    this.applySession(result);
  }

  private readonly applySession = (session: TuningSessionDto): void => {
    this.latestSession = session;
    this.settings.applySettings(session.current);
    for (const input of this.inputs) {
      const key = input.name as keyof TuningSessionDto['current'];
      // Preserve the thumb position and partially typed text while a field is being edited.
      if (document.activeElement !== input || this.pendingEditCount === 0) input.value = String(session.current[key]);
    }
    this.status.textContent = session.hasUnsavedChanges ? 'Предпросмотр · есть несохранённые изменения' : 'Настройки сохранены в проекте';
    this.status.dataset.error = 'false';
  };

  private readonly reportError = (error: unknown): void => {
    if (this.events.signal.aborted) return;
    this.status.textContent = error instanceof Error ? error.message : String(error);
    this.status.dataset.error = 'true';
  };
}
