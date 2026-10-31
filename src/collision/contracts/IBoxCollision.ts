import type { Capsule } from 'three/addons/math/Capsule.js';
import type { CollisionDto } from './CollisionDto';
import type { OrientedBoxDto } from './OrientedBoxDto';

export interface IBoxCollision {
  intersectCapsule(capsule: Capsule, box: OrientedBoxDto): CollisionDto | false;
}
