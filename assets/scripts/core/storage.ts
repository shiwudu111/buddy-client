import { sys } from "cc";

export const STORAGE_KEYS = {
  token: "buddy.auth.token",
  user: "buddy.auth.user",
  petId: "buddy.pet.id",
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
};
