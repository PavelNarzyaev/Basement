import { tuningEditorSettings } from '../contracts/tuningEditorSettings.ts';
import type { TuningSessionDto } from '../contracts/TuningSessionDto.ts';
import type { TuningSettingsPatchDto } from '../contracts/TuningSettingsPatchDto.ts';

export class TuningAgentClient {
  constructor(private readonly baseUrl = 'http://127.0.0.1:5173') {}

  async getSettings(): Promise<TuningSessionDto> { return this.request('', 'GET'); }

  async updateSettings(patch: TuningSettingsPatchDto): Promise<TuningSessionDto> {
    return this.request('', 'POST', patch);
  }

  async saveSettings(): Promise<TuningSessionDto> { return this.request('/save', 'POST'); }

  async resetSettings(): Promise<TuningSessionDto> { return this.request('/reset', 'POST'); }

  private async request(action: string, method: string, patch?: object): Promise<TuningSessionDto> {
    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${tuningEditorSettings.endpoint}${action}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        ...(patch ? { body: JSON.stringify(patch) } : {}),
        signal: AbortSignal.timeout(5000),
      });
    } catch (error) {
      throw new Error('Cannot reach Basement editor. Start npm run dev in the project.', { cause: error });
    }
    const result = await response.json();
    if (!response.ok) throw new Error(result.error);
    return result;
  }
}
