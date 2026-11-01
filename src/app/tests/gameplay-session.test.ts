import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Object3D, PerspectiveCamera, Scene, Vector3 } from 'three';
import { GameplaySession } from '../runtime/GameplaySession';
import { SceneLoadResultDto } from '../../scenes/contracts/SceneLoadResultDto';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import { CrateSpawnDto } from '../../scenes/contracts/CrateSpawnDto';
import { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import { ControlMode } from '../../input/contracts/ControlMode';

test('session preserves frame order and restarts ready gameplay without a renderer', () => {
  const events: string[] = [];
  const deltas: number[] = [];
  let restart!: () => void;
  const player = {
    object: new Object3D(),
    update(delta: number) { events.push('player'); deltas.push(delta); },
    restart() { events.push('restart'); },
    dispose() { events.push('player disposal'); },
  };
  const controller = { yaw: 0, addPitchDelta() { events.push('look'); }, update() { events.push('camera'); } };
  const crate = { setPose() { events.push('crate pose'); } };
  const args = [
    { focus() { events.push('focus'); } },
    new Scene(),
    new PerspectiveCamera(), {},
    { update() { events.push('prompt'); } },
    {
      createCameraController() { return controller; },
      createInteractionController() { return { update(pressed: boolean) { events.push(`interaction ${pressed}`); } }; },
      createInput() {
        return {
          read() { events.push('input'); return { movementX: 0, movementZ: 0, yawDeltaRadians: 0, pitchDeltaRadians: 0, isInteractionPressed: true }; },
          dispose() { events.push('input disposal'); },
        };
      },
    },
    { start(_crates: unknown, _zone: unknown, callback: () => void) { restart = callback; }, update() { events.push('objective'); } },
    { start() { events.push('bombardment start'); }, update() { events.push('bombardment'); } },
    player, { dispose() { events.push('world disposal'); } }, [crate],
    new SceneLoadResultDto(new Object3D(), new PlayerSpawnDto(new Vector3(), 0),
      [new CrateSpawnDto(new Object3D(), new Vector3(), 0)],
      new OrientedBoxDto(new Vector3(), new Vector3(1, 1, 1), 0)),
  ] as unknown as ConstructorParameters<typeof GameplaySession>;
  const session = new GameplaySession(...args);
  events.length = 0;
  session.update(1);
  assert.deepEqual(events, []);
  session.start({ controlMode: ControlMode.Desktop, shouldEnterFullscreen: false });
  events.length = 0;
  session.update(1);
  assert.deepEqual(events, ['input', 'look', 'player', 'interaction true', 'objective', 'camera', 'bombardment', 'prompt']);
  session.update(0.016);
  events.length = 0;
  restart();
  assert.deepEqual(events, ['bombardment start', 'restart', 'crate pose', 'camera', 'interaction false', 'objective', 'focus']);
  session.update(1);
  assert.deepEqual(deltas, [0, 0.016, 0]);
  events.length = 0;
  session.dispose();
  assert.deepEqual(events, ['input disposal', 'player disposal', 'world disposal']);
});
