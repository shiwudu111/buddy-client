import { sys } from "cc";
import {
  BUILD_API_BASE_URL,
  BUILD_HOT_UPDATE_MANIFEST_URL,
} from "./build-config.generated";

export const APP_NAME = "buddy-client";
export const APP_TITLE = "学伴精灵";

export const API_CONFIG = {
  baseUrl: "http://localhost:3000/api/v1",
  timeoutMs: 10000,
} as const;

export const API_BASE_OVERRIDE_KEY = "BUDDY_API_BASE_URL";
export const HOT_UPDATE_MANIFEST_OVERRIDE_KEY = "BUDDY_HOT_UPDATE_MANIFEST_URL";
export const DIAGNOSTICS_ENABLED_OVERRIDE_KEY = "BUDDY_DIAGNOSTICS_ENABLED";
export const BASE_APK_VERSION = "0.0.0";

export type HotUpdateEnv = "dev" | "staging" | "prod";

export const HOT_UPDATE_ENVS: Record<HotUpdateEnv, { packageUrl: string; manifestUrl: string }> = {
  dev: {
    packageUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/dev/",
    manifestUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/dev/project.manifest",
  },
  staging: {
    packageUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/staging/",
    manifestUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/staging/project.manifest",
  },
  prod: {
    packageUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/prod/",
    manifestUrl:
      "https://buddy-hotupdate-zhzhwd1290.oss-cn-shanghai.aliyuncs.com/buddy-hot-update/prod/project.manifest",
  },
};

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

function readStoredHotUpdateManifestUrl(): string | null {
  try {
    const browserValue =
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(HOT_UPDATE_MANIFEST_OVERRIDE_KEY);
    if (browserValue) {
      return browserValue;
    }
    return sys.localStorage.getItem(HOT_UPDATE_MANIFEST_OVERRIDE_KEY);
  } catch {
    return null;
  }
}

function readDiagnosticsEnabledOverride(): boolean | null {
  try {
    const runtimeGlobal = globalThis as typeof globalThis & {
      BUDDY_DIAGNOSTICS_ENABLED?: unknown;
    };
    if (typeof runtimeGlobal.BUDDY_DIAGNOSTICS_ENABLED === "boolean") {
      return runtimeGlobal.BUDDY_DIAGNOSTICS_ENABLED;
    }
    if (typeof runtimeGlobal.BUDDY_DIAGNOSTICS_ENABLED === "string") {
      const normalized = runtimeGlobal.BUDDY_DIAGNOSTICS_ENABLED.trim().toLowerCase();
      if (["1", "true", "yes", "on"].includes(normalized)) {
        return true;
      }
      if (["0", "false", "no", "off"].includes(normalized)) {
        return false;
      }
    }
    const browserValue =
      typeof localStorage === "undefined"
        ? null
        : localStorage.getItem(DIAGNOSTICS_ENABLED_OVERRIDE_KEY);
    const value = browserValue ?? sys.localStorage.getItem(DIAGNOSTICS_ENABLED_OVERRIDE_KEY);
    if (value === null) {
      return null;
    }
    const normalized = value.trim().toLowerCase();
    if (["1", "true", "yes", "on"].includes(normalized)) {
      return true;
    }
    if (["0", "false", "no", "off"].includes(normalized)) {
      return false;
    }
  } catch {
    return null;
  }
  return null;
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

function normalizeHotUpdateManifestUrl(input: string): string {
  return input.trim();
}

export function getHotUpdateManifestUrl(): string {
  const override = readStoredHotUpdateManifestUrl() ?? BUILD_HOT_UPDATE_MANIFEST_URL.trim();
  return override ? normalizeHotUpdateManifestUrl(override) : "";
}

export function isDiagnosticsEnabled(): boolean {
  const override = readDiagnosticsEnabledOverride();
  if (override !== null) {
    return override;
  }
  const manifestUrl = getHotUpdateManifestUrl();
  return !manifestUrl.includes("/buddy-hot-update/prod/");
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
