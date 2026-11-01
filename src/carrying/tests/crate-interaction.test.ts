import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { CrateInteractionController } from '../runtime/CrateInteractionController';
import { CarryingFixture } from './CarryingFixture';

test('selects a nearby crate in front, but excludes crates behind or out of reach', () => {
  const fixture = new CarryingFixture();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(false);
  assert.equal(controller.pickupCandidate, fixture.crate);
  fixture.crate.setPose(new Vector3(0, 0.25, -1), 0);
  controller.update(false);
  assert.equal(controller.pickupCandidate, undefined);
  fixture.crate.setPose(new Vector3(0, 0.25, 3), 0);
  controller.update(false);
  assert.equal(controller.pickupCandidate, undefined);
});

test('does not select or pick up a crate through a wall', () => {
  const wall = new Mesh(new BoxGeometry(3, 2, 0.1), new MeshBasicMaterial());
  wall.position.set(0, 1, 0.6);
  const fixture = new CarryingFixture([wall]);
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(true);
  assert.equal(controller.pickupCandidate, undefined);
  assert.equal(fixture.player.carriedObject, undefined);
});

test('picks up and puts down with separate interaction presses', () => {
  const fixture = new CarryingFixture();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  assert.equal(controller.pickupCandidate, undefined);
  controller.update(false);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  controller.update(true);
  assert.equal(fixture.player.carriedObject, undefined);
  assert.ok(Math.abs(fixture.crate.collider.center.y - 0.255) < 0.0001);
});

test('hides placement and keeps the crate in hand when there is no support', () => {
  const fixture = new CarryingFixture();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(true);
  fixture.crate.setPose(new Vector3(0, 4, 0.76), 0);
  controller.update(true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  assert.equal(controller.canPutDown, false);
});

test('hides pickup when the holding position is blocked and restores it when clear', () => {
  const obstacle = new Mesh(new BoxGeometry(0.2, 0.2, 0.2), new MeshBasicMaterial());
  obstacle.position.set(0, 1.2, 0.76);
  const fixture = new CarryingFixture([obstacle]);
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(false);
  assert.equal(controller.pickupCandidate, undefined);
  controller.update(true);
  assert.equal(fixture.player.carriedObject, undefined);
  assert.deepEqual(fixture.crate.collider.center.toArray(), [0, 0.25, 1.05]);
  fixture.player.object.rotation.y = 0.7;
  controller.update(false);
  assert.equal(controller.pickupCandidate, fixture.crate);
  controller.update(true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
});

test('updates placement availability without an interaction press', () => {
  const fixture = new CarryingFixture();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(false);
  assert.equal(controller.canPutDown, false);
  controller.update(true);
  assert.equal(controller.canPutDown, true);
  const holdingCenter = fixture.crate.collider.center.clone();
  fixture.crate.setPose(new Vector3(0, 4, 0.76), 0);
  controller.update(false);
  assert.equal(controller.canPutDown, false);
  fixture.crate.setPose(holdingCenter, 0);
  controller.update(false);
  assert.equal(controller.canPutDown, true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  assert.deepEqual(fixture.crate.collider.center, holdingCenter);
});
