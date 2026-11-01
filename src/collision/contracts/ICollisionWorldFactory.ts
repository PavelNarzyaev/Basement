import type { Object3D } from 'three';
import type { ICollisionWorld } from './ICollisionWorld';
import type { YawBoxDto } from './YawBoxDto';

export interface ICollisionWorldFactory {
  create(model: Object3D, boxes: readonly YawBoxDto[]): ICollisionWorld;
}
