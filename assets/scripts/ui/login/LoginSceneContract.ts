// 文件整体作用：
// 这是 Login.scene 的“场景契约表”。
// 它把关键节点名、父子层级要求、报错文案集中写在一起，避免散落到多个文件。
//
// 一句话版本：
// 这段代码的核心意思就是：把登录页里哪些节点叫什名字、应该挂在哪一层，统一写成一张规则表。
//
// 美术需要关注的重点：
// 1. 这里列出来的节点名，都是登录页结构里不能随便改名的关键节点。
// 2. 如果改了 Login.scene 的层级结构，这里和相关解析文件通常也要一起同步。
// 3. 一旦节点名对不上，登录页很多按钮和输入框就会直接找不到。

export const LOGIN_SCENE_NODE = {
  // 这里的 key 是程序内部叫法，value 是场景里真实节点名。
  canvas: "Canvas",
  loginPage: "LoginPage",
  backgroundLayer: "BackgroundLayer",
  contentLayer: "ContentLayer",
  logoArea: "LogoArea",
  brandEntryLayer: "BrandEntryLayer",
  startButton: "StartButton",
  accountEntryButton: "AccountEntryButton",
  accountModalMask: "AccountModalMask",
  accountModalPanel: "AccountModalPanel",
  defaultAccountOptionButton: "DefaultAccountOptionButton",
  otherAccountOptionButton: "OtherAccountOptionButton",
  backButton: "FlowBackButton",
  roleSelectLayer: "RoleSelectLayer",
  childRoleButton: "ChildRoleButton",
  parentRoleButton: "ParentRoleButton",
  authFormLayer: "AuthFormLayer",
  loginPanel: "LoginPanel",
  inputArea: "InputArea",
  buttonRow: "ButtonRow",
  statusArea: "StatusArea",
  usernameInput: "UsernameInput",
  passwordInput: "PasswordInput",
  confirmPasswordInput: "ConfirmPasswordInput",
  loginButton: "LoginButton",
  registerButton: "RegisterButton",
  parentRegisterButton: "ParentRegisterButton",
  statusLabel: "StatusLabel",
  loadingNode: "LoadingNode",
} as const;

// 这里只记录“当前阶段最容易漏挂、最需要明确父子关系”的节点。
// 后续如果更多节点转成“场景即真相”，可以继续往这里补。
export const LOGIN_SCENE_PARENT_HINT: Record<string, string> = {
  [LOGIN_SCENE_NODE.loginPage]: LOGIN_SCENE_NODE.canvas,
  [LOGIN_SCENE_NODE.backgroundLayer]: LOGIN_SCENE_NODE.loginPage,
  [LOGIN_SCENE_NODE.contentLayer]: LOGIN_SCENE_NODE.loginPage,
  [LOGIN_SCENE_NODE.logoArea]: LOGIN_SCENE_NODE.contentLayer,
  [LOGIN_SCENE_NODE.brandEntryLayer]: LOGIN_SCENE_NODE.contentLayer,
  [LOGIN_SCENE_NODE.startButton]: LOGIN_SCENE_NODE.brandEntryLayer,
  [LOGIN_SCENE_NODE.accountEntryButton]: LOGIN_SCENE_NODE.brandEntryLayer,
  [LOGIN_SCENE_NODE.accountModalMask]: LOGIN_SCENE_NODE.contentLayer,
  [LOGIN_SCENE_NODE.accountModalPanel]: LOGIN_SCENE_NODE.accountModalMask,
  [LOGIN_SCENE_NODE.defaultAccountOptionButton]: LOGIN_SCENE_NODE.accountModalPanel,
  [LOGIN_SCENE_NODE.otherAccountOptionButton]: LOGIN_SCENE_NODE.accountModalPanel,
  [LOGIN_SCENE_NODE.backButton]: LOGIN_SCENE_NODE.contentLayer,
  [LOGIN_SCENE_NODE.roleSelectLayer]: LOGIN_SCENE_NODE.contentLayer,
  [LOGIN_SCENE_NODE.childRoleButton]: LOGIN_SCENE_NODE.roleSelectLayer,
  [LOGIN_SCENE_NODE.parentRoleButton]: LOGIN_SCENE_NODE.roleSelectLayer,
  [LOGIN_SCENE_NODE.authFormLayer]: LOGIN_SCENE_NODE.contentLayer,
  [LOGIN_SCENE_NODE.loginPanel]: LOGIN_SCENE_NODE.authFormLayer,
  [LOGIN_SCENE_NODE.inputArea]: LOGIN_SCENE_NODE.loginPanel,
  [LOGIN_SCENE_NODE.buttonRow]: LOGIN_SCENE_NODE.loginPanel,
  [LOGIN_SCENE_NODE.statusArea]: LOGIN_SCENE_NODE.authFormLayer,
  [LOGIN_SCENE_NODE.statusLabel]: LOGIN_SCENE_NODE.statusArea,
  [LOGIN_SCENE_NODE.loadingNode]: LOGIN_SCENE_NODE.statusArea,
};

export function formatMissingLoginNodeError(scope: string, nodeName: string): string {
  // 当关键节点缺失时，用统一格式生成报错文案，方便快速定位场景问题。
  const parentHint = LOGIN_SCENE_PARENT_HINT[nodeName];
  if (parentHint) {
    return `[${scope}] Missing required node: ${nodeName}. Expected parent: ${parentHint}`;
  }

  return `[${scope}] Missing required node: ${nodeName}`;
}

export function formatMissingLoginChildNodeError(
  scope: string,
  nodeName: string,
  parentName: string
): string {
  return `[${scope}] Missing required child node: ${nodeName}. Expected parent: ${parentName}`;
}

export function formatMissingLoginComponentError(
  scope: string,
  nodeName: string,
  componentName: string
): string {
  return `[${scope}] Missing required component ${componentName} on node: ${nodeName}`;
}
