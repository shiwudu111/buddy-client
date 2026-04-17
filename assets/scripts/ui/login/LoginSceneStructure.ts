import { find, Node, Vec3 } from "cc";
import {
  formatMissingLoginChildNodeError,
  LOGIN_SCENE_NODE,
} from "./LoginSceneContract";

// 文件整体作用：
// 这是登录页的“层级结构工具箱”。
// 它负责在整棵场景树里找节点、校验父子关系、以及把关键层级整理成一套引用返回出去。
//
// 一句话版本：
// 这段代码的核心意思就是：检查登录页的大层级有没有搭对，并把这些关键层级节点整理出来给别的代码使用。
//
// 美术需要关注的重点：
// 1. LoginPage / BackgroundLayer / ContentLayer 这几个层级是登录页的大骨架，别轻易改。
// 2. 这里的 ensure* 不是“随便生成新结构”，而是更多在校验“场景里应该已经有的结构”。
export type LoginLayoutRefs = {
  contentLayer: Node;
  logoArea: Node;
  brandEntryLayer: Node;
  startButton: Node;
  backButton: Node;
  roleSelectLayer: Node;
  childRoleButton: Node;
  parentRoleButton: Node;
  authFormLayer: Node;
  loginPanel: Node;
  inputArea: Node;
  buttonRow: Node;
  statusArea: Node;
};

export type LoginPageRefs = {
  loginPage: Node;
  backgroundLayer: Node;
  contentLayer: Node;
};

export function findNodeInTree(root: Node | null, name: string): Node | null {
  // 在某个节点树下面递归查找指定名字的节点。
  if (!root) {
    return null;
  }

  if (root.name === name) {
    return root;
  }

  for (const child of root.children) {
    const match = findNodeInTree(child, name);
    if (match) {
      return match;
    }
  }

  return null;
}

function requireNamedChild(parent: Node, name: string): Node {
  // 强制要求 parent 下面有某个直接子节点，否则说明场景结构被改坏了。
  const child = parent.getChildByName(name);
  if (!child) {
    throw new Error(
      formatMissingLoginChildNodeError("LoginSceneStructure", name, parent.name)
    );
  }

  return child;
}

export function findLoginCanvas(root: Node): Node | null {
  // 先从当前节点往上找 Canvas，找不到再全局搜。
  let current: Node | null = root;
  while (current) {
    if (current.name === LOGIN_SCENE_NODE.canvas) {
      return current;
    }
    current = current.parent;
  }

  return find(LOGIN_SCENE_NODE.canvas);
}

export function findLoginNode(root: Node, name: string): Node | null {
  const canvas = findLoginCanvas(root);
  return findNodeInTree(root, name) ?? findNodeInTree(canvas, name);
}

export function ensureLoginPageHierarchy(canvas: Node): LoginPageRefs {
  // 校验登录页最外层三层结构：LoginPage -> BackgroundLayer / ContentLayer。
  const loginPage = requireNamedChild(canvas, LOGIN_SCENE_NODE.loginPage);
  loginPage.setPosition(Vec3.ZERO);

  const backgroundLayer = requireNamedChild(loginPage, LOGIN_SCENE_NODE.backgroundLayer);
  backgroundLayer.setPosition(Vec3.ZERO);

  const contentLayer = requireNamedChild(loginPage, LOGIN_SCENE_NODE.contentLayer);
  contentLayer.setPosition(Vec3.ZERO);

  return {
    loginPage,
    backgroundLayer,
    contentLayer,
  };
}

export function ensureLoginLayoutHierarchy(canvas: Node): LoginLayoutRefs {
  // 在大骨架之上，继续校验登录页各功能层级都在正确位置。
  const { contentLayer } = ensureLoginPageHierarchy(canvas);
  const logoArea = requireNamedChild(contentLayer, LOGIN_SCENE_NODE.logoArea);
  logoArea.setPosition(Vec3.ZERO);
  const brandEntryLayer = requireNamedChild(contentLayer, LOGIN_SCENE_NODE.brandEntryLayer);
  brandEntryLayer.setPosition(Vec3.ZERO);
  const startButton = requireNamedChild(brandEntryLayer, LOGIN_SCENE_NODE.startButton);
  const backButton = requireNamedChild(contentLayer, LOGIN_SCENE_NODE.backButton);
  backButton.setPosition(Vec3.ZERO);
  const roleSelectLayer = requireNamedChild(contentLayer, LOGIN_SCENE_NODE.roleSelectLayer);
  roleSelectLayer.setPosition(Vec3.ZERO);
  const childRoleButton = requireNamedChild(roleSelectLayer, LOGIN_SCENE_NODE.childRoleButton);
  const parentRoleButton = requireNamedChild(roleSelectLayer, LOGIN_SCENE_NODE.parentRoleButton);
  const authFormLayer = requireNamedChild(contentLayer, LOGIN_SCENE_NODE.authFormLayer);
  authFormLayer.setPosition(Vec3.ZERO);
  const loginPanel = requireNamedChild(authFormLayer, LOGIN_SCENE_NODE.loginPanel);
  const inputArea = requireNamedChild(loginPanel, LOGIN_SCENE_NODE.inputArea);
  const buttonRow = requireNamedChild(loginPanel, LOGIN_SCENE_NODE.buttonRow);
  const statusArea = requireNamedChild(authFormLayer, LOGIN_SCENE_NODE.statusArea);
  statusArea.setPosition(Vec3.ZERO);

  return {
    contentLayer,
    logoArea,
    brandEntryLayer,
    startButton,
    backButton,
    roleSelectLayer,
    childRoleButton,
    parentRoleButton,
    authFormLayer,
    loginPanel,
    inputArea,
    buttonRow,
    statusArea,
  };
}

export function reparentIfNeeded(node: Node | null, parent: Node | null): void {
  // 如果节点不在目标父节点下，就把它重新挂回去。
  if (!node || !parent) {
    return;
  }

  if (node.parent !== parent) {
    node.setParent(parent);
  }
}
