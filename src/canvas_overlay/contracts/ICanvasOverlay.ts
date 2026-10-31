import type { BufferGeometry, Mesh, MeshBasicMaterial, Scene, WebGLRenderer } from 'three';

export interface ICanvasOverlay {
  readonly scene: Scene;
  resize(width: number, height: number): void;
  createPanel(color: string, opacity?: number): Mesh<BufferGeometry, MeshBasicMaterial>;
  createMesh(geometry: BufferGeometry, color: string, opacity?: number): Mesh<BufferGeometry, MeshBasicMaterial>;
  createLabel(text: string, fontSize: number): Mesh<BufferGeometry, MeshBasicMaterial>;
  render(renderer: WebGLRenderer): void;
  dispose(): void;
}
