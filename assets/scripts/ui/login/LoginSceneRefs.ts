import { Button, Component, EditBox, Node } from "cc";
import {
  formatMissingLoginChildNodeError,
  formatMissingLoginComponentError,
  formatMissingLoginNodeError,
  LOGIN_SCENE_NODE,
} from "./LoginSceneContract";
import { ensureLoginLayoutHierarchy, findLoginCanvas, findLoginNode } from "./LoginSceneStructure";

// 文件整体作用：
// 这是 LoginController 的“节点引用装配器”。
// 它会一次性把登录页真正要用到的按钮、输入框、状态节点全部找出来并校验。
//
// 一句话版本：
// 这段代码的核心意思就是：把登录页真正要用的节点和组件一次性找齐，缺了就立刻报错。
//
// 美术需要关注的重点：
// 1. 这里要求必须存在的节点，通常都不能随便删、随便改名。
// 2. 如果登录页一打开就报“Missing required node”，一般就是场景结构和这里对不上。
// 3. 账号选择弹层现在也被当作正式场景节点来要求，不再允许运行时偷偷补一套。

// LoginController 最终要拿到的完整引用集合。
// 这里的字段名基本和控制器内部语义保持一致，方便直接使用。
export type LoginSceneRefs = {
  // 这些字段就是 LoginController 最终真正握在手里的界面引用。
  usernameInput: EditBox;
  passwordInput: EditBox;
  confirmPasswordInput: EditBox;
  statusLabel: Node;
  loadingNode: Node;
  startButton: Button;
  backButton: Button;
  accountEntryButton: Button;
  accountModalMaskButton: Button;
  accountModalPanel: Node;
  defaultAccountOptionButton: Button;
  otherAccountOptionButton: Button;
  childRoleButton: Button;
  parentRoleButton: Button;
  loginButton: Button;
  registerButton: Button;
  parentRegisterButton: Button;
};

// 允许外部把“已经有的基础引用”传进来。
// 典型场景是 LoginController 通过 @property 先挂了几个核心节点，
// 这样这里就不用再重复查一遍。
//
// 注意这里故意只放基础表单相关字段：
// - 输入框
// - 状态节点
// 账号条、弹层、流程按钮等仍统一走本文件的解析/兜底逻辑。
type OptionalSceneRefs = {
  // 允许控制器先通过 @property 挂几个基础节点，减少重复查找。
  usernameInput?: EditBox | null;
  passwordInput?: EditBox | null;
  confirmPasswordInput?: EditBox | null;
  statusLabel?: Node | null;
  loadingNode?: Node | null;
};

// 整个文件最重要的入口函数。
//
// 它做的事情是：
// 1. 优先复用 existing 里已经拿到的基础引用
// 2. 再强制要求场景中必须存在的关键节点/组件
// 3. 账号条和账号弹层也必须来自场景本身
//
// 为什么要这样分？
// - UsernameInput / LoginButton 这种缺了页面就不能用，必须 require
// - 账号条和账号弹层现在也按“场景即真相”处理，不再 runtime 补节点
export function resolveLoginSceneRefs(root: Node, existing: OptionalSceneRefs = {}): LoginSceneRefs {
  // 收集并校验整套登录页关键节点。
  const usernameInput =
    existing.usernameInput ?? requireComponent(root, LOGIN_SCENE_NODE.usernameInput, EditBox);
  const passwordInput =
    existing.passwordInput ?? requireComponent(root, LOGIN_SCENE_NODE.passwordInput, EditBox);
  const confirmPasswordInput =
    existing.confirmPasswordInput ??
    requireComponent(root, LOGIN_SCENE_NODE.confirmPasswordInput, EditBox);
  const statusLabel = existing.statusLabel ?? requireNode(root, LOGIN_SCENE_NODE.statusLabel);
  const loadingNode = existing.loadingNode ?? requireNode(root, LOGIN_SCENE_NODE.loadingNode);
  const accountNodes = requireAccountSelectorNodes(root);
  const startButton = requireComponent(root, LOGIN_SCENE_NODE.startButton, Button);
  const backButton = requireComponent(root, LOGIN_SCENE_NODE.backButton, Button);
  const childRoleButton = requireComponent(root, LOGIN_SCENE_NODE.childRoleButton, Button);
  const parentRoleButton = requireComponent(root, LOGIN_SCENE_NODE.parentRoleButton, Button);
  const loginButton = requireComponent(root, LOGIN_SCENE_NODE.loginButton, Button);
  const registerButton = requireComponent(root, LOGIN_SCENE_NODE.registerButton, Button);
  const parentRegisterButton = requireComponent(
    root,
    LOGIN_SCENE_NODE.parentRegisterButton,
    Button
  );

  return {
    usernameInput,
    passwordInput,
    confirmPasswordInput,
    statusLabel,
    loadingNode,
    startButton,
    backButton,
    accountEntryButton: accountNodes.accountEntryButton,
    accountModalMaskButton: accountNodes.accountModalMaskButton,
    accountModalPanel: accountNodes.accountModalPanel,
    defaultAccountOptionButton: accountNodes.defaultAccountOptionButton,
    otherAccountOptionButton: accountNodes.otherAccountOptionButton,
    childRoleButton,
    parentRoleButton,
    loginButton,
    registerButton,
    parentRegisterButton,
  };
}

