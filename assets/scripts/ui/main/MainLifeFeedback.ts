import { STORAGE_KEYS } from "../../core/storage";
import type {
  DailyBasicFoodPayload,
  OfflineDecaySummary,
  PetStatus,
  TimeContextDayPeriod,
  TimeContextPayload,
} from "../../types/api";
import { normalizeStatusValue } from "./MainViewModel";

export type PetBubbleSource =
  | "timeContext"
  | "localFallbackGreeting"
  | "stateBubble"
  | "actionFeedback";

export type PetBubble = {
  text: string;
  source: PetBubbleSource;
  createdAt: string;
};

export type OpeningBubblePriority = "high" | "normal";
export type LocalGreetingWindow = "short" | "normal" | "long" | "overnight";

type LifeFeedbackStorage = {
  get(key: string): string | null;
  set(key: string, value: string): void;
};

export function resolveHighPriorityOpeningBubble(input: {
  timeContext: TimeContextPayload | null;
  offlineDecay: OfflineDecaySummary | null;
  dailyBasicFood: DailyBasicFoodPayload | undefined;
  petId: string | null;
  storage: LifeFeedbackStorage;
}): { text: string; source: PetBubbleSource } | null {
  const { timeContext, offlineDecay, dailyBasicFood, petId, storage } = input;
  if (dailyBasicFood?.granted) {
    return {
      text: "今日基础口粮已送达，记得照顾小橘哦。",
      source: "timeContext",
    };
  }
  if (offlineDecay?.applied) {
    return {
      text: formatOfflineDecayDetail(offlineDecay),
      source: "timeContext",
    };
  }
  const backendGreeting = resolveBackendReturnGreeting(timeContext, petId, storage);
  if (backendGreeting) {
    return backendGreeting;
  }
  return resolveLocalFallbackGreeting(timeContext, petId, storage);
}

export function resolveNormalOpeningBubble(input: {
  timeContext: TimeContextPayload | null;
  pet: PetStatus | null;
}): { text: string; source: PetBubbleSource } | null {
  const stateBubble = resolveStateBubbleCopy(input.pet);
  if (stateBubble) {
    return {
      text: stateBubble,
      source: "stateBubble",
    };
  }

  if (!input.timeContext) {
    return null;
  }

  const timePeriodCopy = resolveTimePeriodCopy(input.timeContext.dayPeriod);
  return timePeriodCopy
    ? {
        text: timePeriodCopy,
        source: "timeContext",
      }
    : null;
}

export function resolveBackendReturnGreeting(
  timeContext: TimeContextPayload | null,
  petId: string | null,
  storage: LifeFeedbackStorage
): { text: string; source: PetBubbleSource } | null {
  const greeting = timeContext?.returnGreeting;
  if (!greeting?.shouldShow || !greeting.text.trim()) {
    return null;
  }
  const shownKey = resolveReturnGreetingShownStorageKey(
    petId,
    resolveGreetingLocalDate(timeContext),
    mapReturnGreetingReasonToWindow(greeting.reason)
  );
  if (shownKey && storage.get(shownKey)) {
    return null;
  }
  if (shownKey) {
    storage.set(shownKey, resolveCurrentSeenAt(timeContext));
  }
  return {
    text: greeting.text.trim(),
    source: "timeContext",
  };
}

export function resolveLocalFallbackGreeting(
  timeContext: TimeContextPayload | null,
  petId: string | null,
  storage: LifeFeedbackStorage
): { text: string; source: PetBubbleSource } | null {
  if (!petId) {
    return null;
  }
  const lastSeenAt = storage.get(resolveLastMainSeenAtStorageKey(petId));
  if (!lastSeenAt) {
    return null;
  }
  const now = new Date(resolveCurrentSeenAt(timeContext));
  const lastSeen = new Date(lastSeenAt);
  if (!Number.isFinite(now.getTime()) || !Number.isFinite(lastSeen.getTime())) {
    return null;
  }
  const elapsedMinutes = Math.floor((now.getTime() - lastSeen.getTime()) / 60000);
  if (elapsedMinutes < 10) {
    return null;
  }

  const localDate = resolveGreetingLocalDate(timeContext);
  const lastSeenDate = getLocalDateKey(lastSeen);
  const windowKey: LocalGreetingWindow =
    lastSeenDate !== localDate
      ? "overnight"
      : elapsedMinutes >= 360
        ? "long"
        : elapsedMinutes >= 60
          ? "normal"
          : "short";
  const shownKey = resolveReturnGreetingShownStorageKey(petId, localDate, windowKey);
  if (shownKey && storage.get(shownKey)) {
    return null;
  }
  if (shownKey) {
    storage.set(shownKey, now.toISOString());
  }
  return {
    text: resolveLocalFallbackGreetingCopy(windowKey),
    source: "localFallbackGreeting",
  };
}

