import type { Size } from "cc";
import { LOGIN_LAYOUT, LOGIN_RUNTIME_LAYOUT } from "./LoginViewConfig";

export type LoginViewportMetrics = {
  width: number;
  height: number;
  left: number;
  right: number;
  bottom: number;
  top: number;
  centerX: number;
  centerY: number;
  isPortrait: boolean;
};

export type LoginLayoutFrame = {
  width: number;
  height: number;
  x: number;
  y: number;
};

export type LoginResolvedLayout = {
  metrics: LoginViewportMetrics;
  logoArea: LoginLayoutFrame;
  panel: LoginLayoutFrame;
  inputArea: LoginLayoutFrame;
  buttonRow: LoginLayoutFrame;
  statusArea: LoginLayoutFrame;
  usernameInput: LoginLayoutFrame;
  passwordInput: LoginLayoutFrame;
  loginButton: LoginLayoutFrame;
  registerButton: LoginLayoutFrame;
  statusText: LoginLayoutFrame;
  loadingText: LoginLayoutFrame;
  logoImage: {
    maxWidthFactor: number;
    maxHeightFactor: number;
    y: number;
  };
};

export function resolveLoginViewportMetrics(
  visibleSize: Size,
  fallbackWidth?: number,
  fallbackHeight?: number
): LoginViewportMetrics {
  const width = visibleSize.width || fallbackWidth || 1280;
  const height = visibleSize.height || fallbackHeight || 720;

  return {
    width,
    height,
    left: -width * 0.5,
    right: width * 0.5,
    bottom: -height * 0.5,
    top: height * 0.5,
    centerX: 0,
    centerY: 0,
    isPortrait: height > width,
  };
}

export function resolveLoginLayout(metrics: LoginViewportMetrics): LoginResolvedLayout {
  const preset = metrics.isPortrait ? LOGIN_LAYOUT.portrait : LOGIN_LAYOUT.landscape;
  const statusY =
    -metrics.height * 0.5 +
    (metrics.isPortrait
      ? LOGIN_RUNTIME_LAYOUT.statusArea.portraitBottomOffset
      : LOGIN_RUNTIME_LAYOUT.statusArea.landscapeBottomOffset);

  return {
    metrics,
    logoArea: {
      width: preset.logoArea.width,
      height: preset.logoArea.height,
      x: (preset.logoArea.x ?? 0) + metrics.width * (preset.logoArea.xFactor ?? 0),
      y: metrics.height * preset.logoArea.yFactor,
    },
    panel: {
      width: preset.panel.width,
      height: preset.panel.height,
      x: metrics.centerX + metrics.width * (preset.panel.xFactor ?? 0),
      y: metrics.centerY + metrics.height * preset.panel.yFactor,
    },
    inputArea: {
      width: LOGIN_RUNTIME_LAYOUT.inputArea.width,
      height: LOGIN_RUNTIME_LAYOUT.inputArea.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.inputArea.offsetY,
    },
    buttonRow: {
      width: LOGIN_RUNTIME_LAYOUT.buttonRow.width,
      height: LOGIN_RUNTIME_LAYOUT.buttonRow.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.buttonRow.offsetY,
    },
    statusArea: {
      width: metrics.width * LOGIN_RUNTIME_LAYOUT.statusArea.widthFactor,
      height: LOGIN_RUNTIME_LAYOUT.statusArea.height,
      x: 0,
      y: statusY,
    },
    usernameInput: {
      width: LOGIN_RUNTIME_LAYOUT.inputs.width,
      height: LOGIN_RUNTIME_LAYOUT.inputs.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.inputs.usernameY,
    },
    passwordInput: {
      width: LOGIN_RUNTIME_LAYOUT.inputs.width,
      height: LOGIN_RUNTIME_LAYOUT.inputs.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.inputs.passwordY,
    },
    loginButton: {
      width: LOGIN_RUNTIME_LAYOUT.buttons.width,
      height: LOGIN_RUNTIME_LAYOUT.buttons.height,
      x: LOGIN_RUNTIME_LAYOUT.buttonRow.loginX,
      y: 0,
    },
    registerButton: {
      width: LOGIN_RUNTIME_LAYOUT.buttons.width,
      height: LOGIN_RUNTIME_LAYOUT.buttons.height,
      x: LOGIN_RUNTIME_LAYOUT.buttonRow.registerX,
      y: 0,
    },
    statusText: {
      width: metrics.width * LOGIN_RUNTIME_LAYOUT.statusText.widthFactor,
      height: LOGIN_RUNTIME_LAYOUT.statusText.height,
      x: 0,
      y: 0,
    },
    loadingText: {
      width: LOGIN_RUNTIME_LAYOUT.loadingText.width,
      height: LOGIN_RUNTIME_LAYOUT.loadingText.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.loadingText.offsetY,
    },
    logoImage: {
      maxWidthFactor: preset.logoImage.maxWidthFactor,
      maxHeightFactor: preset.logoImage.maxHeightFactor,
      y: preset.logoImage.y,
    },
  };
}
