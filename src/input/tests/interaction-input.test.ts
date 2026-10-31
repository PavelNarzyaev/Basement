import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DesktopInput } from '../runtime/DesktopInput';

test('E is read once per press, ignores autorepeat, and clears on loss of focus', () => {
  const canvas = new EventTarget() as HTMLCanvasElement;
  const windowEvents = new EventTarget();
  const documentEvents = Object.assign(new EventTarget(), {
    pointerLockElement: canvas as HTMLCanvasElement | null,
    exitPointerLock(): void { this.pointerLockElement = null; },
  });
  Object.defineProperty(globalThis, 'window', { configurable: true, value: windowEvents });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentEvents });
  const input = new DesktopInput(canvas);
  try {
    windowEvents.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyE', repeat: false }));
    assert.equal(input.read().isInteractionPressed, true);
    assert.equal(input.read().isInteractionPressed, false);
    windowEvents.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyE', repeat: true }));
    assert.equal(input.read().isInteractionPressed, false);
    windowEvents.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyE', repeat: false }));
    windowEvents.dispatchEvent(new Event('blur'));
    assert.equal(input.read().isInteractionPressed, false);
    documentEvents.pointerLockElement = null;
    windowEvents.dispatchEvent(Object.assign(new Event('keydown'), { code: 'KeyE', repeat: false }));
    assert.equal(input.read().isInteractionPressed, false);
  } finally {
    input.dispose();
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
  }
});
