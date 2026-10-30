import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Scene,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { IObject3DDisposer } from '../../disposer/contracts/IObject3DDisposer';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import type { IScene } from '../contracts/IScene';

export class BasementScene implements IScene {
  private static readonly modelUrl = `${import.meta.env.BASE_URL}models/basement/basement.glb`;

  readonly scene = new Scene();
  // Leave 0.05 units above the measured floor so gravity settles the collider.
  readonly playerSpawn = new PlayerSpawnDto(new Vector3(0, 0.104292 + 0.05, -13), Math.PI);
  private isDisposed = false;

  constructor(private readonly objectDisposer: IObject3DDisposer) {
    this.scene.background = new Color('#151a24');
    const hemisphereLight = new HemisphereLight('#dceaff', '#423024', 2);
    const keyLight = new DirectionalLight('#fff1db', 3);
    keyLight.position.set(3, 8, 5);
    this.scene.add(hemisphereLight, keyLight);
  }

  async load(): Promise<Object3D | undefined> {
    const model = await new GLTFLoader().loadAsync(BasementScene.modelUrl);
    if (this.isDisposed) {
      this.objectDisposer.dispose(model.scene);
      return;
    }
    this.scene.add(model.scene);
    return model.scene;
  }

  dispose(): void {
    this.isDisposed = true;
    this.objectDisposer.dispose(this.scene);
    this.scene.clear();
  }
}
