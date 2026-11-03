import { Ray, Vector3 } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { ICarryable } from '../contracts/ICarryable';
import type { ICrateInteractionController } from '../contracts/ICrateInteractionController';

export class CrateInteractionController implements ICrateInteractionController {
  private static readonly maximumPickupDistance = 1.4;
  private static readonly minimumForwardAlignment = 0.25;
  private static readonly visibilityDistanceTolerance = 0.03;
  private readonly direction = new Vector3();
  private readonly forward = new Vector3();
  private readonly ray = new Ray();
  private pickupCandidateValue: ICarryable | undefined;
  canPutDown = false;

  constructor(
    private readonly player: IPlayer,
    private readonly crates: readonly ICarryable[],
    private readonly world: ICollisionWorld,
  ) {}

  get pickupCandidate(): ICarryable | undefined {
    return this.pickupCandidateValue;
  }

  update(isInteractionPressed: boolean): void {
    this.updateAvailability();
    if (!isInteractionPressed) return;
    const hasInteracted = this.player.carriedObject
      ? this.canPutDown && this.player.tryPutDown()
      : Boolean(this.pickupCandidateValue && this.player.tryPickUp(this.pickupCandidateValue));
    if (hasInteracted) this.updateAvailability();
  }

  private updateAvailability(): void {
    const pickupCandidate = this.player.carriedObject ? undefined : this.findPickupCandidate();
    this.pickupCandidateValue = pickupCandidate && this.player.canPickUp(pickupCandidate) ? pickupCandidate : undefined;
    this.canPutDown = this.player.canPutDown();
  }

  private findPickupCandidate(): ICarryable | undefined {
    let closest: ICarryable | undefined;
    let closestDistance = CrateInteractionController.maximumPickupDistance;
    this.forward.set(Math.sin(this.player.object.rotation.y), 0, Math.cos(this.player.object.rotation.y));
    for (const crate of this.crates) {
      this.direction.subVectors(crate.collider.center, this.player.object.position);
      const distance = this.direction.length();
      if (distance > closestDistance) continue;
      const horizontalDistance = Math.hypot(this.direction.x, this.direction.z);
      if (this.forward.dot(this.direction) < horizontalDistance * CrateInteractionController.minimumForwardAlignment) continue;
      this.ray.set(this.player.object.position, this.direction.normalize());
      const obstacle = this.world.castRay(this.ray, crate.collider);
      if (obstacle && obstacle.distance < distance - CrateInteractionController.visibilityDistanceTolerance) continue;
      closest = crate;
      closestDistance = distance;
    }
    return closest;
  }
}
