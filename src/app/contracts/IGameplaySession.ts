import type { StartupSettingsDto } from '../../startup/contracts/StartupSettingsDto';

export interface IGameplaySession {
  start(settings: StartupSettingsDto): void;
  update(deltaSeconds: number): void;
  restart(): void;
  dispose(): void;
}
