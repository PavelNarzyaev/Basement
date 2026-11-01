import assert from 'node:assert/strict';
import { test } from 'node:test';
import { BoxGeometry, Group, MeshStandardMaterial, Skeleton, SkinnedMesh, Texture } from 'three';
import { Object3DDisposer } from '../runtime/Object3DDisposer';

test('shared model resources are released once across multiple roots', (context) => {
  class Bitmap {
    closeCount = 0;
    close() { this.closeCount++; }
  }
  const original = Object.getOwnPropertyDescriptor(globalThis, 'ImageBitmap');
  Object.defineProperty(globalThis, 'ImageBitmap', { configurable: true, value: Bitmap });
  context.after(() => {
    if (original) Object.defineProperty(globalThis, 'ImageBitmap', original);
    else Reflect.deleteProperty(globalThis, 'ImageBitmap');
  });
  const bitmap = new Bitmap();
  const texture = new Texture(bitmap);
  const secondTexture = new Texture(bitmap);
  const geometry = new BoxGeometry();
  const material = new MeshStandardMaterial({ map: texture, emissiveMap: secondTexture });
  const skeleton = new Skeleton([]);
  const mesh = new SkinnedMesh(geometry, material);
  mesh.skeleton = skeleton;
  const scene = new Group();
  scene.add(mesh.clone(), mesh.clone());
  const counts = new Map<string, number>();
  for (const [name, resource] of [
    ['geometry', geometry], ['material', material], ['texture', texture], ['secondTexture', secondTexture],
  ] as const) {
    resource.addEventListener('dispose', () => counts.set(name, (counts.get(name) ?? 0) + 1));
  }
  const skeletonDisposal = context.mock.method(skeleton, 'dispose');
  new Object3DDisposer().dispose(scene, mesh);
  for (const count of counts.values()) assert.equal(count, 1);
  assert.equal(counts.size, 4);
  assert.equal(skeletonDisposal.mock.callCount(), 1);
  assert.equal(bitmap.closeCount, 1);
});