export function resolveStateBubbleCopy(pet: PetStatus | null): string | null {
  if (!pet) {
    return null;
  }
  const hunger = normalizeStatusValue(pet.hunger);
  const energy = normalizeStatusValue(pet.energy);
  const mood = normalizeStatusValue(pet.mood);
  if (hunger !== null && hunger < 35) {
    return "肚子有点空空的，要不要看看背包？";
  }
  if (energy !== null && energy < 30) {
    return "有点困了，想安静休息一下。";
  }
  if (mood !== null && mood < 35) {
    return "今天有点没精神，想被陪一会儿。";
  }
  if (hunger !== null || energy !== null || mood !== null) {
    return "今天状态不错，见到你很开心。";
  }
  return null;
}

export function resolveIdleShowBubbleCopy(pet: PetStatus | null, copyIndex: number): string {
  const hunger = normalizeStatusValue(pet?.hunger);
  const energy = normalizeStatusValue(pet?.energy);
  const mood = normalizeStatusValue(pet?.mood);
  if (hunger !== null && hunger < 35) {
    return "肚子有点空空的，等你想起我。";
  }
  if (energy !== null && energy < 30) {
    return "我有点困，先安静趴一会儿。";
  }
  if (mood !== null && mood < 35) {
    return "今天想被多陪一会儿。";
  }

  const copies = [
    "我在这里慢慢等你。",
    "要不要陪我待一会儿？",
    "我刚刚伸了个懒腰。",
  ];
  return copies[copyIndex % copies.length];
}

export function resolveTimePeriodCopy(dayPeriod: TimeContextDayPeriod): string | null {
  const copy: Record<TimeContextDayPeriod, string> = {
    morning: "早上好呀，今天也一起慢慢来。",
    noon: "中午啦，要不要休息一下？",
    afternoon: "下午还有精神吗？我在这里陪你。",
    evening: "晚上变安静了，我有点想和你待一会儿。",
    night: "有点晚了，今天也辛苦啦。",
    lateNight: "这么晚还在呀，要不要早点休息？",
  };
  return copy[dayPeriod] ?? null;
}

export function resolveLocalFallbackGreetingCopy(windowKey: LocalGreetingWindow): string {
  const copy: Record<LocalGreetingWindow, string> = {
    short: "你回来啦，我刚刚在这里待了一会儿。",
    normal: "你回来啦，见到你真好。",
    long: "等了一阵子，看到你回来我安心啦。",
    overnight: "今天又见到你啦，我们继续一起慢慢来。",
  };
  return copy[windowKey];
}

export function mapReturnGreetingReasonToWindow(reason: string): LocalGreetingWindow {
  if (reason === "overnight" || reason === "new_day") {
    return "overnight";
  }
  if (reason === "long_return") {
    return "long";
  }
  return "short";
}

export function resolveGreetingLocalDate(timeContext: TimeContextPayload | null): string {
  return timeContext?.localDate || getLocalDateKey(new Date());
}

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function resolveCurrentSeenAt(timeContext: TimeContextPayload | null): string {
  return timeContext?.serverNow || new Date().toISOString();
}

export function resolveLastMainSeenAtStorageKey(petId: string): string {
  return `${STORAGE_KEYS.petLifeLastMainSeenAtPrefix}${petId}`;
}

export function resolveReturnGreetingShownStorageKey(
  petId: string | null,
  localDate: string,
  windowKey: LocalGreetingWindow
): string | null {
  return petId
    ? `${STORAGE_KEYS.petLifeReturnGreetingShownPrefix}${petId}:${localDate}:${windowKey}`
    : null;
}

export function formatOfflineDecayDetail(summary: OfflineDecaySummary): string {
  const hours =
    typeof summary.elapsedHours === "number" && Number.isFinite(summary.elapsedHours)
      ? Math.max(0, Math.round(summary.elapsedHours * 10) / 10)
      : null;
  if (summary.message?.trim()) {
    return summary.message.trim();
  }
  return hours === null
    ? "你离开时，小橘也在慢慢消耗体力。"
    : `你离开了 ${hours} 小时，小橘的状态有一点变化。`;
}
