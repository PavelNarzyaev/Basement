import { TuningSettingsDto } from '../contracts/TuningSettingsDto.ts';
import { tuningLimits } from '../contracts/tuningLimits.ts';

export class TuningSettingsValidator {
  parseSettings(value: unknown): TuningSettingsDto {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new TypeError('Settings must be an object.');
    }
    const fields = Object.keys(value);
    if (fields.length !== 3 || !fields.every(key => ['unladenMovementSpeed', 'carryingMovementSpeed', 'lampColor'].includes(key))) {
      throw new TypeError('Expected only movement speeds and lampColor.');
    }
    const settings = value as Record<string, unknown>;
    const unladenSpeed = this.parseSpeed(settings.unladenMovementSpeed);
    const carryingSpeed = this.parseSpeed(settings.carryingMovementSpeed);
    if (typeof settings.lampColor !== 'string' || !/^#[\da-f]{6}$/i.test(settings.lampColor)) {
      throw new TypeError('Lamp color must use #RRGGBB.');
    }
    return new TuningSettingsDto(unladenSpeed, carryingSpeed, settings.lampColor.toLowerCase());
  }

  private parseSpeed(value: unknown): number {
    if (typeof value !== 'number' || !Number.isFinite(value)
      || value < tuningLimits.minimumMovementSpeed || value > tuningLimits.maximumMovementSpeed) {
      throw new RangeError(`Movement speed must be between ${tuningLimits.minimumMovementSpeed} and ${tuningLimits.maximumMovementSpeed} m/s.`);
    }
    return value;
  }
}
