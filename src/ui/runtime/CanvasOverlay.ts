import {
  CanvasTexture, DoubleSide, Mesh, MeshBasicMaterial, OrthographicCamera,
  PlaneGeometry, Scene, SRGBColorSpace,
} from 'three';
import type { BufferGeometry, WebGLRenderer } from 'three';

export class CanvasOverlay {
  readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(0, 1, 0, 1, 0.1, 10);
  private readonly plane = new PlaneGeometry(1, 1);
  private readonly geometries = new Set<BufferGeometry>([this.plane]);
  private readonly materials: MeshBasicMaterial[] = [];
  private readonly textures: CanvasTexture[] = [];

  constructor() {
    this.camera.position.z = 5;
    this.scene.visible = false;
  }

  resize(width: number, height: number): void {
    this.camera.right = width;
    this.camera.bottom = height;
    this.camera.updateProjectionMatrix();
  }

  createPanel(color: string, opacity = 1): Mesh<BufferGeometry, MeshBasicMaterial> {
    return this.createMesh(this.plane, color, opacity);
  }

  createMesh(geometry: BufferGeometry, color: string, opacity = 1): Mesh<BufferGeometry, MeshBasicMaterial> {
    const material = new MeshBasicMaterial({
      color, opacity, transparent: true, side: DoubleSide,
      depthTest: false, depthWrite: false, toneMapped: false,
    });
    this.geometries.add(geometry);
    this.materials.push(material);
    return new Mesh(geometry, material);
  }

  createLabel(text: string, fontSize: number): Mesh<BufferGeometry, MeshBasicMaterial> {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Cannot create overlay label canvas context.');
    context.fillStyle = '#f5eee4';
    context.font = `500 ${fontSize * 2}px system-ui, sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    this.textures.push(texture);
    const mesh = this.createPanel('#ffffff');
    mesh.material.map = texture;
    mesh.scale.set(canvas.width / 2, canvas.height / 2, 1);
    // Screen coordinates point down, so flip the label to keep text upright.
    mesh.rotation.x = Math.PI;
    return mesh;
  }

  render(renderer: WebGLRenderer): void {
    if (!this.scene.visible) return;
    const autoClear = renderer.autoClear;
    renderer.autoClear = false;
    renderer.clearDepth();
    renderer.render(this.scene, this.camera);
    renderer.autoClear = autoClear;
  }

  dispose(): void {
    for (const texture of this.textures) texture.dispose();
    for (const material of this.materials) material.dispose();
    for (const geometry of this.geometries) geometry.dispose();
    this.scene.clear();
  }
}
