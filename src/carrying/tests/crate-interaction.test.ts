import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { CrateInteractionController } from '../runtime/CrateInteractionController';
import { CarryingFixture } from './CarryingFixture';

test('selects a nearby crate in front, but excludes crates behind or out of reach', () => {
  const fixture = new CarryingFixture();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(0, false);
  assert.equal(controller.candidate, fixture.crate);
  fixture.crate.setPose(new Vector3(0, 0.25, -1), 0);
  controller.update(0, false);
  assert.equal(controller.candidate, undefined);
  fixture.crate.setPose(new Vector3(0, 0.25, 3), 0);
  controller.update(0, false);
  assert.equal(controller.candidate, undefined);
});

test('does not select or pick up a crate through a wall', () => {
  const wall = new Mesh(new BoxGeometry(3, 2, 0.1), new MeshBasicMaterial());
  wall.position.set(0, 1, 0.6);
  const fixture = new CarryingFixture([wall]);
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(0, true);
  assert.equal(controller.candidate, undefined);
  assert.equal(fixture.player.carriedObject, undefined);
});

test('picks up and puts down with separate interaction presses', () => {
  const fixture = new CarryingFixture();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(0, true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  assert.equal(controller.candidate, undefined);
  controller.update(1 / 60, false);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  controller.update(1 / 60, true);
  assert.equal(fixture.player.carriedObject, undefined);
  assert.ok(Math.abs(fixture.crate.collider.center.y - 0.255) < 0.0001);
});

test('keeps the crate in hand and reports failure when there is no support', () => {
  const fixture = new CarryingFixture();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  controller.update(0, true);
  fixture.crate.setPose(new Vector3(0, 4, 0.76), 0);
  controller.update(0, true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  assert.equal(controller.hasBlockedInteraction, true);
});
