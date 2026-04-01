import { STORAGE_KEYS, storage } from "../core/storage";
import type {
  AuthUser,
  HomeworkHistoryPayload,
  HomeworkTodayStatus,
  PetStatus,
} from "../types/api";

class AppState {
  private currentUser: AuthUser | null = storage.getJson<AuthUser>(STORAGE_KEYS.user);
  private currentPet: PetStatus | null = null;
  private homeworkHistory: HomeworkHistoryPayload | null = null;
  private todayHomeworkStatus: HomeworkTodayStatus | null = null;

  getCurrentUser(): AuthUser | null {
    return this.currentUser;
  }

  setCurrentUser(user: AuthUser): void {
    this.currentUser = user;
    storage.setJson(STORAGE_KEYS.user, user);
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
    return user?.childId ?? user?.parentId ?? null;
  }

  getPetId(): string | null {
    return storage.get(STORAGE_KEYS.petId);
  }

  setPetId(petId: string): void {
    storage.set(STORAGE_KEYS.petId, petId);
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

  clearSession(): void {
    this.currentUser = null;
    this.currentPet = null;
    this.homeworkHistory = null;
    this.todayHomeworkStatus = null;
    storage.remove(STORAGE_KEYS.user);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.petId);
    storage.remove(STORAGE_KEYS.activeTab);
  }
}

export const appState = new AppState();
