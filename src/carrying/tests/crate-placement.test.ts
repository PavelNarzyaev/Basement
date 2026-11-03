import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { CarryPlacementSolver } from '../runtime/CarryPlacementSolver';
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
  const placement = new CarryPlacementSolver(fixture.world);
  assert.equal(placement.canSweepToPose(fixture.crate, new Vector3(0, 0.855, 0.76), 0), true);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  assert.equal(fixture.player.tryPutDown(), false);
  assert.equal(fixture.player.carriedObject, fixture.crate);
});

test('allows pickup across an obstacle when the holding position is clear', () => {
  const barrier = new Mesh(new BoxGeometry(1.2, 0.1, 0.1), new MeshBasicMaterial());
  barrier.position.set(0, 0.65, 0.9);
  const fixture = new CarryingFixture([barrier]);
  assert.equal(fixture.player.canPickUp(fixture.crate), true);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  assert.equal(fixture.player.carriedObject, fixture.crate);
  assert.equal(fixture.world.hasBoxCollision(fixture.crate.collider), false);
});

test('allows placement across an obstacle when the final position has support and is clear', () => {
  const barrier = new Mesh(new BoxGeometry(0.08, 0.1, 1.2), new MeshBasicMaterial());
  barrier.position.set(0.15, 0.65, 0.76);
  const fixture = new CarryingFixture([barrier]);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  const placement = new CarryPlacementSolver(fixture.world);
  const target = new Vector3(0, 0.255, 0.76);
  assert.equal(placement.canSweepToPose(fixture.crate, target, 0), false);
  assert.equal(fixture.player.canPutDown(), true);
  assert.equal(fixture.player.tryPutDown(), true);
  assert.equal(fixture.player.carriedObject, undefined);
  assert.ok(fixture.crate.collider.center.distanceTo(target) < 0.0001);
  assert.equal(fixture.world.hasBoxCollision(fixture.crate.collider), false);
});

test('rejects placement when an obstacle overlaps the final position between support samples', () => {
  const barrier = new Mesh(new BoxGeometry(0.08, 0.3, 1.2), new MeshBasicMaterial());
  barrier.position.set(0.15, 0.15, 0.76);
  const fixture = new CarryingFixture([barrier]);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  assert.equal(fixture.player.canPutDown(), false);
  assert.equal(fixture.player.tryPutDown(), false);
  assert.equal(fixture.player.carriedObject, fixture.crate);
});
