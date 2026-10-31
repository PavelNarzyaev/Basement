import {
  Color,
  PointLight,
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
  private static readonly lampColor = '#ffdfaa';
  private static readonly lampIntensity = 5;
  private static readonly lampDistance = 150;

  readonly scene = new Scene();
  // Leave 0.05 units above the measured floor so gravity settles the collider.
  readonly playerSpawn = new PlayerSpawnDto(new Vector3(0, 0.104292 + 0.05, -13), Math.PI);
  private isDisposed = false;

  constructor(private readonly objectDisposer: IObject3DDisposer) {
    this.scene.background = new Color('#151a24');
  }

  async load(): Promise<Object3D | undefined> {
    const model = await new GLTFLoader().loadAsync(BasementScene.modelUrl);
    if (this.isDisposed) {
      this.objectDisposer.dispose(model.scene);
      return;
    }
    this.addLampLights(model.scene);
    this.scene.add(model.scene);
    return model.scene;
  }

  dispose(): void {
    this.isDisposed = true;
    this.objectDisposer.dispose(this.scene);
    this.scene.clear();
  }

  private addLampLights(model: Object3D): void {
    const markers: Object3D[] = [];
    model.traverse((object) => {
      if (typeof object.userData.lightId === 'string') markers.push(object);
    });

    for (const marker of markers) {
      const light = new PointLight(
        BasementScene.lampColor,
        BasementScene.lampIntensity,
        BasementScene.lampDistance,
        2,
      );
      light.name = `${marker.userData.lightId}_PointLight`;
      light.castShadow = false;
      marker.add(light);
    }
  }
}
