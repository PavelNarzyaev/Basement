import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Mesh, Scene, Vector2, PerspectiveCamera } from 'three';
import { TouchInput } from '../runtime/TouchInput';
import { InteractionPrompt } from '../../interaction_prompt/runtime/InteractionPrompt';
import type { ICanvasOverlayFactory } from '../../canvas_overlay/contracts/ICanvasOverlayFactory';

test('touch routes movement, look and interaction independently across cancellation and resize', () => {
  const windowEvents = new EventTarget();
  const documentEvents = new EventTarget();
  Object.defineProperty(globalThis, 'window', { configurable: true, value: windowEvents });
  Object.defineProperty(globalThis, 'document', { configurable: true, value: documentEvents });
  const captures = new Set<number>();
  const canvas = Object.assign(new EventTarget(), {
    clientWidth: 800, clientHeight: 600,
    getBoundingClientRect: () => ({ left: 30, top: 50 }),
    setPointerCapture: (id: number) => captures.add(id),
    hasPointerCapture: (id: number) => captures.has(id),
    releasePointerCapture: (id: number) => captures.delete(id),
  }) as unknown as HTMLCanvasElement;
  const overlayFactory = { create: () => ({
    scene: new Scene(), createLabel: () => new Mesh(), createMesh: () => new Mesh(),
    resize() {}, dispose() {},
  }) } as unknown as ICanvasOverlayFactory;
  const prompt = new InteractionPrompt(overlayFactory);
  const joystick = {
    getJoystickDisplacement: (x: number, y: number) => new Vector2((x - 130) / 50, (y - 150) / 50),
    setJoystickPosition() {},
  };
  const input = new TouchInput(canvas, joystick, prompt);
  const pointer = (type: string, id: number, x: number, y: number) => {
    canvas.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), {
      pointerId: id, button: 0, clientX: x, clientY: y,
    }));
    if (['pointerup', 'pointercancel', 'lostpointercapture'].includes(type)) captures.delete(id);
  };
  try {
    // Activate the view after input construction; routing reads current view geometry.
    prompt.enableTouch();
    prompt.resize(800, 600);
    prompt.update(undefined, true, new PerspectiveCamera());
    const button = prompt.getInteractionButtonBounds()!;
    const x = button.centerX + 30;
    const y = button.centerY + 50;
    pointer('pointerdown', 1, 155, 150);
    pointer('pointerdown', 2, 430, 250);
    pointer('pointermove', 2, 450, 270);
    let state = input.read();
    assert.equal(state.movementX, 0.5);
    assert.notEqual(state.yawDeltaRadians, 0);
    pointer('pointerdown', 3, x, y);
    pointer('pointermove', 3, x - 100, y - 100);
    state = input.read();
    assert.equal(state.isInteractionPressed, true);
    assert.equal(state.movementX, 0.5);
    assert.equal(state.yawDeltaRadians, 0);
    assert.equal(state.pitchDeltaRadians, 0);
    assert.equal(input.read().isInteractionPressed, false);
    pointer('pointerup', 3, x, y);
    pointer('pointercancel', 1, 155, 150);
    pointer('lostpointercapture', 2, 450, 270);
    pointer('pointermove', 2, 500, 300);
    state = input.read();
    assert.equal(state.movementX, 0);
    assert.equal(state.yawDeltaRadians, 0);
    for (const end of ['pointercancel', 'lostpointercapture']) {
      pointer('pointerdown', 3, x, y);
      pointer(end, 3, x, y);
      assert.equal(input.read().isInteractionPressed, false);
    }
    pointer('pointerdown', 1, 155, 150);
    pointer('pointerdown', 3, x, y);
    windowEvents.dispatchEvent(new Event('resize'));
    prompt.resize(400, 300);
    state = input.read();
    assert.equal(state.movementX, 0);
    assert.equal(state.isInteractionPressed, false);
    assert.equal(captures.size, 0);
    const resizedButton = prompt.getInteractionButtonBounds()!;
    pointer('pointerdown', 4, resizedButton.centerX + 30, resizedButton.centerY + 50);
    pointer('pointerup', 4, 0, 0);
    assert.equal(input.read().isInteractionPressed, true);
    pointer('pointerdown', 4, resizedButton.centerX + 30, resizedButton.centerY + 50);
    windowEvents.dispatchEvent(new Event('blur'));
    assert.equal(input.read().isInteractionPressed, false);
    prompt.update(undefined, false, new PerspectiveCamera());
    assert.equal(prompt.getInteractionButtonBounds(), undefined);
    pointer('pointerdown', 5, resizedButton.centerX + 30, resizedButton.centerY + 50);
    pointer('pointermove', 5, resizedButton.centerX + 40, resizedButton.centerY + 50);
    state = input.read();
    assert.equal(state.isInteractionPressed, false);
    assert.notEqual(state.yawDeltaRadians, 0);
  } finally {
    input.dispose();
    prompt.dispose();
    Reflect.deleteProperty(globalThis, 'window');
    Reflect.deleteProperty(globalThis, 'document');
  }
});
