import { CircleGeometry, Vector3 } from 'three';
import type { BufferGeometry, Mesh, MeshBasicMaterial, PerspectiveCamera, WebGLRenderer } from 'three';
import type { ICarryable } from '../../carrying/contracts/ICarryable';
import type { ICanvasOverlay } from '../../canvas_overlay/contracts/ICanvasOverlay';
import type { ICanvasOverlayFactory } from '../../canvas_overlay/contracts/ICanvasOverlayFactory';
import { touchControlLayout } from '../../input/contracts/touchControlLayout';
import type { IInteractionPrompt } from '../contracts/IInteractionPrompt';
import { InteractionButtonBoundsDto } from '../contracts/InteractionButtonBoundsDto';

export class InteractionPrompt implements IInteractionPrompt {
  private readonly overlay: ICanvasOverlay;
  private readonly takeLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly placeLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly touchPanel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly touchTakeLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly touchPlaceLabel: Mesh<BufferGeometry, MeshBasicMaterial>;
  private readonly screenPosition = new Vector3();
  private isTouchEnabled = false;
  private width = 1;
  private height = 1;
  private touchRadius: number = touchControlLayout.maximumRadius;

  constructor(overlayFactory: ICanvasOverlayFactory) {
    this.overlay = overlayFactory.create();
    this.takeLabel = this.overlay.createLabel('E · Взять', 21);
    this.placeLabel = this.overlay.createLabel('E · Поставить', 21);
    this.touchPanel = this.overlay.createMesh(new CircleGeometry(1, 64), '#30394a', 0.92);
    this.touchTakeLabel = this.overlay.createLabel('взять', 16);
    this.touchPlaceLabel = this.overlay.createLabel('поставить', 16);
    this.overlay.scene.add(this.takeLabel, this.placeLabel, this.touchPanel, this.touchTakeLabel, this.touchPlaceLabel);

  }

  enableTouch(): void {
    this.isTouchEnabled = true;
  }

  getInteractionButtonBounds(): InteractionButtonBoundsDto | undefined {
    if (!this.isTouchEnabled || !this.touchPanel.visible || !this.overlay.scene.visible) return undefined;
    return new InteractionButtonBoundsDto(this.touchPanel.position.x, this.touchPanel.position.y, this.touchRadius);
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.overlay.resize(width, height);
    this.placeLabel.position.set(width / 2, height - 66, 0);
    this.touchRadius = Math.min(touchControlLayout.maximumRadius, width * touchControlLayout.widthRatio, height * touchControlLayout.heightRatio);
    const x = width - touchControlLayout.margin - this.touchRadius;
    const y = height - touchControlLayout.margin - this.touchRadius;
    this.touchPanel.position.set(x, y, 0);
    this.touchPanel.scale.set(this.touchRadius, this.touchRadius, 1);
    const touchLabelScale = this.touchRadius / touchControlLayout.maximumRadius;
    for (const label of [this.touchTakeLabel, this.touchPlaceLabel]) {
      label.position.set(x, y, 0.1);
      label.scale.set(512 * touchLabelScale, 64 * touchLabelScale, 1);
    }
  }

  update(pickupCandidate: ICarryable | undefined, canPutDown: boolean, camera: PerspectiveCamera): void {
    this.overlay.scene.visible = Boolean(pickupCandidate || canPutDown);
    this.placeLabel.visible = canPutDown && !this.isTouchEnabled;
    this.touchPanel.visible = this.isTouchEnabled && Boolean(pickupCandidate || canPutDown);
    this.touchTakeLabel.visible = this.touchPanel.visible && !canPutDown;
    this.touchPlaceLabel.visible = this.touchPanel.visible && canPutDown;
    this.takeLabel.visible = false;
    if (!pickupCandidate) return;
    this.screenPosition.copy(pickupCandidate.collider.center);
    this.screenPosition.y += pickupCandidate.collider.halfSize.y + 0.25;
    camera.updateWorldMatrix(true, false);
    this.screenPosition.project(camera);
    this.takeLabel.visible = !this.isTouchEnabled && Math.abs(this.screenPosition.x) < 1
      && Math.abs(this.screenPosition.y) < 1 && Math.abs(this.screenPosition.z) < 1;
    this.takeLabel.position.set((this.screenPosition.x + 1) * this.width / 2, (1 - this.screenPosition.y) * this.height / 2, 0);
  }

  render(renderer: WebGLRenderer): void {
    this.overlay.render(renderer);
  }

  dispose(): void {
    this.overlay.dispose();
  }

}
