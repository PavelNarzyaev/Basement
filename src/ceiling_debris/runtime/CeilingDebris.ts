import { Box3, DynamicDrawUsage, InstancedMesh, MeshStandardMaterial, Object3D, TetrahedronGeometry, Vector3 } from 'three';
import type { ICeilingDebris } from '../contracts/ICeilingDebris';
import { debrisMaximumDistance, debrisMinimumDistance, debrisSectorHalfAngleDegrees } from '../contracts/debrisSpawnSettings';

export class CeilingDebris implements ICeilingDebris {
  private static readonly particleCount = 120;
  private readonly geometry = new TetrahedronGeometry(1);
  private readonly material = new MeshStandardMaterial({ color: '#756047', roughness: 1 });
  readonly object = new InstancedMesh(this.geometry, this.material, CeilingDebris.particleCount);
  private readonly positions = new Float32Array(CeilingDebris.particleCount * 3);
  private readonly velocities = new Float32Array(CeilingDebris.particleCount * 3);
  private readonly ages = new Float32Array(CeilingDebris.particleCount);
  private readonly sizes = new Float32Array(CeilingDebris.particleCount);
  private readonly transform = new Object3D();
  private readonly origin = new Vector3();
  private readonly spawnBounds = new Box3();
  private floorHeight = 0;
  private ceilingHeight = 0;

  constructor() {
    this.object.name = 'CeilingDebris';
    this.object.instanceMatrix.setUsage(DynamicDrawUsage);
    // Instances move independently; the initial bounds do not describe the falling debris.
    this.object.frustumCulled = false;
    this.reset();
  }

  initialize(bounds: Box3): void {
    this.floorHeight = bounds.min.y - 0.1;
    this.ceilingHeight = bounds.max.y + 0.1;
    this.spawnBounds.copy(bounds);
    // Leave room for the sideways drift before particles reach the floor.
    this.spawnBounds.min.x += 1;
    this.spawnBounds.min.z += 1;
    this.spawnBounds.max.x -= 1;
    this.spawnBounds.max.z -= 1;
  }

  burst(position: Vector3, direction: Vector3): void {
    this.object.count = 0;
    const heading = Math.atan2(direction.x, direction.z);
    for (let patch = 0; patch < 6; patch++) {
      if (!this.selectOrigin(position, heading)) continue;
      for (let particle = 0; particle < 20; particle++) {
        const index = this.object.count++;
        const offset = index * 3;
        this.positions.set([this.origin.x, this.origin.y, this.origin.z], offset);
        this.velocities.set([(Math.random() - 0.5) * 0.7, -0.1 - Math.random() * 0.5, (Math.random() - 0.5) * 0.7], offset);
        this.ages[index] = -Math.random() * 0.65;
        this.sizes[index] = 0.008 + Math.random() * 0.022;
      }
    }
    this.update(0);
  }

  private selectOrigin(position: Vector3, heading: number): boolean {
    const halfAngle = debrisSectorHalfAngleDegrees * Math.PI / 180;
    const angle = heading + (Math.random() * 2 - 1) * halfAngle;
    const distance = debrisMinimumDistance + Math.random() * (debrisMaximumDistance - debrisMinimumDistance);
    this.origin.set(position.x + Math.sin(angle) * distance, this.ceilingHeight, position.z + Math.cos(angle) * distance);
    return this.origin.x >= this.spawnBounds.min.x && this.origin.x <= this.spawnBounds.max.x
      && this.origin.z >= this.spawnBounds.min.z && this.origin.z <= this.spawnBounds.max.z;
  }

  reset(): void {
    this.object.count = 0;
  }

  update(delta: number): void {
    const step = Math.min(delta, 0.1);
    let hasRemainingParticles = false;
    for (let index = 0; index < this.object.count; index++) {
      const offset = index * 3;
      const previousAge = this.ages[index]!;
      const age = previousAge + step;
      this.ages[index] = age;
      const activeStep = Math.max(0, age) - Math.max(0, previousAge);
      this.velocities[offset + 1]! -= 4.5 * activeStep;
      for (let axis = 0; axis < 3; axis++) {
        this.positions[offset + axis]! += this.velocities[offset + axis]! * activeStep;
      }
      this.transform.position.fromArray(this.positions, offset);
      this.transform.rotation.set(age * 3 + index, age * 2, index);
      const isAboveFloor = this.transform.position.y > this.floorHeight;
      hasRemainingParticles ||= isAboveFloor;
      this.transform.scale.setScalar(age >= 0 && isAboveFloor ? this.sizes[index]! : 0);
      this.transform.updateMatrix();
      this.object.setMatrixAt(index, this.transform.matrix);
    }
    this.object.instanceMatrix.needsUpdate = true;
    if (!hasRemainingParticles) this.reset();
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
