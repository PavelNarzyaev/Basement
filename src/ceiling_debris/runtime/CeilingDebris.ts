import { DynamicDrawUsage, InstancedMesh, MeshStandardMaterial, Object3D, Raycaster, TetrahedronGeometry, Vector3 } from 'three';
import type { ICeilingDebris } from '../contracts/ICeilingDebris';

export class CeilingDebris implements ICeilingDebris {
  private static readonly particleCount = 120;
  private readonly geometry = new TetrahedronGeometry(1);
  private readonly material = new MeshStandardMaterial({ color: '#756047', roughness: 1 });
  readonly object = new InstancedMesh(this.geometry, this.material, CeilingDebris.particleCount);
  private readonly positions = new Float32Array(CeilingDebris.particleCount * 3);
  private readonly velocities = new Float32Array(CeilingDebris.particleCount * 3);
  private readonly ages = new Float32Array(CeilingDebris.particleCount);
  private readonly sizes = new Float32Array(CeilingDebris.particleCount);
  private readonly landingHeights = new Float32Array(CeilingDebris.particleCount);
  private readonly transform = new Object3D();
  private readonly raycaster = new Raycaster();
  private readonly origin = new Vector3();
  private readonly up = new Vector3(0, 1, 0);
  private readonly down = new Vector3(0, -1, 0);
  private model!: Object3D;

  constructor() {
    this.object.name = 'CeilingDebris';
    this.object.instanceMatrix.setUsage(DynamicDrawUsage);
    // Instances move independently; the initial bounds do not describe the falling debris.
    this.object.frustumCulled = false;
    this.reset();
  }

  initialize(model: Object3D): void {
    this.model = model;
    model.updateWorldMatrix(true, true);
  }

  burst(position: Vector3): void {
    this.object.count = 0;
    for (let patch = 0; patch < 6; patch++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1 + Math.random() * 3;
      this.origin.set(position.x + Math.cos(angle) * radius, position.y, position.z + Math.sin(angle) * radius);
      this.raycaster.set(this.origin, this.up);
      const ceiling = this.raycaster.intersectObject(this.model, true)[0];
      // A patch may be outside the room or beneath an opening in the ceiling.
      if (!ceiling) continue;
      this.origin.copy(ceiling.point).addScaledVector(this.down, 0.04);
      this.raycaster.set(this.origin, this.down);
      const landing = this.raycaster.intersectObject(this.model, true)[0];
      if (!landing) continue;
      for (let particle = 0; particle < 20; particle++) {
        const index = this.object.count++;
        const offset = index * 3;
        this.positions.set([this.origin.x, this.origin.y, this.origin.z], offset);
        this.velocities.set([(Math.random() - 0.5) * 0.7, -0.1 - Math.random() * 0.5, (Math.random() - 0.5) * 0.7], offset);
        this.ages[index] = -Math.random() * 0.65;
        this.sizes[index] = 0.008 + Math.random() * 0.022;
        this.landingHeights[index] = landing.point.y + 0.04;
      }
    }
    this.update(0);
  }

  reset(): void {
    this.object.count = 0;
  }

  update(delta: number): void {
    const step = Math.min(delta, 0.1);
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
      const isVisible = age >= 0 && age < 3 && this.transform.position.y > this.landingHeights[index]!;
      this.transform.scale.setScalar(isVisible ? this.sizes[index]! * Math.min(1, (3 - age) * 4) : 0);
      this.transform.updateMatrix();
      this.object.setMatrixAt(index, this.transform.matrix);
    }
    this.object.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.dispose();
    this.geometry.dispose();
    this.material.dispose();
  }
}
