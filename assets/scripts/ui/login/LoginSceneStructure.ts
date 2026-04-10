import { find, Node, Vec3 } from "cc";

export type LoginLayoutRefs = {
  contentLayer: Node;
  logoArea: Node;
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

function ensureNamedChild(parent: Node, name: string): Node {
  let child = parent.getChildByName(name);
  if (!child) {
    child = new Node(name);
    child.setParent(parent);
  }
  return child;
}

export function findLoginCanvas(root: Node): Node | null {
  let current: Node | null = root;
  while (current) {
    if (current.name === "Canvas") {
      return current;
    }
    current = current.parent;
  }

  return find("Canvas");
}

export function findLoginNode(root: Node, name: string): Node | null {
  const canvas = findLoginCanvas(root);
  return findNodeInTree(root, name) ?? findNodeInTree(canvas, name);
}

export function ensureLoginPageHierarchy(canvas: Node): LoginPageRefs {
  const loginPage = ensureNamedChild(canvas, "LoginPage");
  loginPage.setPosition(Vec3.ZERO);
  loginPage.setSiblingIndex(0);

  const backgroundLayer = ensureNamedChild(loginPage, "BackgroundLayer");
  backgroundLayer.setPosition(Vec3.ZERO);
  backgroundLayer.setSiblingIndex(0);

  const contentLayer = ensureNamedChild(loginPage, "ContentLayer");
  contentLayer.setPosition(Vec3.ZERO);
  contentLayer.setSiblingIndex(1);

  return {
    loginPage,
    backgroundLayer,
    contentLayer,
  };
}

export function ensureLoginLayoutHierarchy(canvas: Node): LoginLayoutRefs {
  const { contentLayer } = ensureLoginPageHierarchy(canvas);
  const logoArea = ensureNamedChild(contentLayer, "LogoArea");
  const loginPanel = ensureNamedChild(contentLayer, "LoginPanel");
  const inputArea = ensureNamedChild(loginPanel, "InputArea");
  const buttonRow = ensureNamedChild(loginPanel, "ButtonRow");
  const statusArea = ensureNamedChild(contentLayer, "StatusArea");

  return {
    contentLayer,
    logoArea,
    loginPanel,
    inputArea,
    buttonRow,
    statusArea,
  };
}

export function reparentIfNeeded(node: Node | null, parent: Node | null): void {
  if (!node || !parent) {
    return;
  }

  if (node.parent !== parent) {
    node.setParent(parent);
  }
}
