import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { BoxCollision } from '../../collision/runtime/BoxCollision';
import { CarryPlacement } from '../runtime/CarryPlacement';
import { CarryingFixture } from './CarryingFixture';

test('places a crate on an elevated platform like a trolley deck', () => {
  const platform = new Mesh(new BoxGeometry(1, 0.15, 1), new MeshBasicMaterial());
  platform.position.set(0, 0.875, 2.1);
  const fixture = new CarryingFixture([platform]);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  fixture.advance(new Vector3(0, 0, 1), 0.5);
  assert.equal(fixture.player.tryPutDown(), true);
  assert.ok(Math.abs(fixture.crate.collider.center.y - 1.205) < 0.001);
  assert.equal(fixture.world.hasBoxCollision(fixture.crate.collider), false);
});

test('rejects placement when only the middle of the footprint has support', () => {
  const pedestal = new Mesh(new BoxGeometry(0.15, 0.6, 0.15), new MeshBasicMaterial());
  pedestal.position.set(0, 0.3, 0.76);
  const fixture = new CarryingFixture([pedestal]);
  fixture.crate.setPose(new Vector3(0, 1, 0.76), 0);
  const placement = new CarryPlacement(fixture.world, new BoxCollision());
  assert.equal(placement.canMove(fixture.crate, new Vector3(0, 0.855, 0.76), 0), true);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  assert.equal(fixture.player.tryPutDown(), false);
  assert.equal(fixture.player.carriedObject, fixture.crate);
});

test('rejects pickup when the transfer path crosses an obstacle', () => {
  const barrier = new Mesh(new BoxGeometry(1.2, 0.1, 0.1), new MeshBasicMaterial());
  barrier.position.set(0, 0.65, 0.9);
  const fixture = new CarryingFixture([barrier]);
  assert.equal(fixture.player.tryPickUp(fixture.crate), false);
  assert.equal(fixture.player.carriedObject, undefined);
  assert.deepEqual(fixture.crate.collider.center.toArray(), [0, 0.25, 1.05]);
});
