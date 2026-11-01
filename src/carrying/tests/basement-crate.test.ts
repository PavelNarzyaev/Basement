import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Vector3 } from 'three';
import { CrateInteractionController } from '../runtime/CrateInteractionController';
import { BasementGeometryFixture } from './BasementGeometryFixture';

test('detects, carries and places the separate crate model in the basement', async () => {
  const fixture = await BasementGeometryFixture.load();
  const controller = new CrateInteractionController(fixture.player, [fixture.crate], fixture.world);
  fixture.player.update(1 / 60, new Vector3());
  controller.update(false);
  assert.equal(controller.candidate, fixture.crate);
  controller.update(true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  for (let step = 0; step < 120; step++) {
    fixture.player.update(1 / 120, new Vector3(0, 0, 1));
    assert.equal(fixture.world.hasBoxCollision(fixture.crate.collider), false);
  }
  assert.ok(fixture.player.object.position.z > -4.5);
  controller.update(true);
  assert.equal(fixture.player.carriedObject, undefined);
  assert.ok(Math.abs(fixture.crate.collider.center.y - 0.359292) < 0.01);
});
