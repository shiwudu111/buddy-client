import { STORAGE_KEYS, storage } from "../core/storage";
import type { AuthUser } from "../types/api";

class AppState {
  getCurrentUser(): AuthUser | null {
    const raw = storage.get(STORAGE_KEYS.user);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      storage.remove(STORAGE_KEYS.user);
      return null;
    }
  }

  setCurrentUser(user: AuthUser): void {
    storage.set(STORAGE_KEYS.user, JSON.stringify(user));
  }

  clearSession(): void {
    storage.remove(STORAGE_KEYS.user);
    storage.remove(STORAGE_KEYS.token);
    storage.remove(STORAGE_KEYS.petId);
  }
}

export const appState = new AppState();
