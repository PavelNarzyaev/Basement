import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, Mesh, Object3D, Vector3 } from 'three';
import { SceneLayout } from '../runtime/SceneLayout';

test('reads transformed marker positions, yaw and mesh bounds', () => {
  const model = new Group();
  model.position.set(7, 2, -4);
  model.rotation.y = 0.6;
  const zone = new Mesh(new BoxGeometry(4, 2, 3).translate(1, 0, 0));
  zone.userData = { purpose: 'cargoZone', collision: false };
  zone.position.set(0, 1, 0);
  zone.scale.set(2, 3, 4);
  model.add(zone);
  const player = new Object3D();
  player.userData.purpose = 'playerSpawn';
  player.position.set(2, 0.05, 5);
  player.rotation.y = -0.3;
  model.add(player);
  for (let index = 0; index < 3; index++) {
    const crate = new Object3D();
    crate.userData.purpose = 'crateSpawn';
    crate.position.set(index, 2, 3);
    model.add(crate);
  }
  const layout = new SceneLayout(model);
  assert.equal(layout.cratePlacements.length, 3);
  assert.ok(layout.playerSpawn.position.distanceTo(player.getWorldPosition(new Vector3())) < 1e-6);
  assert.ok(Math.abs(layout.playerSpawn.rotationY - 0.3) < 1e-6);
  assert.ok(layout.cargoZone.center.distanceTo(zone.localToWorld(new Vector3(1, 0, 0))) < 1e-6);
  assert.ok(layout.cargoZone.halfSize.distanceTo(new Vector3(4, 3, 6)) < 1e-6);
  assert.ok(Math.abs(layout.cargoZone.rotationY - 0.6) < 1e-6);
  zone.geometry.dispose();
});

test('rejects missing or duplicate required markers and missing crate spawns', () => {
  const model = new Group();
  assert.throws(() => new SceneLayout(model), /one cargoZone/);
  const zone = new Mesh(new BoxGeometry());
  zone.userData = { purpose: 'cargoZone', collision: false };
  model.add(zone);
  assert.throws(() => new SceneLayout(model), /one playerSpawn/);
  const player = new Object3D();
  player.userData.purpose = 'playerSpawn';
  model.add(player);
  assert.throws(() => new SceneLayout(model), /no crateSpawn/);
  const crate = new Object3D();
  crate.userData.purpose = 'crateSpawn';
  model.add(crate);
  model.add(player.clone());
  assert.throws(() => new SceneLayout(model), /one playerSpawn, found 2/);
  model.remove(model.children.at(-1)!);
  model.add(zone.clone());
  assert.throws(() => new SceneLayout(model), /one cargoZone, found 2/);
  model.remove(model.children.at(-1)!);
  zone.userData.collision = true;
  assert.throws(() => new SceneLayout(model), /collision = false/);
  zone.userData.collision = false;
  crate.rotation.x = 0.4;
  assert.throws(() => new SceneLayout(model), /vertical axis/);
  zone.geometry.dispose();
});
