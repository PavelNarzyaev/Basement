import { Bombardment } from './bombardment/runtime/Bombardment';
import { CeilingDebris } from './ceiling_debris/runtime/CeilingDebris';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Application } from './app/runtime/Application';
import type { IGameplayFactory } from './app/contracts/IGameplayFactory';
import { ThirdPersonCameraController } from './camera/runtime/ThirdPersonCameraController';
import { CarryPlacement } from './carrying/runtime/CarryPlacement';
import { CrateInteractionController } from './carrying/runtime/CrateInteractionController';
import { MovableCrate } from './carrying/runtime/MovableCrate';
import { BoxCollision } from './collision/runtime/BoxCollision';
import { CollisionWorld } from './collision/runtime/CollisionWorld';
import { CanvasOverlayFactory } from './canvas_overlay/runtime/CanvasOverlayFactory';
import { VirtualJoystick } from './input/runtime/VirtualJoystick';
import { ControlMode } from './input/contracts/ControlMode';
import { DesktopInput } from './input/runtime/DesktopInput';
import { TouchInput } from './input/runtime/TouchInput';
import { InteractionPrompt } from './interaction_prompt/runtime/InteractionPrompt';
import { StartupSettingsDialog } from './startup/runtime/StartupSettingsDialog';
import { Object3DDisposer } from './disposer/runtime/Object3DDisposer';
import { DustEffect } from './dust/runtime/DustEffect';
import { BasementScene } from './scenes/runtime/BasementScene';
import { Player } from './player/runtime/Player';
import { PlayerVisual } from './player/runtime/PlayerVisual';
import './style.css';
import { CrateObjective } from './objective/runtime/CrateObjective';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');

if (!canvas) {
  throw new Error('Scene canvas is missing from index.html.');
}

const objectDisposer = new Object3DDisposer();
const dust = new DustEffect();
const ceilingDebris = new CeilingDebris();
const scene = new BasementScene(objectDisposer, dust, ceilingDebris);
const overlayFactory = new CanvasOverlayFactory();
const joystick = new VirtualJoystick(canvas, overlayFactory);
const interactionPrompt = new InteractionPrompt(canvas, overlayFactory);
const startupSettingsDialog = new StartupSettingsDialog(canvas, overlayFactory);
const gameplayFactory: IGameplayFactory = {
  createCarryable(model) {
    return new MovableCrate(model);
  },
  createCollisionWorld(model, boxes) {
    return new CollisionWorld(model, boxes);
  },
  async createPlayer(world, spawn, onProgress) {
    const carryPlacement = new CarryPlacement(world, new BoxCollision());
    const model = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/player/player.glb`, (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total * 100);
    });
    try {
      const visual = new PlayerVisual(model.scene, model.animations, objectDisposer);
      return new Player(world, spawn, carryPlacement, visual);
    } catch (error) {
      objectDisposer.dispose(model.scene);
      throw error;
    }
  },
  createInteractionController(player, crates, world) {
    return new CrateInteractionController(player, crates, world);
  },
  createCameraController(camera, world, initialYaw) {
    return new ThirdPersonCameraController(camera, world, initialYaw);
  },
  createInput(controlMode) {
    return controlMode === ControlMode.Touch ? new TouchInput(canvas, joystick) : new DesktopInput(canvas);
  },
};
const application = new Application(canvas, scene, joystick, interactionPrompt, startupSettingsDialog, gameplayFactory, new CrateObjective(), new Bombardment(dust, ceilingDebris));

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.dispose());
}
