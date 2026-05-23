import type { PetFoodInventoryItem, PetStatus } from "../../types/api";

export type MainPetDisplayStatus =
  | "待同步"
  | "饥饿"
  | "疲惫"
  | "低落"
  | "休息中"
  | "玩耍中"
  | "状态良好";

export type LocalPetMode = "resting" | null;

export type PetVisualState =
  | "serverDerived"
  | "eating"
  | "playing"
  | "sleeping"
  | "listening"
  | "soothed";

export type MainViewModel = {
  petName: string;
  levelBadgeText: string;
  levelText: string;
  satiety: number | null;
  stamina: number | null;
  mood: number | null;
  foods: PetFoodInventoryItem[];
  displayStatus: MainPetDisplayStatus;
  isDashboardReady: boolean;
  statusValueText: string;
};

type ResolveMainViewModelInput = {
  pet: PetStatus | null;
  foods: PetFoodInventoryItem[];
  localPetMode: LocalPetMode;
  activeVisualState: PetVisualState;
};

export function resolveMainViewModel(input: ResolveMainViewModelInput): MainViewModel {
  const { pet, foods, localPetMode, activeVisualState } = input;
  const satiety = normalizeStatusValue(pet?.hunger);
  const stamina = normalizeStatusValue(pet?.energy);
  const mood = normalizeStatusValue(pet?.mood);
  const level =
    typeof pet?.level === "number" && Number.isFinite(pet.level)
      ? Math.max(0, Math.floor(pet.level))
      : null;
  const displayStatus = resolveDisplayStatus({
    status: pet?.display_status ?? pet?.status,
    satiety,
    stamina,
    mood,
    localPetMode,
    activeVisualState,
  });

  return {
    petName: pet?.name?.trim() || "待同步",
    levelBadgeText: level === null ? "--" : `Lv.${level}`,
    levelText: level === null ? "等级 待同步" : `等级 Lv.${level}`,
    satiety,
    stamina,
    mood,
    foods,
    displayStatus,
    isDashboardReady: Boolean(pet),
    statusValueText: displayStatus,
  };
}

export function normalizeStatusValue(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function resolveDisplayStatus(input: {
  status: unknown;
  satiety: number | null;
  stamina: number | null;
  mood: number | null;
  localPetMode: LocalPetMode;
  activeVisualState: PetVisualState;
}): MainPetDisplayStatus {
  const { status, satiety, stamina, mood, localPetMode, activeVisualState } = input;
  if (activeVisualState === "sleeping") {
    return "休息中";
  }
  if (activeVisualState === "playing") {
    return "玩耍中";
  }
  if (localPetMode === "resting") {
    return "休息中";
  }
  const serverStatus = mapServerStatus(status);
  if (serverStatus) {
    return serverStatus;
  }
  if (satiety !== null && satiety < 30) {
    return "饥饿";
  }
  if (stamina !== null && stamina < 30) {
    return "疲惫";
  }
  if (mood !== null && mood < 40) {
    return "低落";
  }
  if (satiety === null && stamina === null && mood === null) {
    return "待同步";
  }
  return "状态良好";
}

export function mapServerStatus(status: unknown): MainPetDisplayStatus | null {
  if (typeof status === "boolean") {
    return status ? "状态良好" : null;
  }
  if (typeof status !== "string") {
    return null;
  }

  const normalized = status.trim().toLowerCase();
  if (!normalized) {
    return null;
  }
  if (normalized.includes("sleep") || normalized.includes("rest") || normalized.includes("休息")) {
    return "休息中";
  }
  if (normalized.includes("play") || normalized.includes("happy") || normalized.includes("玩")) {
    return "玩耍中";
  }
  if (normalized.includes("hungry") || normalized.includes("饥")) {
    return "饥饿";
  }
  if (normalized.includes("tired") || normalized.includes("疲")) {
    return "疲惫";
  }
  if (normalized.includes("sad") || normalized.includes("low") || normalized.includes("低")) {
    return "低落";
  }
  if (normalized.includes("good") || normalized.includes("normal") || normalized.includes("active") || normalized.includes("良好")) {
    return "状态良好";
  }
  return null;
}

export function isPetSnapshotSleeping(pet: { display_status?: string; status?: boolean }): boolean {
  return mapServerStatus(pet.display_status ?? pet.status) === "休息中";
}

export function resolveStatusIcon(status: MainPetDisplayStatus): string {
  switch (status) {
    case "饥饿":
      return "🍚";
    case "疲惫":
    case "休息中":
      return "Zz";
    case "玩耍中":
      return "☆";
    case "低落":
      return "♡";
    case "状态良好":
      return "✓";
    case "待同步":
    default:
      return "...";
  }
}
