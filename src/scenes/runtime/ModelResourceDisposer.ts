import { Mesh, Texture } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';

export class ModelResourceDisposer {
  static dispose(model: Object3D): void {
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
}
