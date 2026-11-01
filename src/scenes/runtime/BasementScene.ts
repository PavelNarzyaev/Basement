import {
  Box3,
  Color,
  FogExp2,
  PointLight,
  Scene,
} from 'three';
import type { Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import type { IObject3DResourceDisposer } from '../../disposer/contracts/IObject3DResourceDisposer';
import type { IDustEffect } from '../../dust/contracts/IDustEffect';
import { DustVolumeDto } from '../../dust/contracts/DustVolumeDto';
import { dustBrightness, dustColor, dustFogDensity } from '../../dust/contracts/dustAppearance';
import { SceneLoadResultDto } from '../contracts/SceneLoadResultDto';
import type { IGameScene } from '../contracts/IGameScene';
import { CrateSpawnDto } from '../contracts/CrateSpawnDto';
import { SceneLayout } from './SceneLayout';
import type { ICeilingDebris } from '../../ceiling_debris/contracts/ICeilingDebris';

export class BasementScene implements IGameScene {
  private static readonly lampColor = '#ffdfaa';
  private static readonly lampIntensity = 5;
  private static readonly lampDistance = 150;

  readonly scene = new Scene();
  private isDisposed = false;
  private crateModel: Object3D | undefined;

  constructor(
    private readonly objectDisposer: IObject3DResourceDisposer,
    private readonly dust: IDustEffect,
    private readonly ceilingDebris: ICeilingDebris,
    private readonly baseUrl: string,
  ) {
    this.scene.background = new Color('#151a24');
    this.scene.fog = new FogExp2(new Color(dustColor).multiplyScalar(dustBrightness), dustFogDensity);
  }

  async load(onProgress: (percentage: number) => void): Promise<SceneLoadResultDto> {
    try {
      if (this.isDisposed) throw new DOMException('Scene loading was cancelled.', 'AbortError');
      return await this.loadModels((percentage) => {
        if (!this.isDisposed) onProgress(percentage);
      });
    } catch (error) {
      this.dispose();
      throw error;
    }
  }

  private async loadModels(onProgress: (percentage: number) => void): Promise<SceneLoadResultDto> {
    const model = await new GLTFLoader().loadAsync(`${this.baseUrl}models/basement/basement.glb`, (event) => {
      if (event.lengthComputable) {
        onProgress((event.loaded / event.total) * 80);
      }
    });
    if (this.isDisposed) {
      this.objectDisposer.dispose(model.scene);
      throw new DOMException('Scene loading was cancelled.', 'AbortError');
    }
    this.scene.add(model.scene);
    const layout = new SceneLayout(model.scene);
    const crateModel = await new GLTFLoader().loadAsync(`${this.baseUrl}models/crate/Crate.glb`, (event) => {
      if (event.lengthComputable) onProgress(80 + event.loaded / event.total * 20);
    });
    if (this.isDisposed) {
      this.objectDisposer.dispose(crateModel.scene);
      throw new DOMException('Scene loading was cancelled.', 'AbortError');
    }
    this.crateModel = crateModel.scene;
    const movableCrates: CrateSpawnDto[] = [];
    for (const [index, placement] of layout.cratePlacements.entries()) {
      const crate = crateModel.scene.clone(true);
      crate.name = `MovableCrate_${index + 1}`;
      this.scene.add(crate);
      movableCrates.push(new CrateSpawnDto(crate, placement.center, placement.rotationY));
    }
    this.addLampLights(model.scene);
    const bounds = new Box3().setFromObject(model.scene);
    this.dust.initialize(new DustVolumeDto(bounds));
    this.ceilingDebris.initialize(bounds);
    this.scene.add(this.dust.object);
    this.scene.add(this.ceilingDebris.object);
    onProgress(100);
    if (this.isDisposed) throw new DOMException('Scene loading was cancelled.', 'AbortError');
    return new SceneLoadResultDto(model.scene, layout.playerSpawn, movableCrates, layout.cargoZone);
  }

  update(deltaSeconds: number): void {
    this.dust.update(deltaSeconds);
    this.ceilingDebris.update(deltaSeconds);
  }

  dispose(): void {
    if (this.isDisposed) return;
    this.isDisposed = true;
    this.dust.dispose();
    this.ceilingDebris.dispose();
    this.objectDisposer.dispose(this.scene, ...(this.crateModel ? [this.crateModel] : []));
    this.crateModel = undefined;
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
