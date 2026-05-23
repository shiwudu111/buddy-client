export type PetBehaviorState =
  | "idle"
  | "idleShow"
  | "bored"
  | "yawn"
  | "groom"
  | "eating"
  | "playing"
  | "sleeping";

export type FoxAnimationState = Extract<PetBehaviorState, "idle" | "idleShow">;

export type PetBehaviorFrameInput = {
  shouldAnimate: boolean;
  idleFrameCount: number;
  idleShowFrameCount: number;
  deltaTime: number;
};

const FOX_IDLE_DEFAULT_FRAME_DURATION_MS = 83;
const FOX_IDLE_SHOW_FRAME_DURATION_MS = Math.round(FOX_IDLE_DEFAULT_FRAME_DURATION_MS * 1.5);
const FOX_IDLE_SHOW_TRIGGER_MS = 8000;

export class MainPetBehaviorController {
  private animationState: FoxAnimationState = "idle";
  private frameIndex = 0;
  private frameElapsedMs = 0;
  private idleElapsedMs = 0;

  getBehaviorState(): PetBehaviorState {
    return this.animationState;
  }

  getAnimationState(): FoxAnimationState {
    return this.animationState;
  }

  getFrameIndex(): number {
    return this.frameIndex;
  }

  resetInactivity(): boolean {
    this.idleElapsedMs = 0;
    if (this.animationState !== "idleShow") {
      return false;
    }

    this.resetAnimation("idle");
    return true;
  }

  resetAnimation(state: FoxAnimationState = "idle"): void {
    this.animationState = state;
    this.frameIndex = 0;
    this.frameElapsedMs = 0;
    if (state === "idle") {
      this.idleElapsedMs = 0;
    }
  }

  update(input: PetBehaviorFrameInput): boolean {
    if (!input.shouldAnimate) {
      return false;
    }
    if (input.idleFrameCount === 0 && input.idleShowFrameCount === 0) {
      return false;
    }

    const deltaMs = Math.min(250, Math.max(0, input.deltaTime * 1000));
    if (this.animationState === "idle") {
      this.idleElapsedMs += deltaMs;
      if (input.idleShowFrameCount > 0 && this.idleElapsedMs >= FOX_IDLE_SHOW_TRIGGER_MS) {
        this.resetAnimation("idleShow");
        return true;
      }
      return this.advanceFrame(input.idleFrameCount, FOX_IDLE_DEFAULT_FRAME_DURATION_MS, deltaMs, true);
    }

    return this.advanceFrame(input.idleShowFrameCount, FOX_IDLE_SHOW_FRAME_DURATION_MS, deltaMs, false);
  }

  private advanceFrame(
    frameCount: number,
    frameDurationMs: number,
    deltaMs: number,
    shouldLoop: boolean
  ): boolean {
    if (frameCount <= 1 || frameDurationMs <= 0) {
      return false;
    }

    this.frameElapsedMs += deltaMs;
    let didAdvance = false;
    while (this.frameElapsedMs >= frameDurationMs) {
      this.frameElapsedMs -= frameDurationMs;
      const nextFrameIndex = this.frameIndex + 1;
      if (nextFrameIndex >= frameCount) {
        if (shouldLoop) {
          this.frameIndex = 0;
        } else {
          this.resetAnimation("idle");
          didAdvance = true;
          break;
        }
      } else {
        this.frameIndex = nextFrameIndex;
      }
      didAdvance = true;
    }

    return didAdvance;
  }
}
