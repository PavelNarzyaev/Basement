import { Ray, Vector3 } from 'three';
import { playerSettings } from '../../player/contracts/playerSettings';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IYawBoxCollision } from '../../collision/contracts/IYawBoxCollision';
import { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import type { ICarryable } from '../contracts/ICarryable';
import type { ICarryPlacementSolver } from '../contracts/ICarryPlacementSolver';
import { carryPlacementSettings } from '../contracts/carryPlacementSettings';

export class CarryPlacementSolver implements ICarryPlacementSolver {
  private readonly up = new Vector3(0, 1, 0);
  private readonly trialBox = new YawBoxDto(new Vector3(), new Vector3());
  private readonly ray = new Ray(new Vector3(), new Vector3(0, -1, 0));
  private readonly supportSamples = [
    [0, 0],
    [-carryPlacementSettings.supportSampleExtent, -carryPlacementSettings.supportSampleExtent],
    [-carryPlacementSettings.supportSampleExtent, carryPlacementSettings.supportSampleExtent],
    [carryPlacementSettings.supportSampleExtent, -carryPlacementSettings.supportSampleExtent],
    [carryPlacementSettings.supportSampleExtent, carryPlacementSettings.supportSampleExtent],
  ] as const;

  constructor(private readonly world: ICollisionWorld, private readonly boxCollision: IYawBoxCollision) {}

  getHoldingCenter(playerCenter: Vector3, rotationY: number, crate: ICarryable, target: Vector3): Vector3 {
    return target.set(0, carryPlacementSettings.holdingHeight, playerSettings.colliderRadius + crate.collider.halfSize.z + carryPlacementSettings.holdingGap)
      .applyAxisAngle(this.up, rotationY).add(playerCenter);
  }

  canOccupyPose(crate: ICarryable, target: Vector3, rotationY: number): boolean {
    this.trialBox.center.copy(target);
    this.trialBox.halfSize.copy(crate.collider.halfSize);
    this.trialBox.rotationY = rotationY;
    return !this.world.hasBoxCollision(this.trialBox, crate.collider);
  }

  canSweepToPose(crate: ICarryable, target: Vector3, rotationY: number): boolean {
    const box = crate.collider;
    const angle = Math.atan2(Math.sin(rotationY - box.rotationY), Math.cos(rotationY - box.rotationY));
    const travel = box.center.distanceTo(target) + Math.abs(angle) * box.halfSize.length();
    const steps = Math.max(1, Math.ceil(travel / carryPlacementSettings.sweepStep));
    this.trialBox.halfSize.copy(box.halfSize);
    for (let step = 1; step <= steps; step++) {
      this.trialBox.center.lerpVectors(box.center, target, step / steps);
      this.trialBox.rotationY = box.rotationY + angle * step / steps;
      if (this.world.hasBoxCollision(this.trialBox, box)) return false;
    }
    return true;
  }

  findSupportedPlacement(crate: ICarryable, playerCollider: Capsule): Vector3 | undefined {
    const box = crate.collider;
    const rayHeight = box.center.y - box.halfSize.y + carryPlacementSettings.supportRayStartOffset;
    let minimumHeight = Infinity;
    let maximumHeight = -Infinity;
    for (const [x, z] of this.supportSamples) {
      this.ray.origin.set(x * box.halfSize.x, 0, z * box.halfSize.z)
        .applyAxisAngle(this.up, box.rotationY).add(box.center);
      this.ray.origin.y = rayHeight;
      const hit = this.world.castRay(this.ray, box);
      if (!hit || hit.distance > carryPlacementSettings.maximumSupportDistance || hit.normal.y < carryPlacementSettings.minimumSupportNormalY) return undefined;
      minimumHeight = Math.min(minimumHeight, hit.position.y);
      maximumHeight = Math.max(maximumHeight, hit.position.y);
    }
    // Require support across the footprint, so a trolley rim cannot balance the crate in midair.
    if (maximumHeight - minimumHeight > carryPlacementSettings.maximumSupportHeightDifference) return undefined;
    const center = box.center.clone();
    center.y = maximumHeight + box.halfSize.y + carryPlacementSettings.placementGap;
    this.trialBox.center.copy(center);
    this.trialBox.halfSize.copy(box.halfSize);
    this.trialBox.rotationY = box.rotationY;
    if (this.boxCollision.intersectCapsule(playerCollider, this.trialBox)) return undefined;
    return this.canOccupyPose(crate, center, box.rotationY) ? center : undefined;
  }
}
