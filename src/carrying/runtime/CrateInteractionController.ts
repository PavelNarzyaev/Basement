import { Ray, Vector3 } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayer } from '../../player/contracts/IPlayer';
import type { ICarryable } from '../contracts/ICarryable';
import type { ICrateInteractionController } from '../contracts/ICrateInteractionController';

export class CrateInteractionController implements ICrateInteractionController {
  private readonly direction = new Vector3();
  private readonly forward = new Vector3();
  private readonly ray = new Ray();
  private selectedCrate: ICarryable | undefined;
  canPutDown = false;

  constructor(
    private readonly player: IPlayer,
    private readonly crates: readonly ICarryable[],
    private readonly world: ICollisionWorld,
  ) {}

  get candidate(): ICarryable | undefined {
    return this.selectedCrate;
  }

  update(isInteractionPressed: boolean): void {
    this.updateAvailability();
    if (!isInteractionPressed) return;
    const hasInteracted = this.player.carriedObject
      ? this.canPutDown && this.player.tryPutDown()
      : Boolean(this.selectedCrate && this.player.tryPickUp(this.selectedCrate));
    if (hasInteracted) this.updateAvailability();
  }

  private updateAvailability(): void {
    const candidate = this.player.carriedObject ? undefined : this.findCandidate();
    this.selectedCrate = candidate && this.player.canPickUp(candidate) ? candidate : undefined;
    this.canPutDown = this.player.canPutDown();
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
