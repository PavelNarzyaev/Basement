import { readFile } from 'node:fs/promises';
import { Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CollisionWorld } from '../../collision/runtime/CollisionWorld';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import { Player } from '../../player/runtime/Player';
import { MovableCrate } from '../runtime/MovableCrate';

export class BasementGeometryFixture {
  readonly scene = new Group();
  readonly crate: MovableCrate;
  readonly world: CollisionWorld;
  readonly player: Player;

  private constructor(readonly model: Object3D) {
    this.scene.add(model);
    const crateModel = model.getObjectByName('MovableCrate');
    if (!crateModel) throw new Error('Basement GLB is missing MovableCrate.');
    this.scene.attach(crateModel);
    this.crate = new MovableCrate(crateModel);
    this.world = new CollisionWorld(model, [this.crate.collider]);
    this.player = new Player(this.world, new PlayerSpawnDto(new Vector3(2, 0.154292, -5.5), 0));
    this.scene.add(this.player.object);
  }

  static async load(): Promise<BasementGeometryFixture> {
    const source = await readFile(new URL('../../../public/models/basement/basement.glb', import.meta.url));
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
    return new BasementGeometryFixture(model.scene);
  }
}
