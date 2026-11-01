import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { Object3D, PerspectiveCamera, Vector3 } from 'three';
import { Bombardment } from '../runtime/Bombardment';

class AudioSource {
  buffer: AudioBuffer | undefined;
  loop = false;
  startTime = 0;
  isStopped = false;
  onended: (() => void) | undefined;
  connect(): void {}
  disconnect(): void {}
  start(time: number): void { this.startTime = time; }
  stop(): void { this.isStopped = true; }
}

class AudioClock {
  currentTime = 0;
  destination = {};
  sources: AudioSource[] = [];
  createBufferSource(): AudioSource {
    const source = new AudioSource();
    this.sources.push(source);
    return source;
  }
  createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  async resume(): Promise<void> {}
  async close(): Promise<void> {}
}

function createFixture(context: TestContext) {
  const clock = new AudioClock();
  const page = Object.assign(new EventTarget(), { hidden: false });
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
  const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  Object.defineProperty(globalThis, 'document', { configurable: true, value: page });
  Object.defineProperty(globalThis, 'AudioContext', {
    configurable: true, value: class { constructor() { return clock; } },
  });
  context.after(() => {
    if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
    else Reflect.deleteProperty(globalThis, 'document');
    if (originalAudioContext) Object.defineProperty(globalThis, 'AudioContext', originalAudioContext);
    else Reflect.deleteProperty(globalThis, 'AudioContext');
  });
  const strengths: number[] = [];
  let burstCount = 0;
  let resetCount = 0;
  const bombardment = new Bombardment(
    {
      object: new Object3D(), initialize() {}, setSettings() {}, update() {}, dispose() {},
      setImpactStrength(strength) { strengths.push(strength); },
    },
    {
      object: new Object3D(), initialize() {}, update() {}, dispose() {},
      burst() { burstCount++; }, reset() { resetCount++; },
    },
  );
  // Supply decoded assets without involving network or browser audio decoding.
  const buffers = (bombardment as unknown as { buffers: Map<string, AudioBuffer> }).buffers;
  for (const name of ['background', 'siren', 'bomb-whistle', 'bomb-explosion']) {
    buffers.set(name, { duration: name === 'bomb-whistle' ? 2 : 1 } as AudioBuffer);
  }
  context.after(() => bombardment.dispose());
  return {
    clock, page, bombardment, strengths,
    get burstCount() { return burstCount; },
    get resetCount() { return resetCount; },
    update(time: number) {
      clock.currentTime = time;
      bombardment.update(new PerspectiveCamera(), new Vector3());
    },
    setHidden(isHidden: boolean) {
      page.hidden = isHidden;
      page.dispatchEvent(new Event('visibilitychange'));
    },
  };
}

test('normal scheduling keeps sound and visual impacts synchronized', (context) => {
  const fixture = createFixture(context);
  fixture.bombardment.start();
  assert.deepEqual(fixture.clock.sources.map(source => source.startTime), [0, 50, 13, 15.2]);
  fixture.update(15);
  assert.equal(fixture.burstCount, 1);
  assert.equal(fixture.strengths.at(-1), 1);
  fixture.update(27);
  assert.deepEqual(fixture.clock.sources.slice(-2).map(source => source.startTime), [28, 30.2]);
});

for (const returnTime of [14.9, 65]) {
  test(`return at ${returnTime}s starts a full new interval and preserves ambient audio`, (context) => {
    const fixture = createFixture(context);
    fixture.bombardment.start();
    const originalSources = [...fixture.clock.sources];
    fixture.setHidden(true);
    assert.deepEqual(originalSources.map(source => source.isStopped), [false, false, true, true]);
    fixture.update(returnTime);
    assert.equal(fixture.clock.sources.length, 4);
    fixture.setHidden(false);
    const [whistle, explosion] = fixture.clock.sources.slice(-2);
    assert.ok(Math.abs(whistle!.startTime - (returnTime + 13)) < 1e-10);
    assert.ok(Math.abs(explosion!.startTime - (returnTime + 15.2)) < 1e-10);
    fixture.update(returnTime + 14.9);
    assert.equal(fixture.burstCount, 0);
    fixture.update(returnTime + 15.001);
    assert.equal(fixture.burstCount, 1);
    assert.ok(fixture.strengths.at(-1)! > 0.99);
    assert.equal(fixture.resetCount, 3);
  });
}

test('65 seconds without frames skips missed whistles and explosions', (context) => {
  const fixture = createFixture(context);
  fixture.bombardment.start();
  fixture.update(65);
  assert.equal(fixture.clock.sources.length, 4);
  assert.equal(fixture.burstCount, 0);
  fixture.update(72);
  assert.deepEqual(fixture.clock.sources.slice(-2).map(source => source.startTime), [73, 75.2]);
  fixture.update(75);
  assert.equal(fixture.burstCount, 1);
});

test('restart stops previous audio and starts a new interval', (context) => {
  const fixture = createFixture(context);
  fixture.bombardment.start();
  const originalSources = [...fixture.clock.sources];
  fixture.clock.currentTime = 7;
  fixture.bombardment.start();
  assert.ok(originalSources.every(source => source.isStopped));
  assert.deepEqual(fixture.clock.sources.slice(-4).map(source => source.startTime), [7, 57, 20, 22.2]);
  fixture.update(15);
  assert.equal(fixture.burstCount, 0);
});

test('visibility changes before start and after disposal do not schedule audio', (context) => {
  const fixture = createFixture(context);
  fixture.setHidden(true);
  fixture.setHidden(false);
  assert.equal(fixture.clock.sources.length, 0);
  fixture.bombardment.start();
  fixture.bombardment.dispose();
  fixture.setHidden(true);
  fixture.setHidden(false);
  assert.equal(fixture.clock.sources.length, 4);
});
