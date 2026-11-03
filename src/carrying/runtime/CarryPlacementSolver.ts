import { Ray, Vector3 } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { ICarryable } from '../contracts/ICarryable';
import type { ICarryCollisionValidator } from '../contracts/ICarryCollisionValidator';
import type { ICarryPlacementSolver } from '../contracts/ICarryPlacementSolver';
import { carryPlacementSettings } from '../contracts/carryPlacementSettings';

export class CarryPlacementSolver implements ICarryPlacementSolver {
  private readonly up = new Vector3(0, 1, 0);
  private readonly ray = new Ray(new Vector3(), new Vector3(0, -1, 0));
  private readonly supportRayOffsets = [
    { x: 0, z: 0 },
    { x: -1, z: -1 },
    { x: -1, z: 1 },
    { x: 1, z: -1 },
    { x: 1, z: 1 },
  ] as const;

  constructor(
    private readonly world: ICollisionWorld,
    private readonly carryCollision: ICarryCollisionValidator,
  ) {}

  findSupportedPlacement(crate: ICarryable): Vector3 | undefined {
    const crateCollider = crate.collider;
    const rayHeight = crateCollider.center.y - crateCollider.halfSize.y + carryPlacementSettings.supportRayStartOffset;
    let minimumHeight = Infinity;
    let maximumHeight = -Infinity;
    for (const offset of this.supportRayOffsets) {
      this.ray.origin.set(offset.x * crateCollider.halfSize.x, 0, offset.z * crateCollider.halfSize.z)
        .applyAxisAngle(this.up, crateCollider.rotationY).add(crateCollider.center);
      this.ray.origin.y = rayHeight;
      const hit = this.world.castRay(this.ray, crateCollider);
      if (!hit || hit.distance > carryPlacementSettings.maximumSupportDistance || hit.normal.y < carryPlacementSettings.minimumSupportNormalY) return undefined;
      minimumHeight = Math.min(minimumHeight, hit.position.y);
      maximumHeight = Math.max(maximumHeight, hit.position.y);
    }
    // Require support across the footprint, so a trolley rim cannot balance the crate in midair.
    if (maximumHeight - minimumHeight > carryPlacementSettings.maximumSupportHeightDifference) return undefined;
    const center = crateCollider.center.clone();
    center.y = maximumHeight + crateCollider.halfSize.y + carryPlacementSettings.placementGap;
    return this.carryCollision.canOccupyPose(crate, center, crateCollider.rotationY) ? center : undefined;
  }
}
