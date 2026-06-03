import { sys } from "cc";
import { BUILD_API_BASE_URL } from "./build-config.generated";

export const APP_NAME = "buddy-client";
export const APP_TITLE = "学伴精灵";

export const API_CONFIG = {
  baseUrl: "http://localhost:3000/api/v1",
  timeoutMs: 10000,
} as const;

export const API_BASE_OVERRIDE_KEY = "BUDDY_API_BASE_URL";

function readGlobalApiBaseUrl(): string | null {
  const runtimeGlobal = globalThis as typeof globalThis & {
    BUDDY_API_BASE_URL?: unknown;
  };

  return typeof runtimeGlobal.BUDDY_API_BASE_URL === "string"
    ? runtimeGlobal.BUDDY_API_BASE_URL
    : null;
}

function readStoredApiBaseUrl(): string | null {
  try {
    const browserValue =
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(API_BASE_OVERRIDE_KEY);
    if (browserValue) {
      return browserValue;
    }
    return sys.localStorage.getItem(API_BASE_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

function readBuildApiBaseUrl(): string | null {
  return BUILD_API_BASE_URL.trim() || null;
}

function normalizeApiBaseUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return API_CONFIG.baseUrl;
  }

  try {
    const url = new URL(trimmed);
    if (url.pathname === "" || url.pathname === "/") {
      url.pathname = "/api/v1";
      return url.toString().replace(/\/+$/, "");
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function getApiBaseUrl(): string {
  const override = readGlobalApiBaseUrl() ?? readStoredApiBaseUrl() ?? readBuildApiBaseUrl();
  return override ? normalizeApiBaseUrl(override) : API_CONFIG.baseUrl;
}

export const SCENE_NAMES = {
  login: "Login",
  main: "Main",
} as const;

export const UI_CONFIG = {
  designWidth: 1280,
  designHeight: 720,
  defaultPetName: "Buddy",
} as const;
