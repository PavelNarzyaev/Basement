import { Box3, Group, Mesh, Vector3 } from 'three';
import type { Object3D, Ray, Sphere, Triangle } from 'three';
import type { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';
import { CollisionDto } from '../contracts/CollisionDto';
import type { ICollisionWorld } from '../contracts/ICollisionWorld';
import type { YawBoxDto } from '../contracts/YawBoxDto';
import { RayHitDto } from '../contracts/RayHitDto';
import { YawBoxCollision } from './YawBoxCollision';

export class CollisionWorld implements ICollisionWorld {
  readonly bounds: Box3;
  private readonly octree: Octree;
  private readonly boxCollision = new YawBoxCollision();
  private readonly boxBounds = new Box3();
  private readonly triangles: Triangle[] = [];

  constructor(readonly model: Object3D, private readonly boxes: readonly YawBoxDto[] = []) {
    model.updateWorldMatrix(true, true);
    const collisionGeometry = new Group();
    this.collectCollisionMeshes(model, collisionGeometry);
    this.octree = new Octree().fromGraphNode(collisionGeometry);
    this.bounds = new Box3().setFromObject(model);
  }

  private collectCollisionMeshes(object: Object3D, target: Group): void {
    // Keep the named marker non-solid even in older exports without custom properties.
    if (object.userData.collision === false || object.name === 'TrolleyCargoZone') return;
    if (object instanceof Mesh) {
      const mesh = object.clone(false);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(object.matrixWorld);
      target.add(mesh);
    }
    for (const child of object.children) this.collectCollisionMeshes(child, target);
  }

  intersectCapsule(capsule: Capsule, ignoredBox?: YawBoxDto): CollisionDto | false {
    const collision = this.octree.capsuleIntersect(capsule);
    if (collision && collision.depth > 0.000001) return new CollisionDto(collision.normal, collision.depth);
    for (const box of this.boxes) {
      if (box === ignoredBox) continue;
      const boxCollision = this.boxCollision.intersectCapsule(capsule, box);
      if (boxCollision) return boxCollision;
    }
    return false;
  }

  hasBoxCollision(box: YawBoxDto, ignoredBox = box): boolean {
    this.boxCollision.getBounds(box, this.boxBounds);
    this.triangles.length = 0;
    this.octree.getBoxTriangles(this.boxBounds, this.triangles);
    for (const triangle of this.triangles) {
      if (this.boxCollision.intersectsTriangle(box, triangle)) return true;
    }
    return this.boxes.some((other) => other !== ignoredBox && this.boxCollision.intersectsBox(box, other));
  }

  castRay(ray: Ray, ignoredBox?: YawBoxDto): RayHitDto | undefined {
    const collision = this.octree.rayIntersect(ray);
    let closest = collision
      ? new RayHitDto(collision.position, collision.triangle.getNormal(new Vector3()), collision.distance)
      : undefined;
    for (const box of this.boxes) {
      if (box === ignoredBox) continue;
      const hit = this.boxCollision.intersectRay(ray, box);
      if (hit && (!closest || hit.distance < closest.distance)) closest = hit;
    }
    return closest;
  }

  hasSphereCollision(sphere: Sphere, ignoredBox?: YawBoxDto): boolean {
    return Boolean(this.octree.sphereIntersect(sphere))
      || this.boxes.some((box) => box !== ignoredBox && this.boxCollision.intersectsSphere(sphere, box));
  }

  findRayDistance(ray: Ray, ignoredBox?: YawBoxDto): number | undefined {
    return this.castRay(ray, ignoredBox)?.distance;
  }

  dispose(): void {
    this.octree.clear();
  }
}
