import type { StartupSettingsDto } from '../../startup/contracts/StartupSettingsDto';

export interface IGameplaySession {
  start(settings: StartupSettingsDto): void;
  update(delta: number): void;
  restart(): void;
  dispose(): void;
}
