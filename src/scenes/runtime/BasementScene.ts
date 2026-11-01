import {
  Box3,
  Color,
  FogExp2,
  PointLight,
  Scene,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { IObject3DDisposer } from '../../disposer/contracts/IObject3DDisposer';
import type { IDustEffect } from '../../dust/contracts/IDustEffect';
import { DustVolumeDto } from '../../dust/contracts/DustVolumeDto';
import { dustBrightness, dustColor, dustFogDensity } from '../../dust/contracts/dustAppearance';
import type { PlayerSpawnDto } from '../../player/contracts/PlayerSpawnDto';
import type { IScene } from '../contracts/IScene';
import { CrateSpawnDto } from '../contracts/CrateSpawnDto';
import type { OrientedBoxDto } from '../../collision/contracts/OrientedBoxDto';
import { SceneLayout } from './SceneLayout';
import type { ICeilingDebris } from '../../ceiling_debris/contracts/ICeilingDebris';

export class BasementScene implements IScene {
  private static readonly modelUrl = `${import.meta.env.BASE_URL}models/basement/basement.glb`;
  private static readonly lampColor = '#ffdfaa';
  private static readonly lampIntensity = 5;
  private static readonly lampDistance = 150;

  readonly scene = new Scene();
  readonly movableCrates: CrateSpawnDto[] = [];
  trolleyCargoZone!: OrientedBoxDto;
  playerSpawn!: PlayerSpawnDto;
  private isDisposed = false;

  constructor(
    private readonly objectDisposer: IObject3DDisposer,
    private readonly dust: IDustEffect,
    private readonly ceilingDebris: ICeilingDebris,
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
    const layout = new SceneLayout(model.scene);
    this.trolleyCargoZone = layout.cargoZone;
    this.playerSpawn = layout.playerSpawn;
    const crateModel = await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/crate/Crate.glb`, (event) => {
      if (event.lengthComputable) onProgress(80 + event.loaded / event.total * 20);
    });
    if (this.isDisposed) {
      this.objectDisposer.dispose(crateModel.scene);
      return;
    }
    for (const [index, placement] of layout.cratePlacements.entries()) {
      const crate = crateModel.scene.clone(true);
      crate.name = `MovableCrate_${index + 1}`;
      this.scene.add(crate);
      this.movableCrates.push(new CrateSpawnDto(crate, placement.center, placement.rotationY));
    }
    this.addLampLights(model.scene);
    this.dust.initialize(new DustVolumeDto(new Box3().setFromObject(model.scene)));
    this.scene.add(this.dust.object);
    this.ceilingDebris.initialize(model.scene);
    this.scene.add(this.ceilingDebris.object);
    onProgress(100);
    return model.scene;
  }

  update(delta: number): void {
    this.dust.update(delta);
    this.ceilingDebris.update(delta);
  }

  dispose(): void {
    this.isDisposed = true;
    this.dust.dispose();
    this.ceilingDebris.dispose();
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
