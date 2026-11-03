import { MathUtils, Ray, Sphere, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import type { ICameraController } from '../contracts/ICameraController';
import { thirdPersonCameraSettings } from '../contracts/thirdPersonCameraSettings';

export class ThirdPersonCameraController implements ICameraController {
  private readonly target = new Vector3();
  private readonly direction = new Vector3();
  private readonly ray = new Ray();
  private readonly sphere = new Sphere(new Vector3(), thirdPersonCameraSettings.collisionRadius);
  private horizontalAngle: number;
  private pitch = thirdPersonCameraSettings.initialPitchRadians;

  constructor(private readonly camera: PerspectiveCamera, private readonly world: ICollisionWorld, initialYaw = 0) {
    this.horizontalAngle = initialYaw;
  }

  get yaw(): number {
    return this.horizontalAngle;
  }

  addPitchDelta(pitchDeltaRadians: number): void {
    this.pitch = MathUtils.clamp(this.pitch + pitchDeltaRadians, thirdPersonCameraSettings.minimumPitchRadians, thirdPersonCameraSettings.maximumPitchRadians);
  }

  update(target: Vector3, yaw: number, ignoredBox?: YawBoxDto): void {
    this.horizontalAngle = yaw;
    this.target.copy(target);
    this.target.y += thirdPersonCameraSettings.targetHeightOffset;
    this.direction.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.ray.set(this.target, this.direction);
    const hitDistance = this.world.findRayDistance(this.ray, ignoredBox);
    let distance = hitDistance === undefined ? thirdPersonCameraSettings.followDistance : Math.min(thirdPersonCameraSettings.followDistance, Math.max(0, hitDistance - thirdPersonCameraSettings.wallClearance));
    // Sweep the camera volume from the target to avoid clipping near-plane corners.
    for (let sample = thirdPersonCameraSettings.collisionSampleStep; sample <= distance; sample += thirdPersonCameraSettings.collisionSampleStep) {
      this.sphere.center.copy(this.target).addScaledVector(this.direction, sample);
      if (this.world.hasSphereCollision(this.sphere, ignoredBox)) {
        distance = Math.max(0, sample - thirdPersonCameraSettings.collisionSampleStep);
        break;
      }
    }
    this.camera.position.copy(this.target).addScaledVector(this.direction, Math.max(thirdPersonCameraSettings.minimumTargetDistance, distance));
    this.camera.lookAt(this.target);
  }
}
