import { MathUtils, Ray, Sphere, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { ICameraController } from '../contracts/ICameraController';

export class ThirdPersonCameraController implements ICameraController {
  private readonly target = new Vector3();
  private readonly direction = new Vector3();
  private readonly ray = new Ray();
  private readonly sphere = new Sphere(new Vector3(), 0.18);
  private horizontalAngle: number;
  private pitch = 0.25;

  constructor(private readonly camera: PerspectiveCamera, private readonly world: ICollisionWorld, initialYaw = 0) {
    this.horizontalAngle = initialYaw;
  }

  get yaw(): number {
    return this.horizontalAngle;
  }

  rotate(horizontal: number, vertical: number): void {
    this.horizontalAngle -= horizontal;
    this.pitch = MathUtils.clamp(this.pitch + vertical, -0.35, 1.15);
  }

  update(target: Vector3): void {
    this.target.copy(target);
    this.target.y += 0.35;
    this.direction.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.ray.set(this.target, this.direction);
    const hitDistance = this.world.findRayDistance(this.ray);
    let distance = hitDistance === undefined ? 3 : Math.min(3, Math.max(0, hitDistance - 0.2));
    // Sweep the camera volume from the target to avoid clipping near-plane corners.
    for (let sample = 0.05; sample <= distance; sample += 0.05) {
      this.sphere.center.copy(this.target).addScaledVector(this.direction, sample);
      if (this.world.hasSphereCollision(this.sphere)) {
        distance = Math.max(0, sample - 0.05);
        break;
      }
    }
    this.camera.position.copy(this.target).addScaledVector(this.direction, Math.max(0.01, distance));
    this.camera.lookAt(this.target);
  }
}
