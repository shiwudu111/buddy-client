import { sys } from "cc";

export const STORAGE_KEYS = {
  token: "buddy.auth.token",
  user: "buddy.auth.user",
  petId: "buddy.pet.id",
  petIdMap: "buddy.pet.id.map",
  activeTab: "buddy.main.activeTab",
} as const;

export const storage = {
  get(key: string): string | null {
    return sys.localStorage.getItem(key);
  },

  set(key: string, value: string): void {
    sys.localStorage.setItem(key, value);
  },

  remove(key: string): void {
    sys.localStorage.removeItem(key);
  },

  getJson<T>(key: string): T | null {
    const raw = this.get(key);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      this.remove(key);
      return null;
    }
  },

  setJson(key: string, value: unknown): void {
    this.set(key, JSON.stringify(value));
  },
};
