import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Group, Vector3 } from 'three';
import { BasementGeometryFixture } from '../../carrying/tests/BasementGeometryFixture';
import { MovableCrate } from '../../carrying/runtime/MovableCrate';
import { CollisionWorld } from '../../collision/runtime/CollisionWorld';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import { CrateScatterer } from '../runtime/CrateScatterer';

test('scatters five separate carryable crates on free basement floor across random layouts', async () => {
  const [basement, template] = await Promise.all([
    BasementGeometryFixture.loadGeometry('../../../public/models/basement/basement.glb'),
    BasementGeometryFixture.loadGeometry('../../../public/models/crate/Crate.glb'),
  ]);
  assert.equal(basement.getObjectByName('MovableCrate'), undefined);
  assert.ok(template.getObjectByName('MovableCrate'));
  const spawn = new PlayerSpawnDto(new Vector3(0, 0.154292, -13), Math.PI);
  let seed = 12345;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const scatterer = new CrateScatterer({ create: (model, boxes) => new CollisionWorld(model, boxes) }, random);
  const layouts = new Set<string>();
  for (let layout = 0; layout < 2; layout++) {
    const crates = scatterer.scatter(basement, template, spawn, 5);
    assert.equal(crates.length, 5);
    layouts.add(JSON.stringify(crates.map((crate) => crate.position.toArray())));
    const scene = new Group();
    scene.add(...crates);
    const carryables = crates.map((crate) => new MovableCrate(crate));
    const world = new CollisionWorld(basement, carryables.map((crate) => crate.collider));
    for (const crate of carryables) {
      assert.equal(world.hasBoxCollision(crate.collider), false);
      assert.ok(Math.abs(crate.collider.center.y - crate.collider.halfSize.y - 0.109292) < 0.001);
      assert.ok(Math.hypot(crate.collider.center.x - spawn.position.x, crate.collider.center.z - spawn.position.z) >= 1.5);
    }
    world.dispose();
  }
  assert.equal(layouts.size, 2);
});

test('fails explicitly when the environment has no supporting floor', () => {
  const scatterer = new CrateScatterer({ create: (model, boxes) => new CollisionWorld(model, boxes) });
  assert.throws(() => scatterer.scatter(new Group(), new Group(), new PlayerSpawnDto(new Vector3(), 0), 5), /Could only place 0 of 5/);
});
