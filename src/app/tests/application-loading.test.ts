import { GameplaySession } from '../runtime/GameplaySession';
import assert from 'node:assert/strict';
import { test, type TestContext } from 'node:test';
import { Object3D, Scene, Vector3 } from 'three';
import { SceneLoadResultDto } from '../../scenes/contracts/SceneLoadResultDto';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import { Application } from '../runtime/Application';

function createFixture(context: TestContext, stage: 'scene' | 'player' | 'audio') {
  let finish!: () => void;
  let fail!: (error: Error) => void;
  const gate = new Promise<void>((resolve, reject) => { finish = resolve; fail = reject; });
  const disposals = new Map<string, number>();
  const recordDisposal = (name: string) => disposals.set(name, (disposals.get(name) ?? 0) + 1);
  const status = {
    className: '', textContent: '', hidden: false, role: '', isRemoved: false,
    setAttribute(_name: string, value: string) { this.role = value; },
    remove() { this.isRemoved = true; },
  };
  for (const [name, value] of Object.entries({
    document: { createElement: () => status, body: { append() {} } },
    window: { devicePixelRatio: 1 },
    ResizeObserver: class {
      observe() {}
      disconnect() { recordDisposal('observer'); }
    },
  })) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    Object.defineProperty(globalThis, name, { configurable: true, value });
    context.after(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else Reflect.deleteProperty(globalThis, name);
    });
  }
  const progressCallbacks: ((percentage: number) => void)[] = [];
  const player = { object: new Object3D(), dispose() { recordDisposal('player'); } };
  const world = { dispose() { recordDisposal('world'); } };
  const scene = {
    scene: new Scene(),
    async load(onProgress: (percentage: number) => void) {
      progressCallbacks.push(onProgress);
      if (stage === 'scene') await gate;
      return new SceneLoadResultDto(new Object3D(), new PlayerSpawnDto(new Vector3(), 0), [], new OrientedBoxDto(new Vector3(), new Vector3(1, 1, 1), 0));
    },
    dispose() { recordDisposal('scene'); },
  };
  const overlay = (name: string) => ({
    resize() {}, dispose() { recordDisposal(name); },
  });
  let hasOpenedDialog = false;
  const dialog = { ...overlay('dialog'), open() { hasOpenedDialog = true; } };
  let signal!: AbortSignal;
  const factory = {
    createSession(player: never, world: never, crates: never, camera: never, sceneResult: SceneLoadResultDto) {
      return new GameplaySession({} as never, scene.scene, camera, {} as never, {} as never, factory as never, {} as never, audio as never, player, world, crates, sceneResult);
    },
    createCollisionWorld() { return world; },
    async createPlayer(_world: unknown, _spawn: unknown, onProgress: (percentage: number) => void, loadingSignal: AbortSignal) {
      signal = loadingSignal;
      progressCallbacks.push(onProgress);
      if (stage === 'player') await gate;
      return player;
    },
    createInteractionController() { return {}; },
    createCameraController() { return { update() {} }; },
  };
  const audio = {
    async load() { if (stage === 'audio') await gate; },
    dispose() { recordDisposal('audio'); },
  };
  let animationLoop: unknown;
  const renderer = {
    setAnimationLoop(callback: unknown) { animationLoop = callback; },
    setPixelRatio() {}, setSize() {}, dispose() { recordDisposal('renderer'); },
  };
  const args = [
    { getBoundingClientRect: () => ({ width: 800, height: 600 }) },
    scene, overlay('joystick'), overlay('prompt'), dialog, factory,
    { dispose() { recordDisposal('objective'); } }, audio, renderer,
  ] as unknown as ConstructorParameters<typeof Application>;
  const application = new Application(...args);
  context.after(() => application.dispose());
  return {
    application, status, disposals, progressCallbacks, finish, fail,
    get signal() { return signal; },
    get hasOpenedDialog() { return hasOpenedDialog; },
    get animationLoop() { return animationLoop; },
  };
}

for (const stage of ['scene', 'player', 'audio'] as const) {
  for (const shouldReject of [false, true]) {
    test(`disposal during ${stage} loading handles late ${shouldReject ? 'failure' : 'success'}`, async (context) => {
      const fixture = createFixture(context, stage);
      const errors = context.mock.method(console, 'error', () => {});
      await new Promise(resolve => setImmediate(resolve));
      fixture.application.dispose();
      const previousText = fixture.status.textContent;
      fixture.progressCallbacks.forEach(callback => callback(100));
      if (shouldReject) fixture.fail(new Error('Late failure'));
      else fixture.finish();
      await new Promise(resolve => setImmediate(resolve));
      assert.equal(fixture.status.textContent, previousText);
      assert.equal(fixture.hasOpenedDialog, false);
      assert.equal(fixture.animationLoop, null);
      assert.equal(errors.mock.callCount(), 0);
      if (stage !== 'scene') assert.equal(fixture.signal.aborted, true);
      fixture.application.dispose();
      for (const count of fixture.disposals.values()) assert.equal(count, 1);
      if (stage !== 'scene' && !(stage === 'player' && shouldReject)) {
        assert.equal(fixture.disposals.get('player'), 1);
      }
    });
  }

  test(`${stage} failure stops rendering and releases all initialized resources`, async (context) => {
    const fixture = createFixture(context, stage);
    const errors = context.mock.method(console, 'error', () => {});
    await new Promise(resolve => setImmediate(resolve));
    fixture.fail(new Error('Load failure'));
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(fixture.animationLoop, null);
    assert.equal(fixture.status.role, 'alert');
    assert.equal(fixture.status.hidden, false);
    assert.equal(fixture.status.isRemoved, false);
    assert.equal(fixture.hasOpenedDialog, false);
    assert.equal(errors.mock.callCount(), 1);
    for (const name of ['scene', 'audio', 'renderer', 'observer', 'joystick', 'prompt', 'dialog', 'objective']) {
      assert.equal(fixture.disposals.get(name), 1, name);
    }
    const errorText = fixture.status.textContent;
    fixture.progressCallbacks.forEach(callback => callback(100));
    assert.equal(fixture.status.textContent, errorText);
    fixture.application.dispose();
    assert.equal(fixture.status.isRemoved, true);
    for (const count of fixture.disposals.values()) assert.equal(count, 1);
  });
}
