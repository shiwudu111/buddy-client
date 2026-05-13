import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type {
  ApiResponse,
  DailyBasicFoodPayload,
  DiaryDay,
  DiaryEntry,
  DiaryPayload,
  InventoryFoodItem,
  MainEventEntry,
  OfflineDecaySummary,
  OfflineDecaySummaryWire,
  PetActionResultPayload,
  PetDashboardPayload,
  PetEventsPayload,
  PetEvolutionPayload,
  PetFeedPayload,
  PetFeedResultPayload,
  PetStatus,
  UseInventoryItemResultPayload,
} from "../types/api";

type PetStatusWire = PetStatus & {
  cleanliness?: unknown;
  clean?: unknown;
  lastDecayAt?: unknown;
  last_decay_at?: unknown;
  last_state_updated_at?: unknown;
};

type PetStatusResponse = ApiResponse<PetStatus> & {
  dailyBasicFood?: DailyBasicFoodPayload;
  offlineDecay?: OfflineDecaySummary;
};

type InventoryUseResponse = ApiResponse<UseInventoryItemResultPayload> & {
  offlineDecay?: OfflineDecaySummary;
};

type DiaryResponse = ApiResponse<DiaryPayload> & {
  data?: DiaryPayload;
};

class PetService {
  async refreshDashboard(
    canCommit?: () => boolean
  ): Promise<PetStatusResponse> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    const dashboardResult = await apiClient.getPetDashboard(petId);
    if (dashboardResult.success && dashboardResult.data && (!canCommit || canCommit())) {
      const pet = this.applyDashboardPayload(dashboardResult.data);
      return {
        success: true,
        data: pet,
        dailyBasicFood: dashboardResult.data.dailyBasicFood,
        offlineDecay: this.normalizeOfflineDecaySummary(dashboardResult.data),
        statusCode: dashboardResult.statusCode,
      };
    }

    const statusResult = await apiClient.getPetStatus(petId);
    if (statusResult.success && statusResult.data && (!canCommit || canCommit())) {
      const pet = this.normalizePetStatus(statusResult.data);
      appState.setPetId(pet.pet_id);
      appState.setCurrentPet(pet);
      if (!appState.getPetFoodInventory().length) {
        appState.setPetFoodInventory([]);
      }
      return {
        ...statusResult,
        data: pet,
      };
    }

    if (statusResult.statusCode === 404 && (!canCommit || canCommit())) {
      appState.clearPetState();
    }

