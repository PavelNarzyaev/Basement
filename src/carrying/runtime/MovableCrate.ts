import { Box3, Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import type { ICarryable } from '../contracts/ICarryable';

export class MovableCrate implements ICarryable {
  readonly object = new Group();
  readonly collider: YawBoxDto;

  constructor(model: Object3D) {
    if (!model.parent) throw new Error('MovableCrate must belong to the scene.');
    const bounds = new Box3().setFromObject(model);
    this.collider = new YawBoxDto(bounds.getCenter(new Vector3()), bounds.getSize(new Vector3()).multiplyScalar(0.5));
    this.object.name = 'MovableCrateCarrier';
    this.object.position.copy(this.collider.center);
    model.parent.add(this.object);
    this.object.attach(model);
  }

  setPose(center: Vector3, rotationY: number): void {
    this.collider.center.copy(center);
    this.collider.rotationY = rotationY;
    this.object.position.copy(center);
    this.object.rotation.y = rotationY;
  }
}
