import type { ControlMode } from '../../input/contracts/ControlMode';

export class StartupSettingsDto {
  constructor(
    readonly controlMode: ControlMode,
    readonly shouldEnterFullscreen: boolean,
  ) {}
}
