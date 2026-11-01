import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, Mesh, Ray, Sphere, Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { CollisionWorld } from '../runtime/CollisionWorld';
import { YawBoxDto } from '../contracts/YawBoxDto';

test('excludes non-solid objects and their children from every collision query', () => {
  for (const hasCustomProperties of [true, false]) {
    const model = new Group();
    const zone = new Group();
    if (hasCustomProperties) zone.userData.collision = false;
    else zone.name = 'TrolleyCargoZone';
    zone.add(new Mesh(new BoxGeometry(2, 2, 2)));
    model.add(zone);
    const wall = new Mesh(new BoxGeometry(2, 2, 2));
    wall.position.x = 5;
    model.add(wall);
    const world = new CollisionWorld(model);
    assert.equal(world.hasBoxCollision(new YawBoxDto(new Vector3(0.9, 0, 0), new Vector3(0.2, 0.2, 0.2))), false);
    assert.equal(world.hasSphereCollision(new Sphere(new Vector3(0.9, 0, 0), 0.2)), false);
    assert.equal(world.intersectCapsule(new Capsule(new Vector3(0.9, -0.3, 0), new Vector3(0.9, 0.3, 0), 0.2)), false);
    const hit = world.castRay(new Ray(new Vector3(-3, 0, 0), new Vector3(1, 0, 0)))!;
    assert.equal(hit.position.x, 4);
    assert.equal(world.hasSphereCollision(new Sphere(new Vector3(4, 0, 0), 0.2)), true);
    world.dispose();
    model.traverse(object => { if (object instanceof Mesh) object.geometry.dispose(); });
  }
});
