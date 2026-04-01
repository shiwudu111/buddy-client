export const APP_NAME = "buddy-client";
export const APP_TITLE = "学伴精灵";

export const API_CONFIG = {
  baseUrl: "http://localhost:3000/api/v1",
  timeoutMs: 10000,
} as const;

export const SCENE_NAMES = {
  login: "Login",
  main: "Main",
} as const;

export const UI_CONFIG = {
  designWidth: 1280,
  designHeight: 720,
  defaultPetName: "Buddy",
} as const;
