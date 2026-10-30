import { Application } from './app/runtime/Application';
import { Object3DDisposer } from './disposer/runtime/Object3DDisposer';
import { BasementScene } from './scenes/runtime/BasementScene';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');

if (!canvas) {
  throw new Error('Scene canvas is missing from index.html.');
}

const objectDisposer = new Object3DDisposer();
const scene = new BasementScene(objectDisposer);
const application = new Application(canvas, scene);

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.dispose());
}
