import { Box3, Ray, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { ICollisionWorldFactory } from '../../collision/contracts/ICollisionWorldFactory';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';

export class CrateScatterer {
  private readonly ray = new Ray(new Vector3(), new Vector3(0, -1, 0));

  constructor(private readonly worldFactory: ICollisionWorldFactory, private readonly random = Math.random) {}

  scatter(model: Object3D, template: Object3D, spawn: PlayerSpawnDto, count: number): Object3D[] {
    const boxes: OrientedBoxDto[] = [];
    const world = this.worldFactory.create(model, boxes);
    try {
      const bounds = new Box3().setFromObject(template);
      const halfSize = bounds.getSize(new Vector3()).multiplyScalar(0.5);
      const templateCenter = bounds.getCenter(new Vector3());
      const crates: Object3D[] = [];
      for (let attempt = 0; attempt < 2000 && crates.length < count; attempt++) {
        const center = new Vector3(
          world.bounds.min.x + halfSize.x + this.random() * (world.bounds.max.x - world.bounds.min.x - 2 * halfSize.x),
          spawn.position.y,
          world.bounds.min.z + halfSize.z + this.random() * (world.bounds.max.z - world.bounds.min.z - 2 * halfSize.z),
        );
        if (Math.hypot(center.x - spawn.position.x, center.z - spawn.position.z) < 1.5) continue;
        const floorHeight = this.findFloorHeight(world, center, halfSize);
        if (floorHeight === undefined) continue;
        center.y = floorHeight + halfSize.y + 0.005;
        const box = new OrientedBoxDto(center, halfSize.clone());
        if (world.hasBoxCollision(box)) continue;
        boxes.push(box);
        const crate = template.clone(true);
        crate.name = `MovableCrate_${crates.length + 1}`;
        crate.position.add(center).sub(templateCenter);
        crates.push(crate);
      }
      if (crates.length !== count) throw new Error(`Could only place ${crates.length} of ${count} crates on the basement floor.`);
      return crates;
    } finally {
      world.dispose();
    }
  }

  private findFloorHeight(world: ICollisionWorld, center: Vector3, halfSize: Vector3): number | undefined {
    let minimumHeight = Infinity;
    let maximumHeight = -Infinity;
    for (const [x, z] of [[0, 0], [-1, -1], [-1, 1], [1, -1], [1, 1]] as const) {
      // Cast from just above the floor to exclude shelves, trolleys and other raised surfaces.
      this.ray.origin.set(center.x + x * halfSize.x, center.y + 0.1, center.z + z * halfSize.z);
      const hit = world.castRay(this.ray);
      if (!hit || hit.distance > 0.3 || hit.normal.y < 0.95) return undefined;
      minimumHeight = Math.min(minimumHeight, hit.position.y);
      maximumHeight = Math.max(maximumHeight, hit.position.y);
    }
    return maximumHeight - minimumHeight <= 0.04 ? maximumHeight : undefined;
  }
}
