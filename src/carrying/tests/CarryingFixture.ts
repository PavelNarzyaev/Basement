import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { CollisionWorld } from '../../collision/runtime/CollisionWorld';
import { YawBoxCollision } from '../../collision/runtime/YawBoxCollision';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import { Player } from '../../player/runtime/Player';
import type { IPlayerVisual } from '../../player/contracts/IPlayerVisual';
import { MovableCrate } from '../runtime/MovableCrate';
import { CarryPlacementSolver } from '../runtime/CarryPlacementSolver';
import { TuningSettingsDto } from '../../tuning/contracts/TuningSettingsDto';

export class CarryingFixture {
  readonly scene = new Group();
  readonly environment = new Group();
  readonly crate: MovableCrate;
  readonly world: CollisionWorld;
  readonly player: Player;

  constructor(obstacles: Mesh[] = [], visual: IPlayerVisual = { object: new Group(), update() {}, dispose() {} }) {
    const floor = new Mesh(new BoxGeometry(30, 0.2, 30), new MeshBasicMaterial());
    floor.position.y = -0.1;
    const ceiling = new Mesh(new BoxGeometry(30, 0.2, 30), new MeshBasicMaterial());
    ceiling.position.y = 4.1;
    this.environment.add(floor, ceiling, ...obstacles);
    this.scene.add(this.environment);
    const crateModel = new Mesh(new BoxGeometry(0.6, 0.5, 0.5), new MeshBasicMaterial());
    crateModel.position.set(0, 0.25, 1.05);
    this.scene.add(crateModel);
    this.crate = new MovableCrate(crateModel);
    this.world = new CollisionWorld(this.environment, [this.crate.collider]);
    const carryPlacement = new CarryPlacementSolver(this.world, new YawBoxCollision());
    this.player = new Player(this.world, new PlayerSpawnDto(new Vector3(0, 0.001, 0), 0), carryPlacement, visual,
      new TuningSettingsDto(4, 2.5, '#ffdfaa'));
    this.scene.add(this.player.object);
  }

  advance(movement: Vector3, seconds = 1): void {
    for (let step = 0; step < Math.round(seconds * 120); step++) this.player.update(1 / 120, movement);
  }
}
