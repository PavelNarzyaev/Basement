import { MathUtils, Ray, Sphere, Vector3 } from 'three';
import type { PerspectiveCamera } from 'three';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import type { ICameraController } from '../contracts/ICameraController';

export class ThirdPersonCameraController implements ICameraController {
  private static readonly collisionRadius = 0.18;
  private static readonly initialPitchRadians = 0.25;
  private static readonly minimumPitchRadians = -0.35;
  private static readonly maximumPitchRadians = 1.15;
  private static readonly targetHeightOffset = 0.35;
  private static readonly followDistance = 3;
  private static readonly wallClearance = 0.2;
  private static readonly collisionSampleStep = 0.05;
  private static readonly minimumTargetDistance = 0.01;
  private readonly target = new Vector3();
  private readonly direction = new Vector3();
  private readonly ray = new Ray();
  private readonly sphere = new Sphere(new Vector3(), ThirdPersonCameraController.collisionRadius);
  private horizontalAngle: number;
  private pitch = ThirdPersonCameraController.initialPitchRadians;

  constructor(private readonly camera: PerspectiveCamera, private readonly world: ICollisionWorld, initialYaw = 0) {
    this.horizontalAngle = initialYaw;
  }

  get yaw(): number {
    return this.horizontalAngle;
  }

  addPitchDelta(pitchDeltaRadians: number): void {
    this.pitch = MathUtils.clamp(this.pitch + pitchDeltaRadians, ThirdPersonCameraController.minimumPitchRadians, ThirdPersonCameraController.maximumPitchRadians);
  }

  update(target: Vector3, yaw: number, ignoredBox?: YawBoxDto): void {
    this.horizontalAngle = yaw;
    this.target.copy(target);
    this.target.y += ThirdPersonCameraController.targetHeightOffset;
    this.direction.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.ray.set(this.target, this.direction);
    const hitDistance = this.world.findRayDistance(this.ray, ignoredBox);
    let distance = hitDistance === undefined ? ThirdPersonCameraController.followDistance : Math.min(ThirdPersonCameraController.followDistance, Math.max(0, hitDistance - ThirdPersonCameraController.wallClearance));
    // Sweep the camera volume from the target to avoid clipping near-plane corners.
    for (let sample = ThirdPersonCameraController.collisionSampleStep; sample <= distance; sample += ThirdPersonCameraController.collisionSampleStep) {
      this.sphere.center.copy(this.target).addScaledVector(this.direction, sample);
      if (this.world.hasSphereCollision(this.sphere, ignoredBox)) {
        distance = Math.max(0, sample - ThirdPersonCameraController.collisionSampleStep);
        break;
      }
    }
    this.camera.position.copy(this.target).addScaledVector(this.direction, Math.max(ThirdPersonCameraController.minimumTargetDistance, distance));
    this.camera.lookAt(this.target);
  }
}
