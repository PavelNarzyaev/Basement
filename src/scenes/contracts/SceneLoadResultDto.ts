import type { Object3D } from 'three';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import type { CrateSpawnDto } from './CrateSpawnDto';

export class SceneLoadResultDto {
  constructor(
    readonly staticModel: Object3D,
    readonly playerSpawn: PlayerSpawnDto,
    readonly movableCrates: readonly CrateSpawnDto[],
    readonly trolleyCargoZone: YawBoxDto,
  ) {}
}
