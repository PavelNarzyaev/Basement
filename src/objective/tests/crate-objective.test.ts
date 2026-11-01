import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Group, Vector3 } from 'three';
import { YawBoxDto } from '../../collision/contracts/YawBoxDto';
import { CrateZoneCounter } from '../runtime/CrateZoneCounter';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import { SceneLayout } from '../../scenes/runtime/SceneLayout';
import { BasementGeometryFixture } from '../../carrying/tests/BasementGeometryFixture';
import { Ray } from 'three';
import { CollisionWorld } from '../../collision/runtime/CollisionWorld';

test('counts a crate resting on the actual basement trolley deck', async () => {
  const model = await BasementGeometryFixture.loadGeometry('../../../public/models/basement/basement.glb');
  const layout = new SceneLayout(model);
  const trolleyCargoZone = layout.cargoZone;
  assert.equal(layout.cratePlacements.length, 5);
  assert.ok(layout.playerSpawn.position.distanceTo(new Vector3(0, 0.154292, -13)) < 0.00001);
  assert.ok(Math.abs(Math.cos(layout.playerSpawn.rotationY) + 1) < 0.00001);
  assert.ok(layout.cratePlacements[0]!.center.distanceTo(new Vector3(-2.072395, 1.223902, 6.682539)) < 0.00001);
  assert.ok(Math.abs(layout.cratePlacements[0]!.rotationY - 2.240222) < 0.00001);
  const world = new CollisionWorld(model);
  const origin = trolleyCargoZone.center.clone();
  origin.y = 4;
  const hit = world.castRay(new Ray(origin, new Vector3(0, -1, 0)))!;
  assert.ok(Math.abs(hit.position.y - 1.157307) < 0.001);
  const crate: ICarryable = {
    object: new Group(),
    collider: new YawBoxDto(
      hit.position.clone().add(new Vector3(0, 0.255, 0)), new Vector3(0.25, 0.25, 0.25), trolleyCargoZone.rotationY,
    ),
    setPose() {},
  };
  const progress = new CrateZoneCounter([crate], trolleyCargoZone);
  assert.equal(progress.countPlaced(undefined), 1);
  assert.equal(progress.countPlaced(crate), 0);
  world.dispose();
});

test('counts placement, removal and completion using the crate array length', () => {
  const zone = new YawBoxDto(new Vector3(0, 2, 0), new Vector3(2, 1, 1));
  const crates: ICarryable[] = [0, 1, 2].map(index => ({
    object: new Group(),
    collider: new YawBoxDto(new Vector3(index - 1, 0.25, 0), new Vector3(0.25, 0.25, 0.25)),
    setPose() {},
  }));
  const progress = new CrateZoneCounter(crates, zone);
  assert.equal(progress.total, crates.length);
  assert.equal(progress.countPlaced(undefined), 0);
  crates[0]!.collider.center.y = 1.255;
  assert.equal(progress.countPlaced(undefined), 1);
  assert.equal(progress.countPlaced(crates[0]), 0);
  crates.forEach(crate => { crate.collider.center.y = 1.255; });
  assert.equal(progress.countPlaced(undefined), progress.total);
  crates[0]!.collider.center.x = 3;
  assert.equal(progress.countPlaced(undefined), 2);
});

test('counts a partially overlapping rotated crate and rejects crates below the zone', () => {
  const zone = new YawBoxDto(new Vector3(4, 2, -3), new Vector3(1, 1, 0.5), Math.PI / 4);
  const crate: ICarryable = {
    object: new Group(),
    collider: new YawBoxDto(new Vector3(4, 1.255, -3), new Vector3(0.7, 0.25, 0.2), Math.PI / 4),
    setPose() {},
  };
  const progress = new CrateZoneCounter([crate], zone);
  assert.equal(progress.countPlaced(undefined), 1);
  crate.collider.rotationY += Math.PI / 2;
  assert.equal(progress.countPlaced(undefined), 1);
  crate.collider.rotationY = zone.rotationY;
  crate.collider.center.y = 0.25;
  assert.equal(progress.countPlaced(undefined), 0);
});

test('counts face, edge and corner contact but rejects a gap', () => {
  const zone = new YawBoxDto(new Vector3(), new Vector3(1, 1, 1));
  const crate: ICarryable = {
    object: new Group(),
    collider: new YawBoxDto(new Vector3(), new Vector3(0.25, 0.25, 0.25)),
    setPose() {},
  };
  const progress = new CrateZoneCounter([crate], zone);
  for (const position of [[1.25, 0, 0], [1.25, 1.25, 0], [1.25, 1.25, 1.25], [0, -1.25, 0]]) {
    crate.collider.center.fromArray(position);
    assert.equal(progress.countPlaced(undefined), 1);
    assert.equal(progress.countPlaced(crate), 0);
  }
  crate.collider.center.set(1.251, 0, 0);
  assert.equal(progress.countPlaced(undefined), 0);
});

test('rejects a crate outside a rotated zone even when their axis-aligned bounds overlap', () => {
  const zone = new YawBoxDto(new Vector3(), new Vector3(1, 1, 0.2), Math.PI / 4);
  const crate: ICarryable = {
    object: new Group(),
    collider: new YawBoxDto(new Vector3(0.7, 0, 0.7), new Vector3(0.1, 0.1, 0.1)),
    setPose() {},
  };
  assert.equal(new CrateZoneCounter([crate], zone).countPlaced(undefined), 0);
});
