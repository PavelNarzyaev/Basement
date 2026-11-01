import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Object3D, PerspectiveCamera, Scene, Vector3 } from 'three';
import { GameplaySession } from '../runtime/GameplaySession';
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
  const controller = { yaw: 0, rotate() { events.push('look'); }, update() { events.push('camera'); } };
  const crate = { setPose() { events.push('crate pose'); } };
  const args = [
    { focus() { events.push('focus'); } },
    { scene: new Scene(), playerSpawn: { rotationY: 0 }, movableCrates: [{ center: new Vector3(), rotationY: 0 }] },
    new PerspectiveCamera(), {},
    { readInteraction() { return true; }, update() { events.push('prompt'); } },
    {
      createCameraController() { return controller; },
      createInteractionController() { return { update(pressed: boolean) { events.push(`interaction ${pressed}`); } }; },
      createInput() {
        return {
          read() { events.push('input'); return { movementX: 0, movementZ: 0, lookX: 0, lookY: 0, isInteractionPressed: false }; },
          dispose() { events.push('input disposal'); },
        };
      },
    },
    { start(_crates: unknown, _zone: unknown, callback: () => void) { restart = callback; }, update() { events.push('objective'); } },
    { start() { events.push('bombardment start'); }, update() { events.push('bombardment'); } },
    player, { dispose() { events.push('world disposal'); } }, [crate],
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
