import {
  Button,
  Color,
  EditBox,
  Node,
  resources,
  SpriteFrame,
  UITransform,
  Vec3,
  view,
} from "cc";
import { loginBackgroundBuilder } from "./LoginBackgroundBuilder";
import {
  resolveLoginLayout,
  resolveLoginViewportMetrics,
  type LoginResolvedLayout,
} from "./LoginLayoutCalculator";
import {
  ensureLoginLayoutHierarchy,
  findLoginCanvas,
  reparentIfNeeded,
} from "./LoginSceneStructure";
import { loginVisualStyler } from "./LoginVisualStyler";

const LOGIN_LOGO_PATH = "login/login-logo/spriteFrame";
const LOGIN_BUTTON_TEXT = "登录";
const REGISTER_BUTTON_TEXT = "注册并登录";

export type LoginViewNodes = {
  usernameInput: EditBox | null;
  passwordInput: EditBox | null;
  statusLabel: Node | null;
  loadingNode: Node | null;
  loginButton: Button | null;
  registerButton: Button | null;
};

export type LoginViewState = {
  message: string;
  color: Color;
};

export class LoginViewOrchestrator {
  private logoSpriteFrame: SpriteFrame | null = null;
  private isLoadingLogo = false;
  private contentLayer: Node | null = null;
  private logoArea: Node | null = null;
  private loginPanel: Node | null = null;
  private inputArea: Node | null = null;
  private buttonRow: Node | null = null;
  private statusArea: Node | null = null;
  private latestNodes: LoginViewNodes | null = null;
  private latestViewState: LoginViewState = {
    message: "",
    color: new Color(255, 255, 255, 255),
  };

  constructor(private readonly root: Node) {}

  refresh(viewState: LoginViewState, nodes: LoginViewNodes): void {
    const canvas = findLoginCanvas(this.root);
    if (!canvas) {
      return;
    }

    this.latestNodes = nodes;
    this.latestViewState = viewState;

    loginBackgroundBuilder.ensure(canvas);
    this.ensureLayoutHierarchy(canvas, nodes);
    this.applyResponsiveLayout(canvas, viewState, nodes);
  }

  private ensureLayoutHierarchy(canvas: Node, nodes: LoginViewNodes): void {
    const refs = ensureLoginLayoutHierarchy(canvas);
    this.contentLayer = refs.contentLayer;
    this.logoArea = refs.logoArea;
    this.loginPanel = refs.loginPanel;
    this.inputArea = refs.inputArea;
    this.buttonRow = refs.buttonRow;
    this.statusArea = refs.statusArea;

    reparentIfNeeded(nodes.usernameInput?.node ?? null, this.inputArea);
    reparentIfNeeded(nodes.passwordInput?.node ?? null, this.inputArea);
    reparentIfNeeded(nodes.loginButton?.node ?? null, this.buttonRow);
    reparentIfNeeded(nodes.registerButton?.node ?? null, this.buttonRow);
    reparentIfNeeded(nodes.statusLabel, this.statusArea);
    reparentIfNeeded(nodes.loadingNode, this.statusArea);
  }

  private applyResponsiveLayout(
    canvas: Node,
    viewState: LoginViewState,
    nodes: LoginViewNodes
  ): void {
    if (
      !this.contentLayer ||
      !this.logoArea ||
      !this.loginPanel ||
      !this.inputArea ||
      !this.buttonRow ||
      !this.statusArea
    ) {
      return;
    }

    const canvasTransform = canvas.getComponent(UITransform);
    const layout = resolveLoginLayout(
      resolveLoginViewportMetrics(view.getVisibleSize(), canvasTransform?.width, canvasTransform?.height)
    );

    this.applyLayout(layout, nodes);
    this.decorateLayoutNodes(layout, viewState, nodes);
  }

