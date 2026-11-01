import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Box3, Scene, Vector3 } from 'three';
import { DustSettingsDto } from '../contracts/DustSettingsDto';
import { DustVolumeDto } from '../contracts/DustVolumeDto';
import { DustEffect } from '../runtime/DustEffect';

function createDust() {
  const dust = new DustEffect();
  dust.initialize(new DustVolumeDto(
    new Box3(new Vector3(-5, 0, -20), new Vector3(5, 6, 20)),
  ));
  return dust;
}

test('bombardment settings blend in and settle back without replacing particle buffers', () => {
  const dust = createDust();
  const positions = dust.object.geometry.getAttribute('position');
  const uniforms = dust.object.material.uniforms;
  const restingDensity = uniforms.density!.value;
  dust.setSettings(new DustSettingsDto(1, 0.7, 0.2, 0.6));
  dust.update(1 / 60);
  assert.ok(uniforms.density!.value > restingDensity);
  assert.ok(uniforms.density!.value < 1);
  for (let frame = 0; frame < 300; frame++) dust.update(1 / 60);
  assert.ok(Math.abs(uniforms.density!.value - 1) < 0.001);
  assert.ok(Math.abs(uniforms.turbulence!.value - 0.6) < 0.001);
  dust.setSettings(new DustSettingsDto());
  for (let frame = 0; frame < 300; frame++) dust.update(1 / 60);
  assert.ok(Math.abs(uniforms.density!.value - restingDensity) < 0.001);
  assert.ok(Math.abs(uniforms.opacity!.value - new DustSettingsDto().opacity) < 0.001);
  assert.equal(dust.object.geometry.getAttribute('position'), positions);
  dust.dispose();
});

test('transitions are consistent at different frame rates and ignore background-tab time', () => {
  const slow = createDust();
  const fast = createDust();
  for (const dust of [slow, fast]) dust.setSettings(new DustSettingsDto(0.9));
  for (let frame = 0; frame < 30; frame++) slow.update(1 / 30);
  for (let frame = 0; frame < 120; frame++) fast.update(1 / 120);
  assert.ok(Math.abs(slow.object.material.uniforms.density!.value - fast.object.material.uniforms.density!.value) < 1e-6);
  const elapsed = slow.object.material.uniforms.elapsedTime!.value;
  slow.update(60);
  assert.ok(slow.object.material.uniforms.elapsedTime!.value - elapsed < 0.11);
  slow.dispose();
  fast.dispose();
});

test('disposing dust detaches it and releases both GPU resources', () => {
  const dust = createDust();
  const scene = new Scene();
  scene.add(dust.object);
  let isGeometryDisposed = false;
  let isMaterialDisposed = false;
  dust.object.geometry.addEventListener('dispose', () => { isGeometryDisposed = true; });
  dust.object.material.addEventListener('dispose', () => { isMaterialDisposed = true; });
  dust.dispose();
  assert.equal(dust.object.parent, null);
  assert.ok(isGeometryDisposed);
  assert.ok(isMaterialDisposed);
});
