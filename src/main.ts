import { Application } from './app/Application';
import { BasementScene } from './scenes/runtime/BasementScene';
import './style.css';

const canvas = document.querySelector<HTMLCanvasElement>('#scene');

if (!canvas) {
  throw new Error('Scene canvas is missing from index.html.');
}

const application = new Application(canvas, new BasementScene());

if (import.meta.hot) {
  import.meta.hot.dispose(() => application.dispose());
}