  private applyLayout(layout: LoginResolvedLayout, nodes: LoginViewNodes): void {
    this.setNodeFrame(this.contentLayer, layout.metrics.width, layout.metrics.height, 0, 0);
    this.setNodeFrame(
      this.logoArea,
      layout.logoArea.width,
      layout.logoArea.height,
      layout.logoArea.x,
      layout.logoArea.y
    );
    this.setNodeFrame(
      this.loginPanel,
      layout.panel.width,
      layout.panel.height,
      layout.panel.x,
      layout.panel.y
    );
    this.setNodeFrame(
      this.inputArea,
      layout.inputArea.width,
      layout.inputArea.height,
      layout.inputArea.x,
      layout.inputArea.y
    );
    this.setNodeFrame(
      this.buttonRow,
      layout.buttonRow.width,
      layout.buttonRow.height,
      layout.buttonRow.x,
      layout.buttonRow.y
    );
    this.setNodeFrame(
      this.statusArea,
      layout.statusArea.width,
      layout.statusArea.height,
      layout.statusArea.x,
      layout.statusArea.y
    );

    this.setNodeFrame(
      nodes.usernameInput?.node ?? null,
      layout.usernameInput.width,
      layout.usernameInput.height,
      layout.usernameInput.x,
      layout.usernameInput.y
    );
    this.setNodeFrame(
      nodes.passwordInput?.node ?? null,
      layout.passwordInput.width,
      layout.passwordInput.height,
      layout.passwordInput.x,
      layout.passwordInput.y
    );
    this.setNodeFrame(
      nodes.loginButton?.node ?? null,
      layout.loginButton.width,
      layout.loginButton.height,
      layout.loginButton.x,
      layout.loginButton.y
    );
    this.setNodeFrame(
      nodes.registerButton?.node ?? null,
      layout.registerButton.width,
      layout.registerButton.height,
      layout.registerButton.x,
      layout.registerButton.y
    );
    this.setNodeFrame(
      nodes.statusLabel,
      layout.statusText.width,
      layout.statusText.height,
      layout.statusText.x,
      layout.statusText.y
    );
    this.setNodeFrame(
      nodes.loadingNode,
      layout.loadingText.width,
      layout.loadingText.height,
      layout.loadingText.x,
      layout.loadingText.y
    );
  }

  private decorateLayoutNodes(
    layout: LoginResolvedLayout,
    viewState: LoginViewState,
    nodes: LoginViewNodes
  ): void {
    if (!this.logoSpriteFrame) {
      this.loadLogoAsset();
    }

    if (this.logoArea && this.loginPanel) {
      loginVisualStyler.decorateLogoArea(this.logoArea, {
        width: layout.logoArea.width,
        height: layout.logoArea.height,
        isPortrait: layout.metrics.isPortrait,
        logoSpriteFrame: this.logoSpriteFrame,
        logoImageLayout: layout.logoImage,
      });
      loginVisualStyler.decorateLoginPanel(
        this.loginPanel,
        layout.panel.width,
        layout.panel.height,
        layout.metrics.isPortrait
      );
    }

    loginVisualStyler.styleInputNode(
      nodes.usernameInput?.node ?? null,
      layout.usernameInput.width,
      layout.usernameInput.height
    );
    loginVisualStyler.styleInputNode(
      nodes.passwordInput?.node ?? null,
      layout.passwordInput.width,
      layout.passwordInput.height
    );
    loginVisualStyler.styleButtonNode(
      nodes.loginButton?.node ?? null,
      layout.loginButton.width,
      layout.loginButton.height,
      true,
      LOGIN_BUTTON_TEXT
    );
    loginVisualStyler.styleButtonNode(
      nodes.registerButton?.node ?? null,
      layout.registerButton.width,
      layout.registerButton.height,
      false,
      REGISTER_BUTTON_TEXT
    );
    loginVisualStyler.styleStatusNode(
      nodes.statusLabel,
      layout.statusText.width,
      layout.statusText.height,
      viewState.message,
      viewState.color
    );
    loginVisualStyler.styleLoadingNode(
      nodes.loadingNode,
      layout.loadingText.width,
      layout.loadingText.height
    );
  }

  private setNodeFrame(
    node: Node | null,
    width: number,
    height: number,
    x: number,
    y: number
  ): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    node.setPosition(new Vec3(x, y, 0));
  }

  private loadLogoAsset(): void {
    if (this.isLoadingLogo || this.logoSpriteFrame) {
      return;
    }

    this.isLoadingLogo = true;
    resources.load(LOGIN_LOGO_PATH, SpriteFrame, (error, spriteFrame) => {
      this.isLoadingLogo = false;
      if (error || !spriteFrame) {
        console.warn("[LoginViewOrchestrator] Failed to load login logo", error);
        return;
      }

      this.logoSpriteFrame = spriteFrame;
      if (this.root?.isValid && this.latestNodes) {
        this.refresh(this.latestViewState, this.latestNodes);
      }
    });
  }
}
