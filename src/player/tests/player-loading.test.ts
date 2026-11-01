import assert from 'node:assert/strict';
import { test } from 'node:test';
import { AnimationClip, Box3, BoxGeometry, Group, MeshStandardMaterial, Skeleton, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import type { ICarryPlacement } from '../../carrying/contracts/ICarryPlacement';
import type { ICollisionWorld } from '../../collision/contracts/ICollisionWorld';
import { Object3DDisposer } from '../../disposer/runtime/Object3DDisposer';
import { PlayerSpawnDto } from '../contracts/PlayerSpawnDto';
import { PlayerFactory } from '../runtime/PlayerFactory';

for (const outcome of ['cancel', 'download-error', 'invalid-clips', 'player-error', 'success'] as const) {
  test(`player loading handles ${outcome} and releases owned resources`, async (context) => {
    const model = new Group();
    const mesh = new SkinnedMesh(new BoxGeometry(), new MeshStandardMaterial());
    mesh.skeleton = new Skeleton([]);
    model.add(mesh);
    let geometryDisposals = 0;
    mesh.geometry.addEventListener('dispose', () => geometryDisposals++);
    const skeletonDisposal = context.mock.method(mesh.skeleton, 'dispose');
    const controller = new AbortController();
    let complete!: () => void;
    const gate = new Promise<void>(resolve => { complete = resolve; });
    let reportProgress!: (event: ProgressEvent) => void;
    context.mock.method(GLTFLoader.prototype, 'loadAsync', async (_url: string, onProgress: (event: ProgressEvent) => void) => {
      reportProgress = onProgress;
      await gate;
      if (outcome === 'download-error') throw new Error('Download failure');
      return {
        scene: model,
        animations: outcome === 'invalid-clips' ? []
          : ['Idle', 'Move', 'CarryIdle', 'CarryMove'].map(name => new AnimationClip(name, 1, [])),
      } as unknown as GLTF;
    });
    const world = {
      get bounds() {
        if (outcome === 'player-error') throw new Error('Player initialization failure');
        return new Box3(new Vector3(-10, 0, -10), new Vector3(10, 4, 10));
      },
    } as ICollisionWorld;
    let progressCount = 0;
    const factory = new PlayerFactory(new Object3DDisposer(), '/');
    const loading = factory.create(world, new PlayerSpawnDto(new Vector3(), 0), {} as ICarryPlacement,
      () => progressCount++, controller.signal);
    if (outcome === 'cancel') {
      controller.abort();
      reportProgress({ lengthComputable: true, loaded: 1, total: 1 } as ProgressEvent);
    }
    complete();
    if (outcome === 'success') {
      const player = await loading;
      assert.equal(geometryDisposals, 0);
      player.dispose();
    } else {
      const expectedErrors = {
        cancel: { name: 'AbortError' },
        'download-error': /Download failure/,
        'invalid-clips': /missing the Idle animation/,
        'player-error': /Player initialization failure/,
      };
      await assert.rejects(loading, expectedErrors[outcome]);
    }
    assert.equal(progressCount, 0);
    const expectedDisposals = outcome === 'download-error' ? 0 : 1;
    assert.equal(geometryDisposals, expectedDisposals);
    assert.equal(skeletonDisposal.mock.callCount(), expectedDisposals);
    if (outcome === 'download-error') new Object3DDisposer().dispose(model);
  });
}
