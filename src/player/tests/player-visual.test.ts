import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { Object3DResourceDisposer } from '../../disposer/runtime/Object3DResourceDisposer';
import { AnimationClip, AnimationMixer, BoxGeometry, Group, Mesh, MeshBasicMaterial, NumberKeyframeTrack, PropertyBinding, SkinnedMesh, Vector3 } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { CarryingFixture } from '../../carrying/tests/CarryingFixture';
import { PlayerVisual } from '../runtime/PlayerVisual';

function createVisual() {
  const object = new Group();
  const pose = new Group();
  pose.name = 'Pose';
  object.add(pose);
  const clips = ['Idle', 'Move', 'CarryIdle', 'CarryMove'].map((name, index) => new AnimationClip(name, 1, [
    new NumberKeyframeTrack('Pose.position[x]', [0, 1], [index * 10, index * 10]),
    new NumberKeyframeTrack('Pose.position[y]', [0, 1], [0, 1]),
  ]));
  const visual = new PlayerVisual(object, clips, { dispose() {} });
  return { visual, pose, clips };
}

test('selects all four clips and blends rapid transitions without losing total weight', () => {
  const { visual, pose } = createVisual();
  assert.equal(pose.position.x, 0);
  visual.update(1, 4, false);
  assert.ok(Math.abs(pose.position.x - 10) < 0.001);
  visual.update(1, 0, true);
  assert.ok(Math.abs(pose.position.x - 20) < 0.001);
  visual.update(1, 2.5, true);
  assert.ok(Math.abs(pose.position.x - 30) < 0.001);
  for (let frame = 0; frame < 30; frame++) {
    visual.update(1 / 60, frame % 2 ? 0 : 4, frame % 3 === 0);
    assert.ok(Number.isFinite(pose.position.x));
    assert.ok(pose.position.x >= 0 && pose.position.x <= 30);
  }
  visual.update(1, 0, false);
  assert.ok(Math.abs(pose.position.x) < 0.001);
  visual.dispose();
});

test('scales locomotion playback to analog movement speed', () => {
  const full = createVisual();
  const half = createVisual();
  full.visual.update(0.25, 4, false);
  half.visual.update(0.25, 2, false);
  assert.ok(Math.abs(full.pose.position.y - 0.25) < 0.001);
  assert.ok(Math.abs(half.pose.position.y - 0.125) < 0.002);
  full.visual.dispose();
  half.visual.dispose();
});

test('fails explicitly when a required clip is missing', () => {
  assert.throws(() => new PlayerVisual(new Group(), [], { dispose() {} }), /missing the Idle animation/);
});

test('anchors the model at the feet and reports collision-constrained speed and carrying state', () => {
  let speed = -1;
  let isCarrying = false;
  let isDisposed = false;
  const object = new Group();
  const wall = new Mesh(new BoxGeometry(4, 3, 0.2), new MeshBasicMaterial());
  wall.position.set(0, 1.5, 2);
  const fixture = new CarryingFixture([wall], {
    object,
    update(_delta, nextSpeed, carrying) { speed = nextSpeed; isCarrying = carrying; },
    dispose() { isDisposed = true; },
  });
  assert.equal(object.position.y, -0.9);
  fixture.advance(new Vector3(0.5, 0, 0), 0.1);
  assert.ok(Math.abs(speed - 2) < 0.001);
  assert.equal(fixture.player.tryPickUp(fixture.crate), true);
  fixture.advance(new Vector3(0, 0, 1), 0.1);
  assert.equal(isCarrying, true);
  assert.ok(Math.abs(speed - 2.5) < 0.001);
  fixture.advance(new Vector3(0, 0, 1), 1);
  assert.ok(speed < 0.02);
  assert.equal(fixture.player.tryPutDown(), true);
  fixture.player.update(1 / 60, new Vector3());
  assert.equal(isCarrying, false);
  assert.equal(speed, 0);
  fixture.player.dispose();
  assert.equal(isDisposed, true);
  assert.equal(fixture.player.object.parent, null);
});

