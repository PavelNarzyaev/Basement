import type { ITuningEditorSettings } from './ITuningEditorSettings.ts';

export const tuningEditorSettings: ITuningEditorSettings = {
  endpoint: '/__editor/settings',
  updateEvent: 'basement:tuning',
  maximumRequestBytes: 4096,
};
