import { Ray, Vector3 } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IBoxCollision } from '../../collision/contracts/IBoxCollision';
import { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import type { ICarryable } from '../contracts/ICarryable';
import type { ICarryPlacement } from '../contracts/ICarryPlacement';

export class CarryPlacement implements ICarryPlacement {
  private static readonly sweepStep = 0.03;
  private static readonly holdingHeight = 0.3;
  private readonly up = new Vector3(0, 1, 0);
  private readonly trialBox = new OrientedBoxDto(new Vector3(), new Vector3());
  private readonly ray = new Ray(new Vector3(), new Vector3(0, -1, 0));
  private readonly supportSamples = [[0, 0], [-0.9, -0.9], [-0.9, 0.9], [0.9, -0.9], [0.9, 0.9]] as const;

  constructor(private readonly world: ICollisionWorld, private readonly boxCollision: IBoxCollision) {}

  getHoldingCenter(playerCenter: Vector3, rotationY: number, crate: ICarryable, target: Vector3): Vector3 {
    return target.set(0, CarryPlacement.holdingHeight, 0.43 + crate.collider.halfSize.z + 0.08)
      .applyAxisAngle(this.up, rotationY).add(playerCenter);
  }

  canMove(crate: ICarryable, target: Vector3, rotationY: number): boolean {
    const box = crate.collider;
    const angle = Math.atan2(Math.sin(rotationY - box.rotationY), Math.cos(rotationY - box.rotationY));
    const travel = box.center.distanceTo(target) + Math.abs(angle) * box.halfSize.length();
    const steps = Math.max(1, Math.ceil(travel / CarryPlacement.sweepStep));
    this.trialBox.halfSize.copy(box.halfSize);
    for (let step = 1; step <= steps; step++) {
      this.trialBox.center.lerpVectors(box.center, target, step / steps);
      this.trialBox.rotationY = box.rotationY + angle * step / steps;
      if (this.world.hasBoxCollision(this.trialBox, box)) return false;
    }
    return true;
  }

  findPlacement(crate: ICarryable, playerCollider: Capsule): Vector3 | undefined {
    const box = crate.collider;
    const rayHeight = box.center.y - box.halfSize.y + 0.12;
    let minimumHeight = Infinity;
    let maximumHeight = -Infinity;
    for (const [x, z] of this.supportSamples) {
      this.ray.origin.set(x * box.halfSize.x, 0, z * box.halfSize.z)
        .applyAxisAngle(this.up, box.rotationY).add(box.center);
      this.ray.origin.y = rayHeight;
      const hit = this.world.castRay(this.ray, box);
      if (!hit || hit.distance > 1.5 || hit.normal.y < 0.95) return undefined;
      minimumHeight = Math.min(minimumHeight, hit.position.y);
      maximumHeight = Math.max(maximumHeight, hit.position.y);
    }
    // Require support across the footprint, so a trolley rim cannot balance the crate in midair.
    if (maximumHeight - minimumHeight > 0.04) return undefined;
    const center = box.center.clone();
    center.y = maximumHeight + box.halfSize.y + 0.005;
    this.trialBox.center.copy(center);
    this.trialBox.halfSize.copy(box.halfSize);
    this.trialBox.rotationY = box.rotationY;
    if (this.boxCollision.intersectCapsule(playerCollider, this.trialBox)) return undefined;
    return this.canMove(crate, center, box.rotationY) ? center : undefined;
  }
}
