import type { Box3, Object3D, Ray, Sphere } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { CollisionDto } from './CollisionDto';
import type { OrientedBoxDto } from './OrientedBoxDto';
import type { RayHitDto } from './RayHitDto';

export interface ICollisionWorld {
  readonly model: Object3D;
  readonly bounds: Box3;
  intersectCapsule(capsule: Capsule, ignoredBox?: OrientedBoxDto): CollisionDto | false;
  hasBoxCollision(box: OrientedBoxDto, ignoredBox?: OrientedBoxDto): boolean;
  castRay(ray: Ray, ignoredBox?: OrientedBoxDto): RayHitDto | undefined;
  hasSphereCollision(sphere: Sphere, ignoredBox?: OrientedBoxDto): boolean;
  findRayDistance(ray: Ray, ignoredBox?: OrientedBoxDto): number | undefined;
  dispose(): void;
}
