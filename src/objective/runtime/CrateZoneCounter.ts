import { Matrix4 } from 'three';
import { OBB } from 'three/addons/math/OBB.js';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';

export class CrateZoneCounter {
  private readonly crateBox = new OBB();
  private readonly zoneBox = new OBB();
  private readonly rotation = new Matrix4();

  constructor(private readonly crates: readonly ICarryable[], private readonly zone: YawBoxDto) {}

  get total(): number {
    return this.crates.length;
  }

  countPlaced(carriedCrate: ICarryable | undefined): number {
    this.copyBox(this.zone, this.zoneBox);
    return this.crates.filter(crate => crate !== carriedCrate && this.touchesZone(crate.collider)).length;
  }

  private touchesZone(box: YawBoxDto): boolean {
    this.copyBox(box, this.crateBox);
    return this.crateBox.intersectsOBB(this.zoneBox);
  }

  private copyBox(source: YawBoxDto, target: OBB): void {
    target.center.copy(source.center);
    target.halfSize.copy(source.halfSize);
    target.rotation.setFromMatrix4(this.rotation.makeRotationY(source.rotationY));
  }
}
