import { readFile } from 'node:fs/promises';
import { Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CollisionWorld } from '../../collision/runtime/CollisionWorld';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import { Player } from '../../player/runtime/Player';
import { MovableCrate } from '../runtime/MovableCrate';
import { CarryPlacementSolver } from '../runtime/CarryPlacementSolver';

export class BasementGeometryFixture {
  readonly scene = new Group();
  readonly crate: MovableCrate;
  readonly world: CollisionWorld;
  readonly player: Player;

  private constructor(readonly model: Object3D, crateModel: Object3D) {
    this.scene.add(model);
    crateModel.position.set(2, 0.109292, -4.45);
    this.scene.add(crateModel);
    this.crate = new MovableCrate(crateModel);
    this.world = new CollisionWorld(model, [this.crate.collider]);
    const carryPlacement = new CarryPlacementSolver(this.world);
    this.player = new Player(
      this.world, new PlayerSpawnDto(new Vector3(2, 0.154292, -5.5), 0), carryPlacement,
      { object: new Group(), update() {}, dispose() {} },
    );
    this.scene.add(this.player.object);
  }

  static async load(): Promise<BasementGeometryFixture> {
    const [model, crate] = await Promise.all([
      this.loadGeometry('../../../public/models/basement/basement.glb'),
      this.loadGeometry('../../../public/models/crate/Crate.glb'),
    ]);
    return new BasementGeometryFixture(model, crate);
  }

  static async loadGeometry(path: string): Promise<Object3D> {
    const source = await readFile(new URL(path, import.meta.url));
    const sourceJsonLength = source.readUInt32LE(12);
    const content = JSON.parse(source.subarray(20, 20 + sourceJsonLength).toString('utf8'));
    // Keep the real geometry and hierarchy; collision tests do not need browser image decoding.
    delete content.images;
    delete content.textures;
    delete content.materials;
    for (const mesh of content.meshes) {
      for (const primitive of mesh.primitives) delete primitive.material;
    }
    const json = Buffer.from(JSON.stringify(content));
    const jsonLength = Math.ceil(json.length / 4) * 4;
    const binaryChunk = source.subarray(20 + sourceJsonLength);
    const output = Buffer.alloc(20 + jsonLength + binaryChunk.length, 0x20);
    source.copy(output, 0, 0, 12);
    output.writeUInt32LE(output.length, 8);
    output.writeUInt32LE(jsonLength, 12);
    output.writeUInt32LE(0x4e4f534a, 16);
    json.copy(output, 20);
    binaryChunk.copy(output, 20 + jsonLength);
    const model = await new GLTFLoader().parseAsync(output.buffer as ArrayBuffer, '');
    return model.scene;
  }
}
