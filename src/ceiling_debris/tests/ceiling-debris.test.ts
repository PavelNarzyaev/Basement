import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, Matrix4, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { CeilingDebris } from '../runtime/CeilingDebris';

test('debris falls from the ceiling and disappears before passing through the floor', () => {
  const model = new Group();
  const geometry = new BoxGeometry(30, 0.2, 30);
  const material = new MeshStandardMaterial();
  const floor = new Mesh(geometry, material);
  const ceiling = new Mesh(geometry, material);
  ceiling.position.y = 4;
  model.add(floor, ceiling);
  const debris = new CeilingDebris();
  debris.initialize(model);
  debris.burst(new Vector3(0, 1.5, 0));
  assert.equal(debris.object.count, 120);
  const matrix = new Matrix4();
  let hasFallingDebris = false;
  for (let frame = 0; frame < 180; frame++) {
    debris.update(1 / 60);
    for (let index = 0; index < debris.object.count; index++) {
      debris.object.getMatrixAt(index, matrix);
      if (matrix.elements[0] === 0 && matrix.elements[1] === 0 && matrix.elements[2] === 0) continue;
      const height = matrix.elements[13]!;
      assert.ok(height > 0.1 && height < 3.9);
      hasFallingDebris = true;
    }
  }
  assert.ok(hasFallingDebris);
  for (let index = 0; index < debris.object.count; index++) {
    debris.object.getMatrixAt(index, matrix);
    assert.equal(Math.abs(matrix.elements[0]!), 0);
  }
  debris.reset();
  assert.equal(debris.object.count, 0);
  debris.dispose();
  geometry.dispose();
  material.dispose();
});

test('open sky does not emit debris', () => {
  const debris = new CeilingDebris();
  debris.initialize(new Group());
  debris.burst(new Vector3(0, 1.5, 0));
  assert.equal(debris.object.count, 0);
  debris.dispose();
});
