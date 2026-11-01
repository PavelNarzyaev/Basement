import type { Object3D } from 'three';
import type { ICollisionWorld } from './ICollisionWorld';
import type { OrientedBoxDto } from './OrientedBoxDto';

export interface ICollisionWorldFactory {
  create(model: Object3D, boxes: readonly OrientedBoxDto[]): ICollisionWorld;
}
