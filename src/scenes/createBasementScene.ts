import {
  Color,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  Scene,
  Texture,
} from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const basementModelUrl = `${import.meta.env.BASE_URL}models/basement/basement.glb`;

function disposeModel(model: Object3D): void {
  const geometries = new Set<BufferGeometry>();
  const materials = new Set<Material>();
  const textures = new Set<Texture>();
  model.traverse((object) => {
    if (object instanceof Mesh) {
      geometries.add(object.geometry);
      for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
        materials.add(material);
        for (const value of Object.values(material)) {
          if (value instanceof Texture) textures.add(value);
        }
      }
    }
  });
  const bitmaps = new Set<ImageBitmap>();
  for (const texture of textures) {
    if (texture.image instanceof ImageBitmap) bitmaps.add(texture.image);
    texture.dispose();
  }
  for (const bitmap of bitmaps) bitmap.close();
  for (const material of materials) material.dispose();
  for (const geometry of geometries) geometry.dispose();
}

export function createBasementScene() {
  const scene = new Scene();
  scene.background = new Color('#151a24');
  const hemisphereLight = new HemisphereLight('#dceaff', '#423024', 2);
  const keyLight = new DirectionalLight('#fff1db', 3);
  keyLight.position.set(3, 8, 5);
  scene.add(hemisphereLight, keyLight);
  let isDisposed = false;

  return {
    scene,
    async load() {
      const model = await new GLTFLoader().loadAsync(basementModelUrl);
      if (isDisposed) {
        disposeModel(model.scene);
        return;
      }
      scene.add(model.scene);
      return model.scene;
    },
    dispose() {
      isDisposed = true;
      disposeModel(scene);
      scene.clear();
    },
  };
}
