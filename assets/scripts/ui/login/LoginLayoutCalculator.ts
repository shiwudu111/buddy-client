import type { Size } from "cc";
import type { LoginFlowMode } from "./LoginFlowCoordinator";
import { LOGIN_LAYOUT, LOGIN_RUNTIME_LAYOUT } from "./LoginViewConfig";

// 文件整体作用：
// 这是登录页布局换算器。
// 它把“屏幕大小 + 当前是登录还是注册模式”换算成每个区域和按钮的真实坐标与尺寸。
//
// 一句话版本：
// 这段代码的核心意思就是：根据屏幕大小和当前模式，算出登录页每个区域和按钮应该摆在哪、占多大。
//
// 美术需要关注的重点：
// 1. 这里不画任何东西，只负责算位置。
// 2. 如果按钮飞位、面板偏移、横竖屏错位，通常先看这里。
// 3. 这里算出来的 frame，后面会被 LoginViewOrchestrator 真正应用到节点上。
export type LoginViewportMetrics = {
  // 整个可见区域的宽高、上下左右边界，以及当前是否竖屏。
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
  // 这里列的是登录页里所有重要区域最终的尺寸和位置。
  metrics: LoginViewportMetrics;
  logoArea: LoginLayoutFrame;
  brandEntry: LoginLayoutFrame;
  accountEntry: LoginLayoutFrame;
  accountModalMask: LoginLayoutFrame;
  accountModalPanel: LoginLayoutFrame;
  defaultAccountOption: LoginLayoutFrame;
  otherAccountOption: LoginLayoutFrame;
  startButton: LoginLayoutFrame;
  roleSelect: LoginLayoutFrame;
  backButton: LoginLayoutFrame;
  childRoleButton: LoginLayoutFrame;
  parentRoleButton: LoginLayoutFrame;
  panel: LoginLayoutFrame;
  inputArea: LoginLayoutFrame;
  buttonRow: LoginLayoutFrame;
  statusArea: LoginLayoutFrame;
  usernameInput: LoginLayoutFrame;
  passwordInput: LoginLayoutFrame;
  confirmPasswordInput: LoginLayoutFrame;
  loginButton: LoginLayoutFrame;
  registerButton: LoginLayoutFrame;
  parentRegisterButton: LoginLayoutFrame;
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

export function resolveLoginLayout(
  metrics: LoginViewportMetrics,
  mode: LoginFlowMode = "login"
): LoginResolvedLayout {
  const preset = metrics.isPortrait ? LOGIN_LAYOUT.portrait : LOGIN_LAYOUT.landscape;
  const isRegisterMode = mode === "register";
  const inputAreaHeight = isRegisterMode
    ? LOGIN_RUNTIME_LAYOUT.inputArea.registerHeight
    : LOGIN_RUNTIME_LAYOUT.inputArea.loginHeight;
  const inputAreaOffsetY = isRegisterMode
    ? LOGIN_RUNTIME_LAYOUT.inputArea.registerOffsetY
    : LOGIN_RUNTIME_LAYOUT.inputArea.loginOffsetY;
  const panelHeight = preset.panel.height + (isRegisterMode ? 74 : 0);

  return {
    metrics,
    logoArea: {
      width: preset.logoArea.width,
      height: preset.logoArea.height,
      x:
        ("x" in preset.logoArea ? preset.logoArea.x : 0) +
        metrics.width * ("xFactor" in preset.logoArea ? preset.logoArea.xFactor : 0),
      y: metrics.height * preset.logoArea.yFactor,
    },
    brandEntry: {
      width: LOGIN_RUNTIME_LAYOUT.brandEntry.width,
      height: LOGIN_RUNTIME_LAYOUT.brandEntry.height,
      x: 0,
      y: metrics.isPortrait
        ? LOGIN_RUNTIME_LAYOUT.brandEntry.portraitY
        : LOGIN_RUNTIME_LAYOUT.brandEntry.landscapeY,
    },
    accountEntry: {
      width: LOGIN_RUNTIME_LAYOUT.accountEntry.width,
      height: LOGIN_RUNTIME_LAYOUT.accountEntry.height,
      x: 0,
      y: metrics.isPortrait
        ? LOGIN_RUNTIME_LAYOUT.accountEntry.portraitY
        : LOGIN_RUNTIME_LAYOUT.accountEntry.landscapeY,
    },
    accountModalMask: {
      width: metrics.width,
      height: metrics.height,
      x: 0,
      y: 0,
    },
    accountModalPanel: {
      width: LOGIN_RUNTIME_LAYOUT.accountModal.width,
      height: LOGIN_RUNTIME_LAYOUT.accountModal.height,
      x: 0,
      y: 0,
    },
    defaultAccountOption: {
      width: LOGIN_RUNTIME_LAYOUT.accountOption.width,
      height: LOGIN_RUNTIME_LAYOUT.accountOption.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.accountOption.defaultY,
    },
    otherAccountOption: {
      width: LOGIN_RUNTIME_LAYOUT.accountOption.width,
      height: LOGIN_RUNTIME_LAYOUT.accountOption.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.accountOption.otherY,
    },
    startButton: {
      width: LOGIN_RUNTIME_LAYOUT.flowButtons.width,
      height: LOGIN_RUNTIME_LAYOUT.flowButtons.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.flowButtons.brandEntryY,
    },
    roleSelect: {
      width: LOGIN_RUNTIME_LAYOUT.roleSelect.width,
      height: LOGIN_RUNTIME_LAYOUT.roleSelect.height,
      x: 0,
      y: metrics.isPortrait
        ? LOGIN_RUNTIME_LAYOUT.roleSelect.portraitY
        : LOGIN_RUNTIME_LAYOUT.roleSelect.landscapeY,
    },
    backButton: {
      width: LOGIN_RUNTIME_LAYOUT.backButton.width,
      height: LOGIN_RUNTIME_LAYOUT.backButton.height,
      x: metrics.isPortrait
        ? LOGIN_RUNTIME_LAYOUT.backButton.portraitX
        : LOGIN_RUNTIME_LAYOUT.backButton.landscapeX,
      y: metrics.isPortrait
        ? LOGIN_RUNTIME_LAYOUT.backButton.portraitY
        : LOGIN_RUNTIME_LAYOUT.backButton.landscapeY,
    },
    childRoleButton: {
      width: LOGIN_RUNTIME_LAYOUT.flowButtons.width,
      height: LOGIN_RUNTIME_LAYOUT.flowButtons.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.flowButtons.childY,
    },
    parentRoleButton: {
      width: LOGIN_RUNTIME_LAYOUT.flowButtons.width,
      height: LOGIN_RUNTIME_LAYOUT.flowButtons.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.flowButtons.parentY,
    },
    panel: {
      width: preset.panel.width,
      height: panelHeight,
      x: metrics.centerX + metrics.width * (preset.panel.xFactor ?? 0),
      y: metrics.centerY + metrics.height * preset.panel.yFactor,
    },
    inputArea: {
      width: LOGIN_RUNTIME_LAYOUT.inputArea.width,
      height: inputAreaHeight,
      x: 0,
      y: inputAreaOffsetY,
    },
    buttonRow: {
      width: LOGIN_RUNTIME_LAYOUT.buttonRow.width,
      height: LOGIN_RUNTIME_LAYOUT.buttonRow.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.buttonRow.offsetY,
    },
    statusArea: {
      width: Math.min(
        LOGIN_RUNTIME_LAYOUT.statusArea.width,
        preset.panel.width - 36
      ),
      height: LOGIN_RUNTIME_LAYOUT.statusArea.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.statusArea.formOffsetY,
    },
    usernameInput: {
      width: LOGIN_RUNTIME_LAYOUT.inputs.width,
      height: LOGIN_RUNTIME_LAYOUT.inputs.height,
      x: 0,
      y: isRegisterMode
        ? LOGIN_RUNTIME_LAYOUT.inputs.registerUsernameY
        : LOGIN_RUNTIME_LAYOUT.inputs.loginUsernameY,
    },
    passwordInput: {
      width: LOGIN_RUNTIME_LAYOUT.inputs.width,
      height: LOGIN_RUNTIME_LAYOUT.inputs.height,
      x: 0,
      y: isRegisterMode
        ? LOGIN_RUNTIME_LAYOUT.inputs.registerPasswordY
        : LOGIN_RUNTIME_LAYOUT.inputs.loginPasswordY,
    },
    confirmPasswordInput: {
      width: LOGIN_RUNTIME_LAYOUT.inputs.width,
      height: LOGIN_RUNTIME_LAYOUT.inputs.height,
      x: 0,
      y: LOGIN_RUNTIME_LAYOUT.inputs.registerConfirmY,
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
    parentRegisterButton: {
      width: LOGIN_RUNTIME_LAYOUT.buttons.width,
      height: LOGIN_RUNTIME_LAYOUT.buttons.height,
      x: LOGIN_RUNTIME_LAYOUT.buttonRow.parentRegisterX,
      y: 0,
    },
    statusText: {
      width: Math.min(
        LOGIN_RUNTIME_LAYOUT.statusText.width,
        preset.panel.width - 68
      ),
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