    return statusResult.success
      ? statusResult
      : {
          success: false,
          message: dashboardResult.message ?? statusResult.message,
          statusCode: dashboardResult.statusCode ?? statusResult.statusCode,
        };
  }

  async refreshCurrentPet(canCommit?: () => boolean): Promise<PetStatusResponse> {
    return this.refreshDashboard(canCommit);
  }

  async getCurrentPetEvolution(): Promise<ApiResponse<PetEvolutionPayload>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    return apiClient.getPetEvolution(petId);
  }

  async refreshCurrentPetEvents(limit = 20): Promise<ApiResponse<PetEventsPayload>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    const result = await apiClient.getPetEvents(petId, limit);
    if (result.success && Array.isArray(result.data?.events)) {
      appState.setMainEvents(result.data.events);
      return result;
    }

    return {
      success: false,
      message: result.success
        ? "事件接口返回不完整"
        : result.message ?? "读取事件失败",
      statusCode: result.statusCode,
    };
  }

  async loadPetDiary(days = 7): Promise<ApiResponse<DiaryPayload>> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "当前没有宠物 ID",
      };
    }

    const logsResult = await apiClient.getPetLogs(petId, { days });
    let sourcePayload = this.extractDiaryPayload(logsResult);
    let sourceStatusCode = logsResult.statusCode;

    if (!sourcePayload && this.shouldFallbackDiaryLogsToEvents(logsResult)) {
      const eventsResult = await apiClient.getPetEvents(petId, 100);
      sourcePayload = this.extractDiaryPayload(eventsResult);
      sourceStatusCode = eventsResult.statusCode;
      if (!sourcePayload) {
        return {
          success: false,
          message: eventsResult.success
            ? "日记事件接口返回不完整"
            : eventsResult.message ?? "日记暂未同步，请稍后再试",
          code: eventsResult.code,
          statusCode: eventsResult.statusCode,
        };
      }
    }

    if (!sourcePayload) {
      return {
        success: false,
        message: logsResult.success
          ? "日记接口返回不完整"
          : logsResult.message ?? "日记暂未同步，请稍后再试",
        code: logsResult.code,
        statusCode: logsResult.statusCode,
      };
    }

    const diaryDays = this.normalizeDiaryDays(sourcePayload, days);
    appState.setDiaryDays(diaryDays);
    return {
      success: true,
      data: {
        days: diaryDays,
      },
      statusCode: sourceStatusCode,
    };
  }

  async createPet(name = "Buddy"): Promise<ApiResponse<PetStatus>> {
    return apiClient.createPet(name);
  }

  async feedCurrentPet(payload: PetFeedPayload): Promise<InventoryUseResponse> {
    return this.useFoodFromInventory(payload);
  }

  async useFoodFromInventory(
    food: Pick<InventoryFoodItem, "food_type" | "food_quality">
  ): Promise<InventoryUseResponse> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "请先创建宠物",
      };
    }

    const result = await apiClient.useInventoryItem(petId, {
      itemType: "food",
      food_type: food.food_type,
      food_quality: food.food_quality,
    });

    const inventory = this.normalizeInventoryFoods(result.data);
    if (result.success && result.data?.pet && inventory) {
      const pet = this.normalizePetStatus(result.data.pet);
      const logs = this.normalizeMainEvents(result.data.logs);
      appState.setCurrentPet(pet);
      appState.setPetFoodInventory(inventory);
      if (logs.length) {
        appState.setMainEvents(logs);
      }
      return {
        ...result,
        offlineDecay: this.normalizeOfflineDecaySummary(result.data),
        data: {
          ...result.data,
          pet,
          foods: inventory,
          inventory,
          logs,
          offlineDecay: this.normalizeOfflineDecaySummary(result.data),
        },
      };
    }

    return {
      success: false,
      message: result.success
        ? "背包使用接口返回不完整"
        : result.message ?? "背包使用接口暂不可用",
      statusCode: result.statusCode,
    };
  }

  async sleepCurrentPet(): Promise<PetStatusResponse> {
    return this.runCurrentPetAction((petId) => apiClient.sleepPet(petId), "休息接口返回不完整", "休息失败");
  }

  async playCurrentPet(): Promise<PetStatusResponse> {
    return this.runCurrentPetAction((petId) => apiClient.playPet(petId), "玩耍接口返回不完整", "玩耍失败");
  }

  async careCurrentPet(): Promise<PetStatusResponse> {
    return this.runCurrentPetAction((petId) => apiClient.carePet(petId), "关怀接口返回不完整", "关怀失败");
  }

  normalizeFoodInventoryPayload(
    payload: Pick<UseInventoryItemResultPayload, "inventory" | "foods"> | undefined
  ): InventoryFoodItem[] | null {
    return this.normalizeInventoryFoods(payload);
  }

  private applyDashboardPayload(payload: PetDashboardPayload): PetStatus {
    const pet = this.normalizePetStatus(payload.pet);
    appState.setPetId(pet.pet_id);
    appState.setCurrentPet(pet);
    appState.setPetFoodInventory(this.normalizeDashboardFoodInventory(payload));
    if (payload.recent_events?.length) {
      appState.setMainEvents(payload.recent_events);
    }
    return pet;
  }

  private async runCurrentPetAction(
    requestAction: (petId: string) => Promise<ApiResponse<PetActionResultPayload>>,
    incompleteMessage: string,
    fallbackMessage: string
  ): Promise<PetStatusResponse> {
    const petId = appState.getPetId();
    if (!petId) {
      return {
        success: false,
        message: "请先创建宠物",
      };
    }

    const result = await requestAction(petId);
    if (result.success && result.data?.pet) {
      const pet = this.normalizePetStatus(result.data.pet);
      appState.setCurrentPet(pet);
      return {
        success: true,
        data: pet,
        offlineDecay: this.normalizeOfflineDecaySummary(result.data),
        statusCode: result.statusCode,
      };
    }

    return {
      success: false,
      message: result.success
        ? incompleteMessage
        : result.message ?? fallbackMessage,
      statusCode: result.statusCode,
    };
  }

  private normalizePetStatus(pet: PetStatus): PetStatus {
    const raw = pet as PetStatusWire;
    const cleanliness = this.normalizeResourceValue(raw.cleanliness ?? raw.clean);
    const lastDecayAt = this.normalizeTextValue(
      raw.lastDecayAt ?? raw.last_decay_at ?? raw.last_state_updated_at
    );

    return {
      ...pet,
      ...(cleanliness === null ? {} : { cleanliness }),
      ...(lastDecayAt === null ? {} : { lastDecayAt }),
    };
  }

  private normalizeOfflineDecaySummary(
    payload: { offlineDecay?: OfflineDecaySummary; offline_decay?: OfflineDecaySummaryWire }
  ): OfflineDecaySummary | undefined {
    const raw = (payload.offlineDecay ?? payload.offline_decay) as OfflineDecaySummaryWire | undefined;
    if (!raw) {
      return undefined;
    }

    const elapsedHours =
      typeof raw.elapsedHours === "number" && Number.isFinite(raw.elapsedHours)
        ? raw.elapsedHours
        : typeof raw.elapsed_hours === "number" && Number.isFinite(raw.elapsed_hours)
          ? raw.elapsed_hours
          : undefined;

    return {
      ...(typeof raw.applied === "boolean" ? { applied: raw.applied } : {}),
      ...(elapsedHours === undefined ? {} : { elapsedHours }),
      ...(typeof raw.message === "string" && raw.message.trim() ? { message: raw.message } : {}),
    };
  }

  private normalizeResourceValue(value: unknown): number | null {
    if (typeof value !== "number" || !Number.isFinite(value)) {
      return null;
    }
    return Math.max(0, Math.min(100, Math.round(value)));
  }

  private normalizeTextValue(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value : null;
  }

  private normalizeInventoryFoods(
    payload: Pick<UseInventoryItemResultPayload, "inventory" | "foods"> | undefined
  ): InventoryFoodItem[] | null {
    const rawFoods = Array.isArray(payload?.inventory)
      ? payload.inventory
      : Array.isArray(payload?.foods)
        ? payload.foods
        : null;
    if (!rawFoods) {
      return null;
    }

    return rawFoods.map((food) => ({
      itemType: "food" as const,
      food_type: food.food_type,
      food_quality: food.food_quality,
      count: Math.max(0, Math.floor(food.count)),
    }));
  }

  private normalizeDashboardFoodInventory(
    payload: Pick<PetDashboardPayload, "foods" | "inventory">
  ): InventoryFoodItem[] {
    const rawFoods = Array.isArray(payload.foods)
      ? payload.foods
      : Array.isArray(payload.inventory)
        ? payload.inventory.filter((item) => item.itemType === "food")
        : [];

    return rawFoods.map((food) => ({
      itemType: "food" as const,
      food_type: food.food_type,
      food_quality: food.food_quality,
      count: Math.max(0, Math.floor(food.count)),
    }));
  }

  private normalizeMainEvents(events: unknown): MainEventEntry[] {
    return Array.isArray(events) ? (events as MainEventEntry[]) : [];
  }

  private shouldFallbackDiaryLogsToEvents(result: DiaryResponse): boolean {
    return (
      result.statusCode === 404 ||
      result.statusCode === 405 ||
      result.statusCode === 501 ||
      result.code === "NOT_IMPLEMENTED"
    );
  }

  private extractDiaryPayload(result: ApiResponse<unknown>): DiaryPayload | null {
    const data = result.data;
    if (this.isDiaryPayload(data)) {
      return data;
    }

    const raw = result as unknown;
    return this.isDiaryPayload(raw) ? raw : null;
  }

  private isDiaryPayload(value: unknown): value is DiaryPayload {
    if (!value || typeof value !== "object") {
      return false;
    }
    const candidate = value as DiaryPayload;
    return Array.isArray(candidate.days) || Array.isArray(candidate.logs) || Array.isArray(candidate.events);
  }

  private normalizeDiaryDays(payload: DiaryPayload, maxDays: number): DiaryDay[] {
    if (Array.isArray(payload.days)) {
      return this.normalizeWireDiaryDays(payload.days, maxDays);
    }

    const events = Array.isArray(payload.logs) ? payload.logs : payload.events ?? [];
    return this.groupDiaryEventsByLocalDate(events, maxDays);
  }

  private normalizeWireDiaryDays(days: DiaryDay[], maxDays: number): DiaryDay[] {
    return days
      .map((day) => {
        const entries = this.normalizeDiaryEntries(day.entries ?? [])
          .sort((a, b) => this.getTimestampMs(b.timestamp) - this.getTimestampMs(a.timestamp));
        return {
          date: day.date,
          dateText: day.dateText || this.formatDiaryDateText(day.date),
          summary: day.summary || this.createDiarySummary(day.date, entries.length),
          entries,
        };
      })
      .filter((day) => day.entries.length > 0 && this.isWithinRecentLocalDays(day.date, maxDays))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  private groupDiaryEventsByLocalDate(events: MainEventEntry[], maxDays: number): DiaryDay[] {
    const grouped = new Map<string, DiaryEntry[]>();
    this.normalizeDiaryEntries(events)
      .filter((entry) => this.isWithinRecentLocalDays(this.getLocalDateKey(new Date(entry.timestamp)), maxDays))
      .forEach((entry) => {
        const key = this.getLocalDateKey(new Date(entry.timestamp));
        grouped.set(key, [...(grouped.get(key) ?? []), entry]);
      });

    return Array.from(grouped.entries())
      .sort(([a], [b]) => b.localeCompare(a))
      .map(([date, entries]) => {
        const sortedEntries = entries.sort((a, b) => this.getTimestampMs(b.timestamp) - this.getTimestampMs(a.timestamp));
        return {
          date,
          dateText: this.formatDiaryDateText(date),
          summary: this.createDiarySummary(date, sortedEntries.length),
          entries: sortedEntries,
        };
      });
  }

  private normalizeDiaryEntries(events: MainEventEntry[]): DiaryEntry[] {
    return events
      .map((event, index) => this.normalizeDiaryEntry(event, index))
      .filter((entry): entry is DiaryEntry => Boolean(entry));
  }

  private normalizeDiaryEntry(event: MainEventEntry, index: number): DiaryEntry | null {
    const timestampMs = this.getTimestampMs(event.timestamp);
    if (!Number.isFinite(timestampMs)) {
      return null;
    }

    const kind = String(event.kind ?? "unknown");
    if (kind === "bath" || kind === "care") {
      return null;
    }

    const knownKinds = new Set(["feed", "play", "sleep", "music", "mood", "offline_decay", "inventory_food_use"]);
    const displayKind = knownKinds.has(kind) ? kind : "unknown";
    const timestamp = new Date(timestampMs).toISOString();
    return {
      id: event.id ?? `${displayKind}-${timestamp}-${index}`,
      kind: displayKind,
      title: displayKind === "unknown" ? event.title || "其他记录" : event.title || this.formatDiaryKindTitle(displayKind),
      detail: event.detail || "来自后端的成长记录。",
      timestamp,
      timeText: this.formatDiaryTimeText(new Date(timestampMs)),
    };
  }

  private formatDiaryKindTitle(kind: string): string {
    const titles: Record<string, string> = {
      feed: "喂食记录",
      play: "玩耍记录",
      sleep: "休息记录",
      music: "音乐记录",
      mood: "心情记录",
      offline_decay: "离线状态",
      inventory_food_use: "背包食物",
    };
    return titles[kind] ?? "其他记录";
  }

  private createDiarySummary(date: string, count: number): string {
    const petName = appState.getCurrentPet()?.name || "精灵";
    const prefix = this.formatDiaryDateText(date) === "今天" ? "今天" : "这一天";
    return `${prefix}照顾了${petName} ${count} 次`;
  }

  private formatDiaryDateText(date: string): string {
    const today = this.getLocalDateKey(new Date());
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = this.getLocalDateKey(yesterdayDate);
    if (date === today) {
      return "今天";
    }
    if (date === yesterday) {
      return "昨天";
    }
    return date;
  }

  private formatDiaryTimeText(date: Date): string {
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  private isWithinRecentLocalDays(date: string, maxDays: number): boolean {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - Math.max(0, maxDays - 1));
    const target = new Date(`${date}T00:00:00`);
    return target.getTime() >= start.getTime() && target.getTime() <= end.getTime();
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private getTimestampMs(timestamp: string): number {
    return new Date(timestamp).getTime();
  }
}

export const petService = new PetService();
