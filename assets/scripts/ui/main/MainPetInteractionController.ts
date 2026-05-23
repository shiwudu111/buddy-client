export type CorePetAction = "sleep" | "play" | "care";

const CORE_PET_ACTION_COOLDOWN_MS = 300;

export type CorePetActionBeginResult =
  | { ok: true }
  | { ok: false; reason: "active" | "disposed" };

export class MainPetInteractionController {
  private activeCoreAction: CorePetAction | null = null;
  private coreActionCooldownUntil = 0;
  private disposed = false;

  dispose(): void {
    this.disposed = true;
    this.activeCoreAction = null;
  }

  beginCoreAction(action: CorePetAction): CorePetActionBeginResult {
    if (this.disposed) {
      return { ok: false, reason: "disposed" };
    }
    if (this.activeCoreAction) {
      return { ok: false, reason: "active" };
    }

    this.activeCoreAction = action;
    return { ok: true };
  }

  isCurrentCoreAction(action: CorePetAction): boolean {
    return !this.disposed && this.activeCoreAction === action;
  }

  clearCoreAction(action: CorePetAction): void {
    if (this.activeCoreAction === action) {
      this.activeCoreAction = null;
    }
  }

  getCoreActionCooldownRemainingMs(now = Date.now()): number {
    return Math.max(0, this.coreActionCooldownUntil - now);
  }

  startCoreActionCooldown(now = Date.now()): void {
    this.coreActionCooldownUntil = now + CORE_PET_ACTION_COOLDOWN_MS;
  }
}
