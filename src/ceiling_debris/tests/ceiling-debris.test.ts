import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Matrix4, Vector3 } from 'three';
import { CeilingDebris } from '../runtime/CeilingDebris';

test('debris starts above the ceiling, falls below the floor and stops updating', () => {
  const debris = new CeilingDebris();
  debris.initialize(0, 4);
  debris.burst(new Vector3(0, 1.5, 0));
  assert.equal(debris.object.count, 120);
  const matrix = new Matrix4();
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
  debris.burst(new Vector3(2, 1.5, 3));
  assert.equal(debris.object.count, 120);
  debris.reset();
  assert.equal(debris.object.count, 0);
  debris.dispose();
});
