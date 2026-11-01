import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Triangle, Vector3 } from 'three';
import { Capsule } from 'three/addons/math/Capsule.js';
import { YawBoxDto } from '../contracts/YawBoxDto';
import { YawBoxCollision } from '../runtime/YawBoxCollision';

test('a rotated box uses its oriented footprint instead of its enclosing AABB', () => {
  const collision = new YawBoxCollision();
  const box = new YawBoxDto(new Vector3(), new Vector3(1, 0.5, 0.2), Math.PI / 4);
  const outside = new Triangle(new Vector3(0.6, -1, 0.6), new Vector3(0.7, 1, 0.6), new Vector3(0.6, 1, 0.7));
  assert.equal(collision.intersectsTriangle(box, outside), false);
  const inside = new Triangle(new Vector3(-0.1, 0, -0.1), new Vector3(0.1, 0, -0.1), new Vector3(0, 0, 0.1));
  assert.equal(collision.intersectsTriangle(box, inside), true);
});

test('capsule collision separates the player from a rotated resting crate', () => {
  const collision = new YawBoxCollision();
  const box = new YawBoxDto(new Vector3(0, 0.5, 0), new Vector3(0.6, 0.5, 0.2), Math.PI / 4);
  const center = new Vector3(0.6, 0, 0).applyAxisAngle(new Vector3(0, 1, 0), box.rotationY);
  const capsule = new Capsule(center.clone().add(new Vector3(0, 0.43, 0)), center.clone().add(new Vector3(0, 1.37, 0)), 0.43);
  const contact = collision.intersectCapsule(capsule, box);
  assert.ok(contact);
  capsule.translate(contact.normal.clone().multiplyScalar(contact.depth + 0.00001));
  assert.equal(collision.intersectCapsule(capsule, box), false);
});