// 强制要求某个“节点”存在。
// 如果节点找不到，直接抛错，尽快暴露场景结构问题。
//
// 这里故意不做静默补建，因为像输入框、状态节点这种关键对象，
// 场景里缺失往往意味着更大的结构问题。
function requireNode(root: Node, name: string): Node {
  // 强制要求某个节点存在。缺了就直接抛错，不做静默兜底。
  const node = findLoginNode(root, name);
  if (!node) {
    throw new Error(formatMissingLoginNodeError("LoginSceneRefs", name));
  }

  return node;
}

// 在 requireNode 的基础上，再要求这个节点上挂了指定组件。
//
// 举例：
// - 节点叫 UsernameInput 不够，它必须真的挂着 EditBox
// - 节点叫 LoginButton 不够，它必须真的挂着 Button
function requireComponent<T extends Component>(
  root: Node,
  nodeName: string,
  componentType: new (...args: never[]) => T
): T {
  // 在找到节点后，再继续要求它必须挂了指定组件。
  const node = requireNode(root, nodeName);
  const component = node.getComponent(componentType);
  if (!component) {
    throw new Error(
      formatMissingLoginComponentError(
        "LoginSceneRefs",
        nodeName,
        componentType.name || "UnknownComponent"
      )
    );
  }

  return component;
}

// 要求 parent 下必须已经存在一个指定名字的直接子节点。
// 用于那些已经明确是场景真相的层级关系。
function requireNamedChild(parent: Node, name: string): Node {
  // 强制要求父节点下必须存在某个直接子节点。
  const child = parent.getChildByName(name);
  if (!child) {
    throw new Error(
      formatMissingLoginChildNodeError("LoginSceneRefs", name, parent.name)
    );
  }

  return child;
}

// 账号条和账号选择弹层现在统一按“场景即真相”处理。
//
// 也就是说：
// - 这些节点必须已经真实存在于 Login.scene
// - 如果场景里没有，不再 runtime 补建
// - 缺失时直接抛错，让场景问题尽早暴露
//
// 这样做的代价是：
// - 如果场景还没补齐，当前页面会直接报缺失
//
// 但好处是：
// - 不会再出现“编辑器里一套，运行时又偷偷补一套”的双套结构
function requireAccountSelectorNodes(root: Node): {
  accountEntryButton: Button;
  accountModalMaskButton: Button;
  accountModalPanel: Node;
  defaultAccountOptionButton: Button;
  otherAccountOptionButton: Button;
} {
  // 账号选择器现在也视为“场景真相”，所以这里直接强校验，不再补临时节点。
  const canvas = findLoginCanvas(root);
  if (!canvas) {
    throw new Error("[LoginSceneRefs] Missing Canvas for account selector");
  }

  // 这里只借用 layout hierarchy 做父层级校验，
  // 真正的账号节点本身必须已由场景提供。
  const refs = ensureLoginLayoutHierarchy(canvas);
  const accountEntryNode = requireNamedChild(
    refs.brandEntryLayer,
    LOGIN_SCENE_NODE.accountEntryButton
  );
  const accountModalMaskNode = requireNamedChild(
    refs.contentLayer,
    LOGIN_SCENE_NODE.accountModalMask
  );
  const accountModalPanel = requireNamedChild(
    accountModalMaskNode,
    LOGIN_SCENE_NODE.accountModalPanel
  );
  const defaultAccountOptionNode = requireNamedChild(
    accountModalPanel,
    LOGIN_SCENE_NODE.defaultAccountOptionButton
  );
  const otherAccountOptionNode = requireNamedChild(
    accountModalPanel,
    LOGIN_SCENE_NODE.otherAccountOptionButton
  );

  return {
    accountEntryButton: requireComponentFromNode(
      accountEntryNode,
      LOGIN_SCENE_NODE.accountEntryButton,
      Button
    ),
    accountModalMaskButton: requireComponentFromNode(
      accountModalMaskNode,
      LOGIN_SCENE_NODE.accountModalMask,
      Button
    ),
    accountModalPanel,
    defaultAccountOptionButton: requireComponentFromNode(
      defaultAccountOptionNode,
      LOGIN_SCENE_NODE.defaultAccountOptionButton,
      Button
    ),
    otherAccountOptionButton: requireComponentFromNode(
      otherAccountOptionNode,
      LOGIN_SCENE_NODE.otherAccountOptionButton,
      Button
    ),
  };
}

// 在一个已经找到的节点上继续强制要求某个组件存在。
// 和 requireComponent() 的区别只是：
// - requireComponent() 先根据名字找节点
// - requireComponentFromNode() 直接对传进来的节点做校验
function requireComponentFromNode<T extends Component>(
  node: Node,
  nodeName: string,
  componentType: new (...args: never[]) => T
): T {
  // 已经拿到节点对象后，继续检查它身上的目标组件是否存在。
  const component = node.getComponent(componentType);
  if (!component) {
    throw new Error(
      formatMissingLoginComponentError(
        "LoginSceneRefs",
        nodeName,
        componentType.name || "UnknownComponent"
      )
    );
  }

  return component;
}
