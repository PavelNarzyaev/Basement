import { AnimationMixer, MathUtils } from 'three';
import type { AnimationAction, AnimationClip, Object3D } from 'three';
import type { IObject3DResourceDisposer } from '../../disposer/contracts/IObject3DResourceDisposer';
import type { IPlayerVisual } from '../contracts/IPlayerVisual';
import { playerSettings } from '../contracts/playerSettings';

export class PlayerVisual implements IPlayerVisual {
  private readonly mixer: AnimationMixer;
  private readonly idle: AnimationAction;
  private readonly move: AnimationAction;
  private readonly carryIdle: AnimationAction;
  private readonly carryMove: AnimationAction;
  private readonly actions: readonly AnimationAction[];
  private currentAction: AnimationAction;

  constructor(
    readonly object: Object3D,
    animations: readonly AnimationClip[],
    private readonly objectDisposer: IObject3DResourceDisposer,
  ) {
    this.mixer = new AnimationMixer(object);
    this.idle = this.createAction(animations, 'Idle');
    this.move = this.createAction(animations, 'Move');
    this.carryIdle = this.createAction(animations, 'CarryIdle');
    this.carryMove = this.createAction(animations, 'CarryMove');
    this.actions = [this.idle, this.move, this.carryIdle, this.carryMove];
    this.currentAction = this.idle;
    this.idle.setEffectiveWeight(1);
    this.mixer.update(0);
  }

  update(deltaSeconds: number, actualHorizontalSpeed: number, isCarrying: boolean): void {
    const isMoving = actualHorizontalSpeed > playerSettings.minimumMovementSpeed;
    const nextAction = isCarrying
      ? (isMoving ? this.carryMove : this.carryIdle)
      : (isMoving ? this.move : this.idle);
    if (nextAction !== this.currentAction) {
      const wasMoving = this.currentAction === this.move || this.currentAction === this.carryMove;
      if (isMoving) {
        nextAction.time = wasMoving
          ? this.currentAction.time / this.currentAction.getClip().duration * nextAction.getClip().duration
          : 0;
      }
      this.currentAction = nextAction;
    }
    this.move.setEffectiveTimeScale(actualHorizontalSpeed / playerSettings.unladenMovementSpeed);
    this.carryMove.setEffectiveTimeScale(actualHorizontalSpeed / playerSettings.carryingMovementSpeed);
    for (const action of this.actions) {
      action.setEffectiveWeight(MathUtils.damp(
        action.getEffectiveWeight(), action === this.currentAction ? 1 : 0, playerSettings.animationBlendRate, deltaSeconds,
      ));
    }
    this.mixer.update(deltaSeconds);
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.mixer.uncacheRoot(this.object);
    this.object.removeFromParent();
    this.objectDisposer.dispose(this.object);
  }

  private createAction(animations: readonly AnimationClip[], name: string): AnimationAction {
    const clip = animations.find((animation) => animation.name === name);
    if (!clip) throw new Error(`Player model is missing the ${name} animation.`);
    return this.mixer.clipAction(clip).setEffectiveWeight(0).play();
  }
}
