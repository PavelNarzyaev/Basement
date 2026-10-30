import type { Box3, Object3D, Ray, Sphere } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import type { ICollision } from './ICollision';

export interface ICollisionWorld {
  readonly model: Object3D;
  readonly bounds: Box3;
  intersectCapsule(capsule: Capsule): ICollision | false;
  hasSphereCollision(sphere: Sphere): boolean;
  findRayDistance(ray: Ray): number | undefined;
  dispose(): void;
}
