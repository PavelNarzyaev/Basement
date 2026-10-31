import { Application } from './app/runtime/Application';
import { CanvasOverlayFactory } from './canvas_overlay/runtime/CanvasOverlayFactory';
import { VirtualJoystick } from './input/runtime/VirtualJoystick';
import { InteractionPrompt } from './interaction_prompt/runtime/InteractionPrompt';
import { StartupSettingsDialog } from './startup/runtime/StartupSettingsDialog';
import { Object3DDisposer } from './disposer/runtime/Object3DDisposer';
import { BasementScene } from './scenes/runtime/BasementScene';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');

if (!canvas) {
  throw new Error('Scene canvas is missing from index.html.');
}

const objectDisposer = new Object3DDisposer();
const scene = new BasementScene(objectDisposer);
const overlayFactory = new CanvasOverlayFactory();
const joystick = new VirtualJoystick(canvas, overlayFactory);
const interactionPrompt = new InteractionPrompt(canvas, overlayFactory);
const startupSettingsDialog = new StartupSettingsDialog(canvas, overlayFactory);
const application = new Application(canvas, scene, joystick, interactionPrompt, startupSettingsDialog);

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.dispose());
}
