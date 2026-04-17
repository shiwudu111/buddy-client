import { Button, Color, EditBox, Label, Node } from "cc";
import type { LoginStatusState } from "./LoginAuthCoordinator";
import { findNodeInTree } from "./LoginSceneStructure";

// 文件整体作用：
// 这是登录页“提示文案 + loading 锁定”的小工具。
// 它负责把状态文字写到界面上，并在提交中禁用按钮和输入框。
//
// 一句话版本：
// 这段代码的核心意思就是：把登录页底部提示文字和“正在处理”的锁定状态统一更新到界面上。
//
// 美术需要关注的重点：
// 1. StatusText 是登录页结果提示的主要显示位。
// 2. loading 打开时，按钮和输入框会被临时锁住，防止重复点击。
export type LoginInteractiveNodes = {
  loadingNode: Node | null;
  startButton?: Button | null;
  backButton?: Button | null;
  accountEntryButton?: Button | null;
  accountModalMaskButton?: Button | null;
  defaultAccountOptionButton?: Button | null;
  otherAccountOptionButton?: Button | null;
  childRoleButton?: Button | null;
  parentRoleButton?: Button | null;
  usernameInput: EditBox | null;
  passwordInput: EditBox | null;
  confirmPasswordInput?: EditBox | null;
  loginButton: Button | null;
  registerButton: Button | null;
  parentRegisterButton: Button | null;
};

export function renderLoginStatus(
  statusNode: Node | null,
  status: LoginStatusState,
  color: Color
): void {
  // 把状态文案真正写进页面节点。
  if (!statusNode) {
    return;
  }

  const statusText = findNodeInTree(statusNode, "StatusText");
  const statusTextLabel = statusText?.getComponent(Label) ?? null;
  if (statusTextLabel) {
    statusTextLabel.string = status.message;
    statusTextLabel.color = color;
    return;
  }

  const label = statusNode.getComponent(Label);
  if (label) {
    label.string = status.message;
    label.color = color;
    return;
  }

  const childLabel = statusNode.getComponentInChildren(Label);
  if (childLabel) {
    childLabel.string = status.message;
    childLabel.color = color;
  }
}

export function applyLoginLoadingState(nodes: LoginInteractiveNodes, loading: boolean): void {
  // 当登录/注册正在提交时，统一锁住可点击区域和输入框。
  if (nodes.loadingNode) {
    nodes.loadingNode.active = loading;
  }

  if (nodes.startButton) {
    nodes.startButton.interactable = !loading;
  }

  if (nodes.backButton) {
    nodes.backButton.interactable = !loading;
  }

  if (nodes.accountEntryButton) {
    nodes.accountEntryButton.interactable = !loading;
  }

  if (nodes.accountModalMaskButton) {
    nodes.accountModalMaskButton.interactable = !loading;
  }

  if (nodes.defaultAccountOptionButton) {
    nodes.defaultAccountOptionButton.interactable = !loading;
  }

  if (nodes.otherAccountOptionButton) {
    nodes.otherAccountOptionButton.interactable = !loading;
  }

  if (nodes.childRoleButton) {
    nodes.childRoleButton.interactable = !loading;
  }

  if (nodes.parentRoleButton) {
    nodes.parentRoleButton.interactable = !loading;
  }

  if (nodes.loginButton) {
    nodes.loginButton.interactable = !loading;
  }

  if (nodes.registerButton) {
    nodes.registerButton.interactable = !loading;
  }

  if (nodes.parentRegisterButton) {
    nodes.parentRegisterButton.interactable = !loading;
  }

  if (nodes.usernameInput) {
    nodes.usernameInput.enabled = !loading;
  }

  if (nodes.passwordInput) {
    nodes.passwordInput.enabled = !loading;
  }

  if (nodes.confirmPasswordInput) {
    nodes.confirmPasswordInput.enabled = !loading;
  }
}
