import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { SceneLoadResultDto } from '../contracts/SceneLoadResultDto';
import { SceneLayout } from '../runtime/SceneLayout';
import { BasementScene } from '../runtime/BasementScene';
import { Object3DResourceDisposer } from '../../disposer/runtime/Object3DResourceDisposer';

function createFixture(context: TestContext) {
  const model = new Group();
  const zone = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  zone.userData = { purpose: 'cargoZone', collision: false };
  model.add(zone);
  for (const purpose of ['playerSpawn', 'crateSpawn', 'crateSpawn']) {
    const marker = new Object3D();
    marker.userData.purpose = purpose;
    model.add(marker);
  }
  const crate = new Group();
  const mesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  crate.add(mesh);
  let geometryDisposals = 0;
  let materialDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
  mesh.material.addEventListener('dispose', () => materialDisposals++);
  let effectDisposals = 0;
  const dust = {
    object: new Object3D(), initialize() {}, setSettings() {}, setImpactStrength() {}, update() {},
    dispose() { effectDisposals++; },
  };
  const debris = {
    object: new Object3D(), initialize() {}, burst() {}, reset() {}, update() {},
    dispose() { effectDisposals++; },
  };
  const disposer = new Object3DResourceDisposer();
  const disposal = context.mock.method(disposer, 'dispose');
  const scene = new BasementScene(disposer, dust, debris, '/');
  context.after(() => scene.dispose());
  return {
    scene, model, crate, dust, disposal,
    get effectDisposals() { return effectDisposals; },
    get geometryDisposals() { return geometryDisposals; },
    get materialDisposals() { return materialDisposals; },
  };
}

for (const asset of ['basement', 'crate']) {
  test(`disposal while loading ${asset} releases the late model without reporting progress`, async (context) => {
    const fixture = createFixture(context);
    let finish!: (model: GLTF) => void;
    let progress!: (event: ProgressEvent) => void;
    context.mock.method(GLTFLoader.prototype, 'loadAsync', async (url: string, onProgress?: (event: ProgressEvent) => void) => {
      if (asset === 'crate' && url.includes('basement')) return { scene: fixture.model } as GLTF;
      progress = onProgress!;
      return new Promise<GLTF>(resolve => { finish = resolve; });
    });
    let progressCount = 0;
    const loading = fixture.scene.load(() => progressCount++);
    await new Promise(resolve => setImmediate(resolve));
    const previousProgressCount = progressCount;
    fixture.scene.dispose();
    progress({ lengthComputable: true, loaded: 1, total: 1 } as ProgressEvent);
    const lateModel = asset === 'crate' ? fixture.crate : fixture.model;
    finish({ scene: lateModel } as GLTF);
    await assert.rejects(loading, { name: 'AbortError' });
    assert.equal(progressCount, previousProgressCount);
    assert.equal(fixture.scene.scene.children.length, 0);
    assert.ok(fixture.disposal.mock.calls.some(call => call.arguments[0] === lateModel));
    fixture.scene.dispose();
    assert.equal(fixture.effectDisposals, 2);
  });

  test(`${asset} load failure clears the partially loaded scene`, async (context) => {
    const fixture = createFixture(context);
    context.mock.method(GLTFLoader.prototype, 'loadAsync', async (url: string) => {
      if (asset === 'crate' && url.includes('basement')) return { scene: fixture.model } as GLTF;
      throw new Error('Asset failure');
    });
    await assert.rejects(fixture.scene.load(() => {}), /Asset failure/);
    assert.equal(fixture.scene.scene.children.length, 0);
    assert.equal(fixture.effectDisposals, 2);
  });
}

test('invalid scene markers release the loaded model', async (context) => {
  const fixture = createFixture(context);
  fixture.model.children[0]!.userData = {};
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({ scene: fixture.model }) as GLTF);
  await assert.rejects(fixture.scene.load(() => {}), /cargoZone/);
  assert.equal(fixture.scene.scene.children.length, 0);
  assert.equal(fixture.effectDisposals, 2);
});

for (const shouldFailInitialization of [false, true]) {
  test(`shared crate resources are released once with initialization failure=${shouldFailInitialization}`, async (context) => {
    const fixture = createFixture(context);
    context.mock.method(GLTFLoader.prototype, 'loadAsync', async (url: string) => ({
      scene: url.includes('basement') ? fixture.model : fixture.crate,
    }) as GLTF);
    if (shouldFailInitialization) {
      context.mock.method(fixture.dust, 'initialize', () => { throw new Error('Effect failure'); });
      await assert.rejects(fixture.scene.load(() => {}), /Effect failure/);
    } else {
      await fixture.scene.load(() => {});
    }
    fixture.scene.dispose();
    fixture.scene.dispose();
    assert.equal(fixture.geometryDisposals, 1);
    assert.equal(fixture.materialDisposals, 1);
    assert.equal(fixture.scene.scene.children.length, 0);
    assert.equal(fixture.effectDisposals, 2);
  });
}

test('successful loading returns all scene data after effects initialize', async (context) => {
  const fixture = createFixture(context);
  const layout = new SceneLayout(fixture.model);
  let areEffectsInitialized = false;
  context.mock.method(fixture.dust, 'initialize', () => { areEffectsInitialized = true; });
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async (url: string) => ({
    scene: url.includes('basement') ? fixture.model : fixture.crate,
  }) as GLTF);
  const result = await fixture.scene.load(() => {});
  assert.ok(result instanceof SceneLoadResultDto);
  assert.equal(areEffectsInitialized, true);
  assert.equal(result.staticModel, fixture.model);
  assert.deepEqual(result.playerSpawn, layout.playerSpawn);
  assert.deepEqual(result.trolleyCargoZone, layout.cargoZone);
  assert.equal(result.movableCrates.length, layout.cratePlacements.length);
  result.movableCrates.forEach((crate, index) => {
    assert.equal(crate.model.parent, fixture.scene.scene);
    assert.deepEqual(crate.center, layout.cratePlacements[index]!.center);
    assert.equal(crate.rotationY, layout.cratePlacements[index]!.rotationY);
  });
});

test('loading a disposed scene rejects without requesting assets', async (context) => {
  const fixture = createFixture(context);
  const loading = context.mock.method(GLTFLoader.prototype, 'loadAsync');
  fixture.scene.dispose();
  await assert.rejects(fixture.scene.load(() => {}), { name: 'AbortError' });
  assert.equal(loading.mock.callCount(), 0);
});
