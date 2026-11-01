import { Matrix4 } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';

export class CrateObjectiveProgress {
  private readonly crateBox = new OBB();
  private readonly zoneBox = new OBB();
  private readonly rotation = new Matrix4();

  constructor(private readonly crates: readonly ICarryable[], private readonly zone: OrientedBoxDto) {}

  get total(): number {
    return this.crates.length;
  }

  countPlaced(carriedCrate: ICarryable | undefined): number {
    this.copyBox(this.zone, this.zoneBox);
    return this.crates.filter(crate => crate !== carriedCrate && this.touchesZone(crate.collider)).length;
  }

  private touchesZone(box: OrientedBoxDto): boolean {
    this.copyBox(box, this.crateBox);
    return this.crateBox.intersectsOBB(this.zoneBox);
  }

  private copyBox(source: OrientedBoxDto, target: OBB): void {
    target.center.copy(source.center);
    target.halfSize.copy(source.halfSize);
    target.rotation.setFromMatrix4(this.rotation.makeRotationY(source.rotationY));
  }
}
