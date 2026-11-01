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
  closeCount = 0;
  async decodeAudioData(): Promise<AudioBuffer> { return { duration: 2 } as AudioBuffer; }
  createBufferSource(): AudioSource {
    const source = new AudioSource();
    this.sources.push(source);
    return source;
  }
  createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  async resume(): Promise<void> {}
  async close(): Promise<void> { this.closeCount++; }
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
    '/',
  );
  // Supply decoded assets without involving network or browser audio decoding.
  const buffers = (bombardment as unknown as { buffers: Map<string, AudioBuffer> }).buffers;
  for (const name of ['background', 'siren', 'bomb-whistle', 'bomb-explosion']) {
    buffers.set(name, { duration: name === 'bomb-whistle' ? 2 : 1 } as AudioBuffer);
  }
  context.after(() => bombardment.dispose());
  return {
    clock, page, bombardment, strengths, buffers,
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

for (const restartTime of [13.5, 15.3, 50.5]) {
  test(`restart during effects at ${restartTime}s clears the previous impact`, (context) => {
    const fixture = createFixture(context);
    fixture.bombardment.start();
    fixture.update(restartTime);
    const previousSources = [...fixture.clock.sources];
    const previousBurstCount = fixture.burstCount;
    const previousResetCount = fixture.resetCount;

    fixture.bombardment.start();
    assert.ok(previousSources.every(source => source.isStopped));
    assert.equal(fixture.strengths.at(-1), 0);
    assert.equal(fixture.resetCount, previousResetCount + 1);
    assert.deepEqual(fixture.clock.sources.slice(-4).map(source => source.startTime),
      [restartTime, restartTime + 50, restartTime + 13, restartTime + 15.2]);

    // Old audio completion events can arrive after the new sources have started.
    previousSources.forEach(source => source.onended!());
    const camera = new PerspectiveCamera();
    const initialRotation = camera.quaternion.clone();
    fixture.clock.currentTime = restartTime + 0.1;
    fixture.bombardment.update(camera, new Vector3());
    assert.ok(camera.quaternion.equals(initialRotation));
    assert.equal(fixture.burstCount, previousBurstCount);
    assert.equal(fixture.strengths.at(-1), 0);

    fixture.update(restartTime + 15);
    assert.equal(fixture.burstCount, previousBurstCount + 1);
    assert.equal(fixture.strengths.at(-1), 1);
    const newSources = fixture.clock.sources.slice(-4);
    fixture.bombardment.start();
    assert.ok(newSources.every(source => source.isStopped));
  });
}

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

for (const stage of ['fetch', 'body', 'decode'] as const) {
  test(`disposal during sound ${stage} discards late results and aborts requests`, async (context) => {
    const fixture = createFixture(context);
    fixture.buffers.clear();
    let release!: () => void;
    const gate = new Promise<void>(resolve => { release = resolve; });
    const signals: AbortSignal[] = [];
    context.mock.method(globalThis, 'fetch', async (_url: string, options: RequestInit) => {
      signals.push(options.signal!);
      if (stage === 'fetch') await gate;
      return {
        ok: true,
        async arrayBuffer() {
          if (stage === 'body') await gate;
          return new ArrayBuffer(0);
        },
      };
    });
    context.mock.method(fixture.clock, 'decodeAudioData', async () => {
      if (stage === 'decode') await gate;
      return { duration: 2 } as AudioBuffer;
    });
    const loading = fixture.bombardment.load();
    const rejection = assert.rejects(loading, { name: 'AbortError' });
    await new Promise(resolve => setImmediate(resolve));
    fixture.bombardment.dispose();
    assert.ok(signals.every(signal => signal.aborted));
    release();
    await rejection;
    assert.equal(fixture.buffers.size, 0);
    assert.equal(fixture.clock.closeCount, 1);
    assert.equal(fixture.clock.sources.length, 0);
  });
}

for (const name of ['background', 'bomb-whistle', 'bomb-explosion', 'siren']) {
  for (const stage of ['fetch', 'body', 'decode'] as const) {
    test(`${name} ${stage} failure releases all audio assets`, async (context) => {
      const fixture = createFixture(context);
      fixture.buffers.clear();
      const failure = new Error('Asset failure');
      const signals: AbortSignal[] = [];
      context.mock.method(globalThis, 'fetch', async (url: string, options: RequestInit) => {
        signals.push(options.signal!);
        const isFailedAsset = url.endsWith(`/${name}.mp3`);
        if (isFailedAsset && stage === 'fetch') throw failure;
        return {
          ok: true,
          async arrayBuffer() {
            if (isFailedAsset && stage === 'body') throw failure;
            return new Uint8Array([isFailedAsset ? 1 : 0]).buffer;
          },
        };
      });
      context.mock.method(fixture.clock, 'decodeAudioData', async (data: ArrayBuffer) => {
        if (new Uint8Array(data)[0] === 1 && stage === 'decode') throw failure;
        return { duration: 2 } as AudioBuffer;
      });
      await assert.rejects(fixture.bombardment.load(), failure);
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(fixture.buffers.size, 0);
      assert.ok(signals.every(signal => signal.aborted));
      fixture.bombardment.dispose();
      assert.equal(fixture.clock.closeCount, 1);
    });
  }
}

test('invalid whistle duration releases decoded audio assets', async (context) => {
  const fixture = createFixture(context);
  fixture.buffers.clear();
  context.mock.method(globalThis, 'fetch', async () => new Response(new ArrayBuffer(0)));
  context.mock.method(fixture.clock, 'decodeAudioData', async () => ({ duration: 16 }) as AudioBuffer);
  await assert.rejects(fixture.bombardment.load(), /whistle must fit/);
  assert.equal(fixture.buffers.size, 0);
  assert.equal(fixture.clock.closeCount, 1);
});
