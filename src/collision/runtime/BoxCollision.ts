import { Box3, Matrix4, Ray, Triangle, Vector3 } from 'three';
import type { Sphere } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import { OBB } from 'three/addons/math/OBB.js';
import type { IBoxCollision } from '../contracts/IBoxCollision';
import type { OrientedBoxDto } from '../contracts/OrientedBoxDto';
import { CollisionDto } from '../contracts/CollisionDto';
import { RayHitDto } from '../contracts/RayHitDto';

export class BoxCollision implements IBoxCollision {
  private readonly up = new Vector3(0, 1, 0);
  private readonly localBox = new Box3();
  private readonly localTriangle = new Triangle();
  private readonly localRay = new Ray();
  private readonly point = new Vector3();
  private readonly closest = new Vector3();
  private readonly firstBox = new OBB();
  private readonly secondBox = new OBB();
  private readonly rotation = new Matrix4();

  intersectsBox(first: OrientedBoxDto, second: OrientedBoxDto): boolean {
    this.firstBox.center.copy(first.center);
    this.firstBox.halfSize.copy(first.halfSize).addScalar(-0.00001);
    this.firstBox.rotation.setFromMatrix4(this.rotation.makeRotationY(first.rotationY));
    this.secondBox.center.copy(second.center);
    this.secondBox.halfSize.copy(second.halfSize);
    this.secondBox.rotation.setFromMatrix4(this.rotation.makeRotationY(second.rotationY));
    return this.firstBox.intersectsOBB(this.secondBox);
  }

  getBounds(box: OrientedBoxDto, target: Box3): Box3 {
    const cosine = Math.abs(Math.cos(box.rotationY));
    const sine = Math.abs(Math.sin(box.rotationY));
    this.point.set(
      cosine * box.halfSize.x + sine * box.halfSize.z,
      box.halfSize.y,
      sine * box.halfSize.x + cosine * box.halfSize.z,
    );
    target.min.copy(box.center).sub(this.point);
    target.max.copy(box.center).add(this.point);
    return target;
  }

  intersectsTriangle(box: OrientedBoxDto, triangle: Triangle): boolean {
    this.setLocalBox(box, 0.00001);
    this.toLocal(triangle.a, box, this.localTriangle.a);
    this.toLocal(triangle.b, box, this.localTriangle.b);
    this.toLocal(triangle.c, box, this.localTriangle.c);
    return this.localBox.intersectsTriangle(this.localTriangle);
  }

  intersectCapsule(capsule: Capsule, box: OrientedBoxDto): CollisionDto | false {
    // Player capsules are vertical; yaw leaves the segment vertical in box space.
    this.setLocalBox(box);
    this.toLocal(capsule.start, box, this.point);
    const top = capsule.end.y - box.center.y;
    this.point.y = Math.max(this.point.y, Math.min(top, 0));
    this.localBox.clampPoint(this.point, this.closest);
    this.point.sub(this.closest);
    const distance = this.point.length();
    if (distance >= capsule.radius) return false;
    let depth = capsule.radius - distance;
    if (distance > 0.000001) {
      this.point.divideScalar(distance);
    } else {
      const startHeight = capsule.start.y - box.center.y;
      const exits = [
        box.halfSize.x - this.closest.x, box.halfSize.x + this.closest.x,
        box.halfSize.y - startHeight, box.halfSize.y + top,
        box.halfSize.z - this.closest.z, box.halfSize.z + this.closest.z,
      ];
      const minimum = Math.min(...exits);
      const axis = exits.indexOf(minimum);
      this.point.set(0, 0, 0).setComponent(Math.floor(axis / 2), axis % 2 === 0 ? 1 : -1);
      depth += minimum;
    }
    return new CollisionDto(this.point.clone().applyAxisAngle(this.up, box.rotationY), depth);
  }

  intersectsSphere(sphere: Sphere, box: OrientedBoxDto): boolean {
    this.setLocalBox(box);
    this.toLocal(sphere.center, box, this.point);
    return this.localBox.distanceToPoint(this.point) < sphere.radius;
  }

  intersectRay(ray: Ray, box: OrientedBoxDto): RayHitDto | undefined {
    this.setLocalBox(box);
    this.toLocal(ray.origin, box, this.localRay.origin);
    this.localRay.direction.copy(ray.direction).applyAxisAngle(this.up, -box.rotationY);
    if (!this.localRay.intersectBox(this.localBox, this.point)) return undefined;
    const normal = new Vector3();
    const distances = [
      Math.abs(Math.abs(this.point.x) - box.halfSize.x),
      Math.abs(Math.abs(this.point.y) - box.halfSize.y),
      Math.abs(Math.abs(this.point.z) - box.halfSize.z),
    ];
    const axis = distances.indexOf(Math.min(...distances));
    normal.setComponent(axis, Math.sign(this.point.getComponent(axis)));
    const position = this.point.clone().applyAxisAngle(this.up, box.rotationY).add(box.center);
    return new RayHitDto(position, normal.applyAxisAngle(this.up, box.rotationY), position.distanceTo(ray.origin));
  }

  private setLocalBox(box: OrientedBoxDto, inset = 0): void {
    this.localBox.min.copy(box.halfSize).negate().addScalar(inset);
    this.localBox.max.copy(box.halfSize).addScalar(-inset);
  }

  private toLocal(point: Vector3, box: OrientedBoxDto, target: Vector3): Vector3 {
    return target.copy(point).sub(box.center).applyAxisAngle(this.up, -box.rotationY);
  }
}
