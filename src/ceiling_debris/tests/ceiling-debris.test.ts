import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Matrix4, Vector3 } from 'three';
import { CeilingDebris } from '../runtime/CeilingDebris';

test('debris starts above the ceiling, falls below the floor and stops updating', () => {
  const debris = new CeilingDebris();
  debris.initialize(new Box3(new Vector3(-15, 0, -30), new Vector3(15, 4, 30)));
  debris.burst(new Vector3(), new Vector3(0, -0.5, -1));
  assert.equal(debris.object.count, 120);
  const matrix = new Matrix4();
  for (let index = 0; index < debris.object.count; index++) {
    debris.object.getMatrixAt(index, matrix);
    assert.ok(matrix.elements[12]! >= -14 && matrix.elements[12]! <= 14);
    assert.ok(matrix.elements[14]! >= -29 && matrix.elements[14]! <= 29);
    const distance = Math.hypot(matrix.elements[12]!, matrix.elements[14]!);
    assert.ok(distance >= 10 - 1e-5 && distance <= 25 + 1e-5);
    assert.ok(Math.abs(Math.atan2(matrix.elements[12]!, -matrix.elements[14]!)) <= 25 * Math.PI / 180 + 1e-5);
  }
  debris.object.getMatrixAt(0, matrix);
  assert.ok(Math.abs(matrix.elements[13]! - 4.1) < 1e-5);
  let hasFallingDebris = false;
  let hasDebrisBelowFloor = false;
  for (let frame = 0; frame < 180; frame++) {
    debris.update(1 / 60);
    for (let index = 0; index < debris.object.count; index++) {
      debris.object.getMatrixAt(index, matrix);
      if (matrix.elements[0] === 0 && matrix.elements[1] === 0 && matrix.elements[2] === 0) continue;
      const height = matrix.elements[13]!;
      assert.ok(height > -0.1 && height <= 4.1 + 1e-5);
      hasFallingDebris ||= height < 4;
      hasDebrisBelowFloor ||= height < 0;
    }
  }
  assert.ok(hasFallingDebris);
  assert.ok(hasDebrisBelowFloor);
  assert.equal(debris.object.count, 0);
  debris.burst(new Vector3(), new Vector3(0, 0, 1));
  assert.equal(debris.object.count, 120);
  debris.reset();
  assert.equal(debris.object.count, 0);
  debris.dispose();
});

test('patches outside the room are skipped without generating replacement positions', (context) => {
  let randomCalls = 0;
  const debris = new CeilingDebris();
  debris.initialize(new Box3(new Vector3(-5, 0, -25), new Vector3(5, 4, 25)));
  context.mock.method(Math, 'random', () => ++randomCalls % 2 === 1 ? 0.5 : 0.99);
  debris.burst(new Vector3(), new Vector3(0, 0, -1));
  assert.equal(debris.object.count, 0);
  assert.equal(randomCalls, 12);
  debris.dispose();
});
