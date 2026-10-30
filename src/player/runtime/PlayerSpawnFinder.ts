import { Raycaster, Vector3 } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';

export class PlayerSpawnFinder {
  find(world: ICollisionWorld, collider: Capsule): Vector3 {
    const candidateCollider = collider.clone();
    const raycaster = new Raycaster();
    const center = world.bounds.getCenter(new Vector3());
    const spawn = new Vector3();
    const height = collider.start.distanceTo(collider.end);
    // Search near floor level so the ceiling cannot become the spawn surface.
    for (let ring = 0; ring < 24; ring++) {
      for (let x = -ring; x <= ring; x++) {
        for (let z = -ring; z <= ring; z++) {
          if (Math.max(Math.abs(x), Math.abs(z)) !== ring) continue;
          raycaster.set(new Vector3(center.x + x * 0.5, world.bounds.min.y + 1.5, center.z + z * 0.5), new Vector3(0, -1, 0));
          const hits = raycaster.intersectObject(world.model, true);
          for (const hit of hits) {
            if (!hit.face || hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y < 0.7) continue;
            spawn.copy(hit.point);
            spawn.y += 0.02;
            candidateCollider.start.copy(spawn);
            candidateCollider.start.y += collider.radius;
            candidateCollider.end.copy(candidateCollider.start);
            candidateCollider.end.y += height;
            if (!world.intersectCapsule(candidateCollider)) return spawn;
          }
        }
      }
    }
    throw new Error('No clear floor position for the player was found.');
  }
}
