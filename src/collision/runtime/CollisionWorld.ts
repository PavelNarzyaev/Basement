import { Box3 } from 'three';
import type { Object3D, Ray, Sphere } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';
import { CollisionDto } from '../contracts/CollisionDto';
import type { ICollisionWorld } from '../contracts/ICollisionWorld';

export class CollisionWorld implements ICollisionWorld {
  readonly bounds: Box3;
  private readonly octree: Octree;

  constructor(readonly model: Object3D) {
    this.octree = new Octree().fromGraphNode(model);
    this.bounds = new Box3().setFromObject(model);
  }

  intersectCapsule(capsule: Capsule): CollisionDto | false {
    const collision = this.octree.capsuleIntersect(capsule);
    return collision ? new CollisionDto(collision.normal, collision.depth) : false;
  }

  hasSphereCollision(sphere: Sphere): boolean {
    return Boolean(this.octree.sphereIntersect(sphere));
  }

  findRayDistance(ray: Ray): number | undefined {
    const collision = this.octree.rayIntersect(ray);
    return collision ? collision.distance : undefined;
  }

  dispose(): void {
    this.octree.clear();
  }
}
