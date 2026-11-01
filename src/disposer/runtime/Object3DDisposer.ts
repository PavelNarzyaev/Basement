import { Mesh, SkinnedMesh, Texture } from 'three';
import type { BufferGeometry, Material, Object3D, Skeleton } from 'three';
import type { IObject3DDisposer } from '../contracts/IObject3DDisposer';

export class Object3DDisposer implements IObject3DDisposer {
  dispose(object: Object3D, ...additionalObjects: Object3D[]): void {
    const geometries = new Set<BufferGeometry>();
    const materials = new Set<Material>();
    const textures = new Set<Texture>();
    const skeletons = new Set<Skeleton>();
    for (const root of [object, ...additionalObjects]) root.traverse((descendant) => {
      if (descendant instanceof SkinnedMesh) skeletons.add(descendant.skeleton);
      if (descendant instanceof Mesh) {
        geometries.add(descendant.geometry);
        for (const material of Array.isArray(descendant.material) ? descendant.material : [descendant.material]) {
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
    for (const skeleton of skeletons) skeleton.dispose();
    for (const material of materials) material.dispose();
    for (const geometry of geometries) geometry.dispose();
  }
}
