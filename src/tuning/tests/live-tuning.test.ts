import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, Mesh, MeshStandardMaterial, Object3D, PointLight, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { CarryingFixture } from '../../carrying/tests/CarryingFixture.ts';
import { CarryPlacementSolver } from '../../carrying/runtime/CarryPlacementSolver.ts';
import { YawBoxCollision } from '../../collision/runtime/YawBoxCollision.ts';
import { Object3DResourceDisposer } from '../../disposer/runtime/Object3DResourceDisposer.ts';
import { Player } from '../../player/runtime/Player.ts';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto.ts';
import { BasementScene } from '../../scenes/runtime/BasementScene.ts';
import { LiveTuningSettings } from '../runtime/LiveTuningSettings.ts';
import { TuningSettingsDto } from '../contracts/TuningSettingsDto.ts';

test('an existing player uses tuned speeds immediately in both states', () => {
  const fixture = new CarryingFixture();
  const settings = new LiveTuningSettings(new TuningSettingsDto(4, 2.5, '#ffdfaa'));
  const player = new Player(fixture.world, new PlayerSpawnDto(new Vector3(0, 0.001, 0), 0),
    new CarryPlacementSolver(fixture.world, new YawBoxCollision()),
    { object: new Group(), update() {}, dispose() {} }, settings);
  assert.equal(player.tryPickUp(fixture.crate), true);
  settings.applySettings(new TuningSettingsDto(6, 3, '#ffdfaa'));
  for (let step = 0; step < 120; step++) player.update(1 / 120, new Vector3(0, 0, 1));
  assert.ok(Math.abs(player.object.position.z - 3) < 0.001);
  assert.equal(player.tryPutDown(), true);
  settings.applySettings(new TuningSettingsDto(5, 3, '#ffdfaa'));
  for (let step = 0; step < 120; step++) player.update(1 / 120, new Vector3(1, 0, 0));
  assert.ok(Math.abs(player.object.position.x - 5) < 0.001);
  player.dispose();
  fixture.world.dispose();
});

test('lamp color changes on existing lights without reloading models', async (context) => {
  const model = new Group();
  const zone = new Mesh(new BoxGeometry(), new MeshStandardMaterial());
  zone.userData = { purpose: 'cargoZone', collision: false };
  model.add(zone);
  for (const purpose of ['playerSpawn', 'crateSpawn']) {
    const marker = new Object3D();
    marker.userData.purpose = purpose;
    model.add(marker);
  }
  const marker = new Object3D();
  marker.userData.lightId = 'test-lamp';
  model.add(marker);
  let loads = 0;
  context.mock.method(GLTFLoader.prototype, 'loadAsync', async () => ({ scene: loads++ === 0 ? model : new Group() }) as GLTF);
  const settings = new LiveTuningSettings(new TuningSettingsDto(4, 2.5, '#ffdfaa'));
  const scene = new BasementScene(new Object3DResourceDisposer(),
    { object: new Object3D(), initialize() {}, update() {}, setSettings() {}, setImpactStrength() {}, dispose() {} },
    { object: new Object3D(), initialize() {}, update() {}, burst() {}, reset() {}, dispose() {} }, '/', settings);
  context.after(() => scene.dispose());
  await scene.load(() => {});
  const light = marker.children[0] as PointLight;
  settings.applySettings(new TuningSettingsDto(4, 2.5, '#50aaff'));
  scene.update(0);
  assert.equal(marker.children[0], light);
  assert.equal(light.color.getHexString(), '50aaff');
  assert.equal(loads, 2);
});

test('invalid edits fail without modifying the current preview', () => {
  const settings = new LiveTuningSettings(new TuningSettingsDto(4, 2.5, '#ffdfaa'));
  assert.throws(() => settings.applySettings(new TuningSettingsDto(0, 2.5, '#ffdfaa')), RangeError);
  assert.throws(() => settings.applySettings(new TuningSettingsDto(4, 2.5, 'red')), TypeError);
  assert.equal(settings.unladenMovementSpeed, 4);
  assert.equal(settings.lampColor, '#ffdfaa');
});
