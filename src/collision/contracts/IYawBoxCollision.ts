import type { Capsule } from 'three/addons/math/Capsule.js';
import type { CollisionDto } from './CollisionDto';
import type { YawBoxDto } from './YawBoxDto';

export interface IYawBoxCollision {
  intersectCapsule(capsule: Capsule, box: YawBoxDto): CollisionDto | false;
}
