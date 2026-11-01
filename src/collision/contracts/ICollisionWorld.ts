import type { Box3, Object3D, Ray, Sphere } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { CollisionDto } from './CollisionDto';
import type { YawBoxDto } from './YawBoxDto';
import type { RayHitDto } from './RayHitDto';

export interface ICollisionWorld {
  readonly model: Object3D;
  readonly bounds: Box3;
  intersectCapsule(capsule: Capsule, ignoredBox?: YawBoxDto): CollisionDto | false;
  hasBoxCollision(box: YawBoxDto, ignoredBox?: YawBoxDto): boolean;
  castRay(ray: Ray, ignoredBox?: YawBoxDto): RayHitDto | undefined;
  hasSphereCollision(sphere: Sphere, ignoredBox?: YawBoxDto): boolean;
  findRayDistance(ray: Ray, ignoredBox?: YawBoxDto): number | undefined;
  dispose(): void;
}
