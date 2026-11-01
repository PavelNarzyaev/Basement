import { GameplaySession } from './app/runtime/GameplaySession';
import { Bombardment } from './bombardment/runtime/Bombardment';
import { CeilingDebris } from './ceiling_debris/runtime/CeilingDebris';
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
import { PlayerFactory } from './player/runtime/PlayerFactory';
import './style.css';
import { CrateObjective } from './objective/runtime/CrateObjective';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');

if (!canvas) {
  throw new Error('Scene canvas is missing from index.html.');
}

const objectDisposer = new Object3DDisposer();
const playerFactory = new PlayerFactory(objectDisposer, import.meta.env.BASE_URL);
const dust = new DustEffect();
const ceilingDebris = new CeilingDebris();
const scene = new BasementScene(objectDisposer, dust, ceilingDebris, import.meta.env.BASE_URL);
const overlayFactory = new CanvasOverlayFactory();
const joystick = new VirtualJoystick(canvas, overlayFactory);
const interactionPrompt = new InteractionPrompt(canvas, overlayFactory);
const startupSettingsDialog = new StartupSettingsDialog(canvas, overlayFactory);
const gameplayFactory: IGameplayFactory = {
  createSession(player, world, crates, camera, sceneResult) {
    return new GameplaySession(canvas, scene.scene, camera, joystick, interactionPrompt, gameplayFactory, objective, bombardment, player, world, crates, sceneResult);
  },
  createCarryable(model) {
    return new MovableCrate(model);
  },
  createCollisionWorld(model, boxes) {
    return new CollisionWorld(model, boxes);
  },
  createPlayer(world, spawn, onProgress, signal) {
    const carryPlacement = new CarryPlacement(world, new BoxCollision());
    return playerFactory.create(world, spawn, carryPlacement, onProgress, signal);
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
const objective = new CrateObjective();
const bombardment = new Bombardment(dust, ceilingDebris, import.meta.env.BASE_URL);
const application = new Application(canvas, scene, joystick, interactionPrompt, startupSettingsDialog, gameplayFactory, objective, bombardment);

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.dispose());
}