async function loadPlayerModel() {
  const source = await readFile(new URL('../../../public/models/player/player.glb', import.meta.url));
  const originalJsonLength = source.readUInt32LE(12);
  const document = JSON.parse(source.subarray(20, 20 + originalJsonLength).toString('utf8'));
  // Node has no browser image decoder; retain the exact skin and animation buffers.
  delete document.images;
  delete document.textures;
  delete document.materials;
  for (const mesh of document.meshes) {
    for (const primitive of mesh.primitives) delete primitive.material;
  }
  const json = Buffer.from(JSON.stringify(document));
  const jsonLength = Math.ceil(json.length / 4) * 4;
  const binary = source.subarray(20 + originalJsonLength);
  const output = Buffer.alloc(20 + jsonLength + binary.length, 0x20);
  source.copy(output, 0, 0, 12);
  output.writeUInt32LE(output.length, 8);
  output.writeUInt32LE(jsonLength, 12);
  output.writeUInt32LE(0x4e4f534a, 16);
  json.copy(output, 20);
  binary.copy(output, 20 + jsonLength);
  return new GLTFLoader().parseAsync(output.buffer as ArrayBuffer, '');
}

test('loads the shipped skeleton and plays all four GLB clips without moving the model root', async () => {
  const model = await loadPlayerModel();
  assert.deepEqual(model.animations.map((clip) => clip.name).sort(), ['CarryIdle', 'CarryMove', 'Idle', 'Move']);
  const visual = new PlayerVisual(model.scene, model.animations, new Object3DResourceDisposer());
  const root = model.scene.getObjectByName('Player');
  assert.ok(root);
  const mesh = model.scene.getObjectByName('PlayerMesh');
  assert.ok(mesh instanceof SkinnedMesh);
  mesh.skeleton.computeBoneTexture();
  let isSkeletonDisposed = false;
  mesh.skeleton.boneTexture!.addEventListener('dispose', () => { isSkeletonDisposed = true; });
  for (const [speed, carrying] of [[0, false], [4, false], [0, true], [2.5, true]] as const) {
    for (let frame = 0; frame < 90; frame++) visual.update(1 / 60, speed, carrying);
    model.scene.updateMatrixWorld(true);
    assert.ok(root.position.length() < 0.000001);
    model.scene.traverse((object) => assert.ok(object.matrixWorld.elements.every(Number.isFinite)));
    if (carrying) {
      for (const [side, sign] of [['L', 1], ['R', -1]] as const) {
        const hand = model.scene.getObjectByName(PropertyBinding.sanitizeNodeName(`Hand.${side}`));
        assert.ok(hand);
        assert.ok(hand.getWorldPosition(new Vector3()).distanceTo(new Vector3(sign * 0.35, 1.13, 0.53)) < 0.001);
      }
    }
  }
  visual.dispose();
  assert.equal(isSkeletonDisposed, true);
});

test('running elbows keep a forward bend throughout the cycle, including between keys', async () => {
  const model = await loadPlayerModel();
  const clip = model.animations.find((animation) => animation.name === 'Move');
  assert.ok(clip);
  const mixer = new AnimationMixer(model.scene);
  mixer.clipAction(clip).play();
  const previousWrists = new Map<string, Vector3>();
  for (let sample = 0; sample <= 168; sample++) {
    mixer.setTime(clip.duration * sample / 168);
    model.scene.updateMatrixWorld(true);
    for (const side of ['L', 'R']) {
      const positions = ['UpperArm', 'Forearm', 'Hand'].map((name) => {
        const bone = model.scene.getObjectByName(PropertyBinding.sanitizeNodeName(`${name}.${side}`));
        assert.ok(bone);
        return bone.getWorldPosition(new Vector3());
      });
      const [shoulder, elbow, wrist] = positions as [Vector3, Vector3, Vector3];
      const upperArm = elbow.clone().sub(shoulder);
      const forearm = wrist.clone().sub(elbow);
      // The model faces +Z: a natural forward elbow bend has a negative X cross product.
      assert.ok(upperArm.clone().cross(forearm).x < -0.04, `${side} elbow reverses at sample ${sample}`);
      const flexion = upperArm.angleTo(forearm) * 180 / Math.PI;
      assert.ok(flexion > 45 && flexion < 110, `${side} elbow flexion is ${flexion}`);
      const previous = previousWrists.get(side);
      if (previous) assert.ok(previous.distanceTo(wrist) < 0.03, `${side} wrist jumps between samples`);
      previousWrists.set(side, wrist);
    }
  }
  mixer.stopAllAction();
  mixer.uncacheRoot(model.scene);
});
