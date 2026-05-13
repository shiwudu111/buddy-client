import { STORAGE_KEYS, storage } from "../core/storage";
import type {
  AuthUser,
  ChatConversationItem,
  DiaryDay,
  HomeworkHistoryPayload,
  HomeworkTodayStatus,
  MainEventEntry,
  PetFoodInventoryItem,
  PetGrowthFeedback,
  PetStatus,
} from "../types/api";

class AppState {
  private currentUser: AuthUser | null = storage.getJson<AuthUser>(STORAGE_KEYS.user);
  private currentPet: PetStatus | null = null;
  private homeworkHistory: HomeworkHistoryPayload | null = null;
  private todayHomeworkStatus: HomeworkTodayStatus | null = null;
  private recentPetGrowthFeedback: PetGrowthFeedback | null = null;
  private petFoodInventory: PetFoodInventoryItem[] = [];
  private mainEventLog: MainEventEntry[] = [];
  private diaryDays: DiaryDay[] = [];
  private chatHistory: ChatConversationItem[] = [];
  private suppressNextChatHistoryBootstrap = false;

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  setCurrentUser(user: AuthUser): void {
    this.currentUser = user;
    storage.setJson(STORAGE_KEYS.user, user);

    if (user.petId) {
      this.persistPetIdForCurrentUser(user.petId);
    } else {
      this.removeStoredPetIdForCurrentUser();
    }
  }

  patchCurrentUser(patch: Partial<AuthUser>): void {
    const user = this.getCurrentUser();
    if (!user) {
      return;
    }
    this.setCurrentUser({
      ...user,
      ...patch,
    });
  }

  getLinkedChildId(): string | null {
    const user = this.getCurrentUser();
    return user?.childId ?? null;
  }

  getPetId(): string | null {
    const userPetId = this.currentUser?.petId?.trim();
    if (userPetId) {
      this.persistPetIdForCurrentUser(userPetId);
      return userPetId;
    }

    const mappedPetId = this.getStoredPetIdForCurrentUser();
    if (mappedPetId) {
      return mappedPetId;
    }

    return this.migrateLegacyPetIdForCurrentUser();
  }

  setPetId(petId: string): void {
    storage.remove(STORAGE_KEYS.petId);
    const user = this.currentUser;
    if (user && user.petId !== petId) {
      this.currentUser = {
        ...user,
        petId,
      };
      storage.setJson(STORAGE_KEYS.user, this.currentUser);
    }
    this.persistPetIdForCurrentUser(petId);
  }

  clearPetState(): void {
    this.currentPet = null;
    this.recentPetGrowthFeedback = null;
    this.petFoodInventory = [];
    this.mainEventLog = [];
    this.diaryDays = [];
    storage.remove(STORAGE_KEYS.petId);
    if (this.currentUser?.petId) {
      this.currentUser = {
        ...this.currentUser,
        petId: null,
      };
      storage.setJson(STORAGE_KEYS.user, this.currentUser);
    }

    this.removeStoredPetIdForCurrentUser();
  }

  getCurrentPet(): PetStatus | null {
    return this.currentPet;
  }

  setCurrentPet(pet: PetStatus | null): void {
    this.currentPet = pet;
  }

  getHomeworkHistory(): HomeworkHistoryPayload | null {
    return this.homeworkHistory;
  }

  setHomeworkHistory(history: HomeworkHistoryPayload | null): void {
    this.homeworkHistory = history;
  }

  getTodayHomeworkStatus(): HomeworkTodayStatus | null {
    return this.todayHomeworkStatus;
  }

  setTodayHomeworkStatus(status: HomeworkTodayStatus | null): void {
    this.todayHomeworkStatus = status;
  }

  getRecentPetGrowthFeedback(): PetGrowthFeedback | null {
    return this.recentPetGrowthFeedback;
  }

  setRecentPetGrowthFeedback(feedback: PetGrowthFeedback | null): void {
    this.recentPetGrowthFeedback = feedback;
  }

  clearRecentPetGrowthFeedback(): void {
    this.recentPetGrowthFeedback = null;
  }

