import {
  Box3,
  Color,
  FogExp2,
  PointLight,
  Scene,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { IObject3DDisposer } from '../../disposer/contracts/IObject3DDisposer';
import type { IDustEffect } from '../../dust/contracts/IDustEffect';
import { DustVolumeDto } from '../../dust/contracts/DustVolumeDto';
import { dustBrightness, dustColor, dustFogDensity } from '../../dust/contracts/dustAppearance';
import { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import type { IScene } from '../contracts/IScene';
import { CrateSpawnDto } from '../contracts/CrateSpawnDto';

export class BasementScene implements IScene {
  private static readonly modelUrl = `${import.meta.env.BASE_URL}models/basement/basement.glb`;
  private static readonly lampColor = '#ffdfaa';
  private static readonly lampIntensity = 5;
  private static readonly lampDistance = 150;
  private static readonly cratePoses = [
    [-2.0723949967660116, 1.223901976943016, 6.682538890918395, 2.240222039230623],
    [4.654424496244726, 0.3592826622724533, 17.10447766146656, 0],
    [0.0639430627521131, 0.6812183457612991, -17.60044388080444, -3.1022779607693773],
    [-1.6352098886545785, 0.3592826622724533, 21.5873938421339, 8.13840734641023],
    [-4.183687647980426, 0.35928266227245353, -14.510487898589224, -9.03904673852597],
  ] as const;

  readonly scene = new Scene();
  readonly movableCrates: CrateSpawnDto[] = [];
  // Leave 0.05 units above the measured floor so gravity settles the collider.
  readonly playerSpawn = new PlayerSpawnDto(new Vector3(0, 0.104292 + 0.05, -13), Math.PI);
  private isDisposed = false;

  constructor(
    private readonly objectDisposer: IObject3DDisposer,
    private readonly dust: IDustEffect,
  ) {
    this.scene.background = new Color('#151a24');
    this.scene.fog = new FogExp2(new Color(dustColor).multiplyScalar(dustBrightness), dustFogDensity);
  }

  async load(onProgress: (percentage: number) => void): Promise<Object3D | undefined> {
    const model = await new GLTFLoader().loadAsync(BasementScene.modelUrl, (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 80);
      }
    });
    if (this.isDisposed) {
      this.objectDisposer.dispose(model.scene);
      return;
    }
    this.scene.add(model.scene);
    const crateModel = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/crate/Crate.glb`, (event) => {
      if (event.lengthComputable) onProgress(80 + event.loaded / event.total * 20);
    });
    if (this.isDisposed) {
      this.objectDisposer.dispose(crateModel.scene);
      return;
    }
    for (const [index, [x, y, z, rotationY]] of BasementScene.cratePoses.entries()) {
      const crate = crateModel.scene.clone(true);
      crate.name = `MovableCrate_${index + 1}`;
      this.scene.add(crate);
      this.movableCrates.push(new CrateSpawnDto(crate, new Vector3(x, y, z), rotationY));
    }
    this.addLampLights(model.scene);
    this.dust.initialize(new DustVolumeDto(new Box3().setFromObject(model.scene)));
    this.scene.add(this.dust.object);
    onProgress(100);
    return model.scene;
  }

  update(delta: number): void {
    this.dust.update(delta);
  }

  dispose(): void {
    this.isDisposed = true;
    this.dust.dispose();
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
