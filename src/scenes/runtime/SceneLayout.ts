import { Mesh, Quaternion, Vector3 } from 'three';
import type { Object3D } from 'three';
import { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import { CratePlacementDto } from '../contracts/CratePlacementDto';

export class SceneLayout {
  private static readonly upDirectionToleranceSquared = 0.000001;
  readonly playerSpawn: PlayerSpawnDto;
  readonly cratePlacements: readonly CratePlacementDto[];
  readonly cargoZone: YawBoxDto;

  constructor(model: Object3D) {
    model.updateWorldMatrix(true, true);
    const cargoZones: Object3D[] = [];
    const playerMarkers: Object3D[] = [];
    const crateMarkers: Object3D[] = [];
    model.traverse(object => {
      switch (object.userData.purpose) {
        case 'cargoZone': cargoZones.push(object); break;
        case 'playerSpawn': playerMarkers.push(object); break;
        case 'crateSpawn': crateMarkers.push(object); break;
      }
    });
    if (cargoZones.length !== 1) throw new Error(`Expected one cargoZone, found ${cargoZones.length}.`);
    if (playerMarkers.length !== 1) throw new Error(`Expected one playerSpawn, found ${playerMarkers.length}.`);
    if (crateMarkers.length === 0) throw new Error('Scene contains no crateSpawn markers.');
    const player = playerMarkers[0]!;
    this.playerSpawn = new PlayerSpawnDto(player.getWorldPosition(new Vector3()), this.getYaw(player));
    this.cratePlacements = crateMarkers.map(marker => new CratePlacementDto(
      marker.getWorldPosition(new Vector3()), this.getYaw(marker),
    ));
    const zone = cargoZones[0]!;
    if (!(zone instanceof Mesh)) throw new Error('cargoZone must be a box mesh.');
    if (zone.userData.collision !== false) throw new Error('cargoZone must have collision = false.');
    zone.geometry.computeBoundingBox();
    const bounds = zone.geometry.boundingBox!;
    const halfSize = bounds.getSize(new Vector3()).multiply(zone.getWorldScale(new Vector3())).multiplyScalar(0.5);
    if (Math.min(halfSize.x, halfSize.y, halfSize.z) <= 0) throw new Error('cargoZone must have positive dimensions and scale.');
    this.cargoZone = new YawBoxDto(
      bounds.getCenter(new Vector3()).applyMatrix4(zone.matrixWorld), halfSize, this.getYaw(zone),
    );
  }

  private getYaw(object: Object3D): number {
    const orientation = object.getWorldQuaternion(new Quaternion());
    const up = new Vector3(0, 1, 0).applyQuaternion(orientation);
    if (up.distanceToSquared(new Vector3(0, 1, 0)) > SceneLayout.upDirectionToleranceSquared) {
      throw new Error(`Gameplay marker ${object.name} must rotate only around the vertical axis.`);
    }
    const forward = new Vector3(0, 0, 1).applyQuaternion(orientation);
    return Math.atan2(forward.x, forward.z);
  }
}