  getPetFoodInventory(): PetFoodInventoryItem[] {
    return [...this.petFoodInventory];
  }

  setPetFoodInventory(items: PetFoodInventoryItem[]): void {
    this.petFoodInventory = [...items];
  }

  getMainEvents(): MainEventEntry[] {
    return [...this.mainEventLog];
  }

  setMainEvents(items: MainEventEntry[]): void {
    this.mainEventLog = [...items];
  }

  appendMainEvent(entry: MainEventEntry): void {
    this.mainEventLog = [entry, ...this.mainEventLog].slice(0, 8);
  }

  clearMainEvents(): void {
    this.mainEventLog = [];
  }

  getDiaryDays(): DiaryDay[] {
    return this.diaryDays.map((day) => ({
      ...day,
      entries: [...day.entries],
    }));
  }

  setDiaryDays(items: DiaryDay[]): void {
    this.diaryDays = items.map((day) => ({
      ...day,
      entries: [...day.entries],
    }));
  }

  clearDiaryDays(): void {
    this.diaryDays = [];
  }

  getChatHistory(): ChatConversationItem[] {
    return [...this.chatHistory];
  }

  setChatHistory(history: ChatConversationItem[]): void {
    this.chatHistory = [...history];
  }

  appendChatHistory(entries: ChatConversationItem[]): void {
    this.chatHistory = [...this.chatHistory, ...entries];
  }

  clearChatHistory(): void {
    this.chatHistory = [];
  }

  suppressChatHistoryBootstrapOnce(): void {
    this.suppressNextChatHistoryBootstrap = true;
  }

  isChatHistoryBootstrapSuppressed(): boolean {
    return this.suppressNextChatHistoryBootstrap;
  }

  clearSession(): void {
    this.currentUser = null;
    this.currentPet = null;
    this.homeworkHistory = null;
    this.todayHomeworkStatus = null;
    this.recentPetGrowthFeedback = null;
    this.petFoodInventory = [];
    this.mainEventLog = [];
    this.diaryDays = [];
    this.chatHistory = [];
    this.suppressNextChatHistoryBootstrap = true;
    storage.remove(STORAGE_KEYS.user);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.petId);
    storage.remove(STORAGE_KEYS.activeTab);
  }

  private getStoredPetIdForCurrentUser(): string | null {
    const ownerKey = this.getCurrentUserKey();
    if (!ownerKey) {
      return null;
    }

    const petIdMap = storage.getJson<Record<string, string>>(STORAGE_KEYS.petIdMap) ?? {};
    return petIdMap[ownerKey] ?? null;
  }

  private getCurrentUserKey(): string | null {
    const user = this.currentUser;
    if (!user) {
      return null;
    }

    return user.id || user.username || null;
  }

  private persistPetIdForCurrentUser(petId: string): void {
    const ownerKey = this.getCurrentUserKey();
    if (!ownerKey) {
      return;
    }

    const petIdMap = storage.getJson<Record<string, string>>(STORAGE_KEYS.petIdMap) ?? {};
    petIdMap[ownerKey] = petId;
    storage.setJson(STORAGE_KEYS.petIdMap, petIdMap);
  }

  private removeStoredPetIdForCurrentUser(): void {
    const ownerKey = this.getCurrentUserKey();
    if (!ownerKey) {
      return;
    }

    const petIdMap = storage.getJson<Record<string, string>>(STORAGE_KEYS.petIdMap) ?? {};
    if (!(ownerKey in petIdMap)) {
      return;
    }

    delete petIdMap[ownerKey];
    storage.setJson(STORAGE_KEYS.petIdMap, petIdMap);
  }

  private migrateLegacyPetIdForCurrentUser(): string | null {
    const legacyPetId = storage.get(STORAGE_KEYS.petId);
    if (!legacyPetId) {
      return null;
    }

    if (!this.getCurrentUserKey()) {
      return legacyPetId;
    }

    this.persistPetIdForCurrentUser(legacyPetId);
    storage.remove(STORAGE_KEYS.petId);
    return legacyPetId;
  }
}

export const appState = new AppState();
