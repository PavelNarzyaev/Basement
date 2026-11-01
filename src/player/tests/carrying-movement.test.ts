import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import { CarryingFixture } from '../../carrying/tests/CarryingFixture';

test('walks at 4 m/s, carries at 2.5 m/s, and restores walking speed after placement', () => {
  const walking = new CarryingFixture();
  walking.advance(new Vector3(1, 0, 0));
  assert.ok(Math.abs(walking.player.object.position.x - 4) < 0.001);
  const carrying = new CarryingFixture();
  assert.equal(carrying.player.tryPickUp(carrying.crate), true);
  carrying.advance(new Vector3(0, 0, 1));
  assert.ok(Math.abs(carrying.player.object.position.z - 2.5) < 0.001);
  assert.ok(Math.abs(carrying.crate.collider.center.z - carrying.player.object.position.z - 0.76) < 0.001);
  assert.equal(carrying.player.tryPutDown(), true);
  const start = carrying.player.object.position.x;
  carrying.advance(new Vector3(1, 0, 0));
  assert.ok(Math.abs(carrying.player.object.position.x - start - 4) < 0.001);
});

test('a resting crate blocks the player and leaves no ghost collider after pickup', () => {
  const fixture = new CarryingFixture();
  fixture.advance(new Vector3(0, 0, 1));
  assert.ok(fixture.player.object.position.z < 0.38);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  fixture.advance(new Vector3(0, 0, 1));
  assert.ok(fixture.player.object.position.z > 2);
});

test('the carried crate stops the whole player before a wall', () => {
  const wall = new Mesh(new BoxGeometry(4, 3, 0.2), new MeshBasicMaterial());
  wall.position.set(0, 1.5, 2);
  const fixture = new CarryingFixture([wall]);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  fixture.advance(new Vector3(0, 0, 1));
  assert.ok(fixture.player.object.position.z > 0.7);
  assert.ok(fixture.player.object.position.z < 0.9);
  assert.equal(fixture.world.hasBoxCollision(fixture.crate.collider), false);
});

test('turning beside a wall keeps the crate outside the wall and attached to the player', () => {
  const wall = new Mesh(new BoxGeometry(0.1, 3, 5), new MeshBasicMaterial());
  wall.position.set(0.6, 1.5, 1);
  const fixture = new CarryingFixture([wall]);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  for (let step = 0; step < 120; step++) {
    fixture.player.update(1 / 120, new Vector3(), Math.PI / 2);
    assert.equal(fixture.world.hasBoxCollision(fixture.crate.collider), false);
    const offset = fixture.crate.collider.center.clone().sub(fixture.player.object.position);
    assert.ok(Math.abs(Math.hypot(offset.x, offset.z) - 0.76) < 0.001);
  }
});

test('diagonal input does not increase carrying speed', () => {
  const fixture = new CarryingFixture();
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  fixture.advance(new Vector3(1, 0, 1));
  const position = fixture.player.object.position;
  assert.ok(Math.abs(Math.hypot(position.x, position.z) - 2.5) < 0.001);
});

for (const direction of [new Vector3(-1, 0, 0), new Vector3(1, 0, 0), new Vector3(0, 0, -1)]) {
  test('lateral and backward movement preserve facing: ' + direction.toArray(), () => {
    for (const isCarrying of [false, true]) {
      const fixture = new CarryingFixture();
      if (isCarrying) assert.equal(fixture.player.tryPickUp(fixture.crate), true);
      fixture.advance(direction);
      assert.equal(fixture.player.object.rotation.y, 0);
      assert.ok(fixture.player.object.position.dot(direction) > 2);
    }
  });
}

test('carried crate blocks turning in place', () => {
  const wall = new Mesh(new BoxGeometry(0.1, 3, 5), new MeshBasicMaterial());
  wall.position.set(0.6, 1.5, 1);
  const fixture = new CarryingFixture([wall]);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  for (let step = 0; step < 120; step++) fixture.player.update(1 / 120, new Vector3(), Math.PI / 2);
  assert.ok(fixture.player.object.rotation.y > 0);
  assert.ok(fixture.player.object.rotation.y < Math.PI / 2 - 0.1);
  assert.equal(fixture.world.hasBoxCollision(fixture.crate.collider), false);
});
