import { CapsuleGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import type { IPlayer } from '../contracts/IPlayer';
import type { PlayerSpawnDto } from '../contracts/PlayerSpawnDto';

export class Player implements IPlayer {
  private static readonly colliderRadius = 0.43;
  private static readonly colliderHeight = 1.8;
  private static readonly fixedStep = 1 / 120;

  readonly object: Mesh<CapsuleGeometry, MeshStandardMaterial>;
  private readonly collider = new Capsule(
    new Vector3(0, Player.colliderRadius, 0),
    new Vector3(0, Player.colliderHeight - Player.colliderRadius, 0),
    Player.colliderRadius,
  );
  private readonly spawn: Vector3;
  private readonly spawnRotationY: number;
  private readonly velocity = new Vector3();
  private readonly movement = new Vector3();
  private readonly displacement = new Vector3();
  private readonly minimumHeight: number;
  private accumulator = 0;

  constructor(private readonly world: ICollisionWorld, spawn: PlayerSpawnDto) {
    this.minimumHeight = world.bounds.min.y - 3;
    this.spawn = spawn.position.clone();
    this.spawnRotationY = spawn.rotationY;
    this.object = new Mesh(
      new CapsuleGeometry(Player.colliderRadius, Player.colliderHeight - 2 * Player.colliderRadius, 8, 16),
      new MeshStandardMaterial({ color: '#e3a34c', roughness: 0.7 }),
    );
    this.reset();
  }

  update(delta: number, movement: Vector3): void {
    this.movement.set(movement.x, 0, movement.z).clampLength(0, 1).multiplyScalar(2.5);
    this.accumulator += Math.min(delta, 0.1);
    while (this.accumulator >= Player.fixedStep) {
      this.step();
      this.accumulator -= Player.fixedStep;
    }
    this.collider.getCenter(this.object.position);
    if (this.movement.lengthSq() > 0) this.object.rotation.y = Math.atan2(this.movement.x, this.movement.z);
  }

  dispose(): void {
    this.object.removeFromParent();
    this.object.geometry.dispose();
    this.object.material.dispose();
  }

  private step(): void {
    this.velocity.x = this.movement.x;
    this.velocity.z = this.movement.z;
    this.velocity.y -= 20 * Player.fixedStep;
    this.collider.translate(this.displacement.copy(this.velocity).multiplyScalar(Player.fixedStep));
    for (let iteration = 0; iteration < 4; iteration++) {
      const collision = this.world.intersectCapsule(this.collider);
      if (!collision) break;
      this.collider.translate(this.displacement.copy(collision.normal).multiplyScalar(collision.depth + 0.00001));
      const inwardSpeed = this.velocity.dot(collision.normal);
      if (inwardSpeed < 0) this.velocity.addScaledVector(collision.normal, -inwardSpeed);
    }
    if (this.collider.start.y < this.minimumHeight) this.reset();
  }

  private reset(): void {
    this.collider.start.copy(this.spawn);
    this.collider.start.y += Player.colliderRadius;
    this.collider.end.copy(this.spawn);
    this.collider.end.y += Player.colliderHeight - Player.colliderRadius;
    this.velocity.set(0, 0, 0);
    this.object.rotation.y = this.spawnRotationY;
    this.collider.getCenter(this.object.position);
  }
}
