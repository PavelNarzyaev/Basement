import type { Box3, Object3D, Ray, Sphere } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { CollisionDto } from './CollisionDto';

export interface ICollisionWorld {
  readonly model: Object3D;
  readonly bounds: Box3;
  intersectCapsule(capsule: Capsule): CollisionDto | false;
  hasSphereCollision(sphere: Sphere): boolean;
  findRayDistance(ray: Ray): number | undefined;
  dispose(): void;
}
