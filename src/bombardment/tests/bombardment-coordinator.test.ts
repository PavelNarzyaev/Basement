import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { Bombardment } from '../runtime/Bombardment';
import type { IBombardmentAudio } from '../contracts/IBombardmentAudio';

test('coordinator schedules and restarts using injected clocks without Web Audio', (context) => {
  const page = Object.assign(new EventTarget(), { hidden: false });
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: page });
  context.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
  });
  const clock = { currentTime: 0 };
  const impacts: number[] = [];
  const starts: number[] = [];
  const strengths: number[] = [];
  let burstCount = 0;
  const audio: IBombardmentAudio = {
    whistleDuration: 2,
    async load() {},
    start(time) { starts.push(time); },
    scheduleImpact(time) { impacts.push(time); },
    stopImpacts() {}, dispose() {},
  };
  const bombardment = new Bombardment({
    object: new Object3D(), initialize() {}, setSettings() {}, update() {}, dispose() {},
    setImpactStrength(strength) { strengths.push(strength); },
  }, {
    object: new Object3D(), initialize() {}, update() {}, dispose() {}, reset() {},
    burst() { burstCount++; },
  }, audio, clock);
  context.after(() => bombardment.dispose());
  bombardment.start();
  assert.deepEqual(impacts, [15]);
  const camera = new PerspectiveCamera();
  clock.currentTime = 65;
  bombardment.update(camera, new Vector3());
  assert.deepEqual(impacts, [15]);
  assert.equal(burstCount, 0);
  clock.currentTime = 72;
  bombardment.update(camera, new Vector3());
  assert.deepEqual(impacts, [15, 75]);
  bombardment.start();
  assert.deepEqual(starts, [0, 72]);
  assert.deepEqual(impacts, [15, 75, 87]);
  assert.equal(strengths.at(-1), 0);
  const rotation = camera.quaternion.clone();
  clock.currentTime = 75;
  bombardment.update(camera, new Vector3());
  assert.ok(camera.quaternion.equals(rotation));
  clock.currentTime = 87;
  bombardment.update(camera, new Vector3());
  assert.equal(burstCount, 1);
  assert.equal(strengths.at(-1), 1);
});
