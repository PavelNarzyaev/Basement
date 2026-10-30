import { Box3, BoxGeometry, MathUtils, Mesh, MeshStandardMaterial, Ray, Raycaster, Sphere, Vector3 } from 'three';
import type { Object3D, PerspectiveCamera } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { Octree } from 'three/addons/math/Octree.js';
import type { PlayerInput } from '../controls/PlayerInput';

const colliderRadius = 0.43;
const colliderHeight = 0.9;
const fixedStep = 1 / 120;

export class ThirdPersonPlayer {
  readonly mesh = new Mesh(new BoxGeometry(0.6, 0.6, 0.6), new MeshStandardMaterial({ color: '#e3a34c', roughness: 0.7 }));
  private readonly world: Octree;
  private readonly collider = new Capsule(new Vector3(), new Vector3(), colliderRadius);
  private readonly spawn = new Vector3();
  private readonly velocity = new Vector3();
  private readonly movement = new Vector3();
  private readonly displacement = new Vector3();
  private readonly target = new Vector3();
  private readonly cameraDirection = new Vector3();
  private readonly cameraRay = new Ray();
  private readonly cameraSphere = new Sphere(new Vector3(), 0.18);
  private readonly minimumHeight: number;
  private yaw = 0;
  private pitch = 0.25;
  private accumulator = 0;

  constructor(model: Object3D, private readonly camera: PerspectiveCamera, private readonly input: PlayerInput) {
    this.world = new Octree().fromGraphNode(model);
    const bounds = new Box3().setFromObject(model);
    this.minimumHeight = bounds.min.y - 3;
    this.findSpawn(model, bounds);
    this.reset();
    this.updateCamera();
  }

  update(delta: number): void {
    const input = this.input.read();
    this.yaw -= input.lookX;
    this.pitch = MathUtils.clamp(this.pitch + input.lookY, -0.35, 1.15);
    this.movement.set(input.movementX, 0, input.movementZ).clampLength(0, 1);
    this.movement.applyAxisAngle(worldUp, this.yaw).multiplyScalar(2.5);
    this.accumulator += Math.min(delta, 0.1);
    while (this.accumulator >= fixedStep) {
      this.step();
      this.accumulator -= fixedStep;
    }
    this.collider.getCenter(this.mesh.position);
    if (this.movement.lengthSq() > 0) this.mesh.rotation.y = Math.atan2(this.movement.x, this.movement.z);
    this.updateCamera();
  }

  dispose(): void {
    this.input.dispose();
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
    this.world.clear();
  }

  private step(): void {
    this.velocity.x = this.movement.x;
    this.velocity.z = this.movement.z;
    this.velocity.y -= 20 * fixedStep;
    this.collider.translate(this.displacement.copy(this.velocity).multiplyScalar(fixedStep));
    for (let iteration = 0; iteration < 4; iteration++) {
      const collision = this.world.capsuleIntersect(this.collider);
      if (!collision) break;
      this.collider.translate(this.displacement.copy(collision.normal).multiplyScalar(collision.depth + 0.00001));
      const inwardSpeed = this.velocity.dot(collision.normal);
      if (inwardSpeed < 0) this.velocity.addScaledVector(collision.normal, -inwardSpeed);
    }
    if (this.collider.start.y < this.minimumHeight) this.reset();
  }

  private reset(): void {
    this.collider.start.copy(this.spawn).addScaledVector(worldUp, colliderRadius);
    this.collider.end.copy(this.spawn).addScaledVector(worldUp, colliderHeight - colliderRadius);
    this.velocity.set(0, 0, 0);
    this.collider.getCenter(this.mesh.position);
  }

  private findSpawn(model: Object3D, bounds: Box3): void {
    const raycaster = new Raycaster();
    const center = bounds.getCenter(new Vector3());
    // Search near floor level so the ceiling cannot become the spawn surface.
    for (let ring = 0; ring < 24; ring++) {
      for (let x = -ring; x <= ring; x++) {
        for (let z = -ring; z <= ring; z++) {
          if (Math.max(Math.abs(x), Math.abs(z)) !== ring) continue;
          raycaster.set(new Vector3(center.x + x * 0.5, bounds.min.y + 1.5, center.z + z * 0.5), new Vector3(0, -1, 0));
          const hits = raycaster.intersectObject(model, true);
          for (const hit of hits) {
            if (!hit.face || hit.face.normal.clone().transformDirection(hit.object.matrixWorld).y < 0.7) continue;
            this.spawn.copy(hit.point).addScaledVector(worldUp, 0.02);
            this.reset();
            if (!this.world.capsuleIntersect(this.collider)) return;
          }
        }
      }
    }
    throw new Error('No clear floor position for the player was found.');
  }

  private updateCamera(): void {
    this.target.copy(this.mesh.position).addScaledVector(worldUp, 0.35);
    this.cameraDirection.set(Math.sin(this.yaw) * Math.cos(this.pitch), Math.sin(this.pitch), Math.cos(this.yaw) * Math.cos(this.pitch));
    this.cameraRay.set(this.target, this.cameraDirection);
    const hit = this.world.rayIntersect(this.cameraRay);
    let distance = hit ? Math.min(3, Math.max(0, hit.distance - 0.2)) : 3;
    // Sweep the camera volume from the target to avoid clipping near-plane corners.
    for (let sample = 0.05; sample <= distance; sample += 0.05) {
      this.cameraSphere.center.copy(this.target).addScaledVector(this.cameraDirection, sample);
      if (this.world.sphereIntersect(this.cameraSphere)) {
        distance = Math.max(0, sample - 0.05);
        break;
      }
    }
    this.camera.position.copy(this.target).addScaledVector(this.cameraDirection, Math.max(0.01, distance));
    this.camera.lookAt(this.target);
  }
}

const worldUp = new Vector3(0, 1, 0);
