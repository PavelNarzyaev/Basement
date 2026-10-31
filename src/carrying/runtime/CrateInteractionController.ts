import { Ray, Vector3 } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { ICarryable } from '../contracts/ICarryable';

export class CrateInteractionController {
  private readonly direction = new Vector3();
  private readonly forward = new Vector3();
  private readonly ray = new Ray();
  private selectedCrate: ICarryable | undefined;
  private feedbackDuration = 0;

  constructor(
    private readonly player: IPlayer,
    private readonly crates: readonly ICarryable[],
    private readonly world: ICollisionWorld,
  ) {}

  get candidate(): ICarryable | undefined {
    return this.selectedCrate;
  }

  get hasBlockedInteraction(): boolean {
    return this.feedbackDuration > 0;
  }

  update(delta: number, isInteractionPressed: boolean): void {
    this.feedbackDuration = Math.max(0, this.feedbackDuration - delta);
    this.selectedCrate = this.player.carriedObject ? undefined : this.findCandidate();
    if (!isInteractionPressed) return;
    if (this.player.carriedObject) {
      this.feedbackDuration = this.player.tryPutDown() ? 0 : 1.5;
    } else if (this.selectedCrate) {
      this.feedbackDuration = this.player.tryPickUp(this.selectedCrate) ? 0 : 1.5;
      if (this.player.carriedObject) this.selectedCrate = undefined;
    }
  }

  private findCandidate(): ICarryable | undefined {
    let closest: ICarryable | undefined;
    let closestDistance = 1.4;
    this.forward.set(Math.sin(this.player.object.rotation.y), 0, Math.cos(this.player.object.rotation.y));
    for (const crate of this.crates) {
      this.direction.subVectors(crate.collider.center, this.player.object.position);
      const distance = this.direction.length();
      if (distance > closestDistance) continue;
      const horizontalDistance = Math.hypot(this.direction.x, this.direction.z);
      if (this.forward.dot(this.direction) < horizontalDistance * 0.25) continue;
      this.ray.set(this.player.object.position, this.direction.normalize());
      const obstacle = this.world.castRay(this.ray, crate.collider);
      if (obstacle && obstacle.distance < distance - 0.03) continue;
      closest = crate;
      closestDistance = distance;
    }
    return closest;
  }
}
