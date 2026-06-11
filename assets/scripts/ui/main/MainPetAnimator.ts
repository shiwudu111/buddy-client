import { Size, Sprite, SpriteAtlas, SpriteFrame } from "cc";
import {
  MainPetBehaviorController,
  type FoxAnimationState,
  type PetBehaviorState,
} from "./MainPetBehaviorController";

export type PetAnimatorEvent = "idleShowStarted";

export function resolveFoxAtlasFrames(atlas: SpriteAtlas, framePrefix: string): SpriteFrame[] {
  return atlas
    .getSpriteFrames()
    .filter((spriteFrame) => spriteFrame.name.startsWith(framePrefix))
    .sort((left, right) => resolveFoxFrameOrder(left.name) - resolveFoxFrameOrder(right.name));
}

function resolveFoxFrameOrder(frameName: string): number {
  const match = frameName.match(/(\d+)/);
  return match ? Number(match[1]) : 0;
}

export class MainPetAnimator {
  private idleDefaultFrames: SpriteFrame[] = [];
  private idleShowFrames: SpriteFrame[] = [];
  private behaviorController = new MainPetBehaviorController();
  private fallbackSpriteFrame: SpriteFrame | null = null;
  private sprite: Sprite | null = null;

  bindSprite(sprite: Sprite): void {
    this.sprite = sprite;
  }

  clearSprite(): void {
    this.sprite = null;
  }

  setFallbackSpriteFrame(spriteFrame: SpriteFrame | null): void {
    this.fallbackSpriteFrame = spriteFrame;
  }

  setIdleDefaultFrames(frames: SpriteFrame[]): void {
    this.idleDefaultFrames = [...frames];
    this.behaviorController.resetAnimation("idle");
    this.applyCurrentSpriteFrame();
  }

  setIdleShowFrames(frames: SpriteFrame[]): void {
    this.idleShowFrames = [...frames];
    this.applyCurrentSpriteFrame();
  }

  setIdleFrames(state: FoxAnimationState, frames: SpriteFrame[]): void {
    if (state === "idle") {
      this.setIdleDefaultFrames(frames);
      return;
    }
    this.setIdleShowFrames(frames);
  }

  getBehaviorState(): PetBehaviorState {
    return this.behaviorController.getBehaviorState();
  }

  getCurrentSpriteFrame(): SpriteFrame | null {
    const animationState = this.behaviorController.getAnimationState();
    const frames =
      animationState === "idleShow" && this.idleShowFrames.length > 0
        ? this.idleShowFrames
        : this.idleDefaultFrames;
    if (frames.length > 0) {
      return frames[Math.min(this.behaviorController.getFrameIndex(), frames.length - 1)] ?? null;
    }
    return this.fallbackSpriteFrame;
  }

  resolveCurrentStableSize(spriteFrame: SpriteFrame): Size {
    const animationState = this.behaviorController.getAnimationState();
    const sequenceFrames = this.idleDefaultFrames.length > 0
      ? this.idleDefaultFrames
      : animationState === "idleShow" && this.idleShowFrames.length > 0
        ? this.idleShowFrames
        : this.idleDefaultFrames;
    const sourceFrames = sequenceFrames.length > 0 ? sequenceFrames : [spriteFrame];
    return sourceFrames.reduce((stableSize, frame) => {
      const frameSize = resolveFoxFrameSourceSize(frame);
      return new Size(
        Math.max(stableSize.width, frameSize.width),
        Math.max(stableSize.height, frameSize.height)
      );
    }, resolveFoxFrameSourceSize(spriteFrame));
  }

  resetInactivity(): void {
    if (this.behaviorController.resetInactivity()) {
      this.applyCurrentSpriteFrame();
    }
  }

  update(deltaTime: number, shouldAnimate: boolean): PetAnimatorEvent | null {
    const previousState = this.behaviorController.getAnimationState();
    const didUpdateFrame = this.behaviorController.update({
      shouldAnimate,
      idleFrameCount: this.idleDefaultFrames.length,
      idleShowFrameCount: this.idleShowFrames.length,
      deltaTime,
    });
    if (didUpdateFrame) {
      this.applyCurrentSpriteFrame();
    }
    return previousState !== "idleShow" && this.behaviorController.getAnimationState() === "idleShow"
      ? "idleShowStarted"
      : null;
  }

  private applyCurrentSpriteFrame(): void {
    if (!this.sprite?.node.isValid) {
      this.sprite = null;
      return;
    }

    const spriteFrame = this.getCurrentSpriteFrame();
    if (!spriteFrame || this.sprite.spriteFrame === spriteFrame) {
      return;
    }

    this.sprite.spriteFrame = spriteFrame;
  }
}

function resolveFoxFrameSourceSize(spriteFrame: SpriteFrame): Size {
  const originalSize = spriteFrame.originalSize;
  if (originalSize.width > 0 && originalSize.height > 0) {
    return originalSize;
  }
  const frameRect = spriteFrame.rect;
  return frameRect.width > 0 && frameRect.height > 0
    ? new Size(frameRect.width, frameRect.height)
    : new Size(1, 1);
}
