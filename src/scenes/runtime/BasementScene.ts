import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Scene,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { IScene } from '../contracts/IScene';
import { ModelResourceDisposer } from './ModelResourceDisposer';

export class BasementScene implements IScene {
  private static readonly modelUrl = `${import.meta.env.BASE_URL}models/basement/basement.glb`;

  readonly scene = new Scene();
  private isDisposed = false;

  constructor() {
    this.scene.background = new Color('#151a24');
    const hemisphereLight = new HemisphereLight('#dceaff', '#423024', 2);
    const keyLight = new DirectionalLight('#fff1db', 3);
    keyLight.position.set(3, 8, 5);
    this.scene.add(hemisphereLight, keyLight);
  }

  async load(): Promise<Object3D | undefined> {
    const model = await new GLTFLoader().loadAsync(BasementScene.modelUrl);
    if (this.isDisposed) {
      ModelResourceDisposer.dispose(model.scene);
      return;
    }
    this.scene.add(model.scene);
    return model.scene;
  }

  dispose(): void {
    this.isDisposed = true;
    ModelResourceDisposer.dispose(this.scene);
    this.scene.clear();
  }
}
