import {
  Button,
  Color,
  EditBox,
  Graphics,
  Node,
  resources,
  SpriteFrame,
  UITransform,
  Vec3,
  view,
} from "cc";
import { loginBackgroundBuilder } from "./LoginBackgroundBuilder";
import type { LoginFlowState } from "./LoginFlowCoordinator";
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

// 文件整体作用：
// 这是登录页“把布局真正应用到节点上”的总调度器。
// 它连接了背景、布局计算、节点重挂、显示隐藏、样式绘制这几件事。
//
// 一句话版本：
// 这段代码的核心意思就是：把登录页该显示什么、摆在哪里、套什么样式，一次性真正落实到节点上。
//
// 美术需要关注的重点：
// 1. 如果某个按钮明明存在却跑错层级，通常和这里的 reparentIfNeeded 有关。
// 2. 如果某块区域该显示却没显示，通常要看 applyFlowVisibility。
// 3. 这里不会改业务数据，只负责“这一刻页面应该长什么样”。
const LOGIN_LOGO_PATH = "login/login-logo/spriteFrame";
const START_BUTTON_TEXT = "\u8fdb\u5165";
const BACK_BUTTON_TEXT = "\u8fd4\u56de";
const CHILD_ROLE_BUTTON_TEXT = "\u6211\u662f\u5b66\u751f";
const PARENT_ROLE_BUTTON_TEXT = "\u6211\u662f\u5bb6\u957f";
const LOGIN_BUTTON_TEXT = "\u767b\u5f55";
const REGISTER_BUTTON_TEXT = "\u6ce8\u518c";
const SWITCH_TO_LOGIN_TEXT = "\u53bb\u767b\u5f55";
const SWITCH_TO_REGISTER_TEXT = "\u53bb\u6ce8\u518c";

export type LoginViewNodes = {
  usernameInput: EditBox | null;
  passwordInput: EditBox | null;
  confirmPasswordInput: EditBox | null;
  statusLabel: Node | null;
  loadingNode: Node | null;
  startButton: Button | null;
  backButton: Button | null;
  accountEntryButton: Button | null;
  accountModalMaskButton: Button | null;
  accountModalPanel: Node | null;
  defaultAccountOptionButton: Button | null;
  otherAccountOptionButton: Button | null;
  childRoleButton: Button | null;
  parentRoleButton: Button | null;
  loginButton: Button | null;
  registerButton: Button | null;
  parentRegisterButton: Button | null;
};

export type LoginViewState = {
  // 这一组是“当前界面要显示什么”的轻量状态，不是业务数据。
  message: string;
  color: Color;
  isLoading: boolean;
  accountEntryText: string;
  defaultAccountText: string;
  otherAccountText: string;
  isAccountPickerOpen: boolean;
};

export class LoginViewOrchestrator {
  // 下面这些字段分别记住：logo 资源、当前层级节点、以及最近一次界面状态。
  private logoSpriteFrame: SpriteFrame | null = null;
  private isLoadingLogo = false;
  private contentLayer: Node | null = null;
  private logoArea: Node | null = null;
  private brandEntryLayer: Node | null = null;
  private backButtonNode: Node | null = null;
  private roleSelectLayer: Node | null = null;
  private authFormLayer: Node | null = null;
  private loginPanel: Node | null = null;
  private inputArea: Node | null = null;
  private buttonRow: Node | null = null;
  private statusArea: Node | null = null;
  private latestNodes: LoginViewNodes | null = null;
  private latestViewState: LoginViewState = {
    message: "",
    color: new Color(255, 255, 255, 255),
    isLoading: false,
    accountEntryText: "",
    defaultAccountText: "",
    otherAccountText: "",
    isAccountPickerOpen: false,
  };
  private latestFlowState: LoginFlowState = {
    step: "brandEntry",
    role: null,
    mode: "login",
  };

  constructor(private readonly root: Node) {}

  refresh(viewState: LoginViewState, flowState: LoginFlowState, nodes: LoginViewNodes): void {
    // 登录页每次状态变化，最后都会收口到这里统一重排。
    const canvas = findLoginCanvas(this.root);
    if (!canvas) {
      return;
    }

    this.latestNodes = nodes;
    this.latestViewState = viewState;
    this.latestFlowState = flowState;

    loginBackgroundBuilder.ensure(canvas);
    this.ensureLayoutHierarchy(canvas, nodes);
    this.applyResponsiveLayout(canvas, viewState, flowState, nodes);
  }

  private ensureLayoutHierarchy(canvas: Node, nodes: LoginViewNodes): void {
    // 把关键节点重新挂回正确层级，防止场景层级和代码预期跑偏。
    const refs = ensureLoginLayoutHierarchy(canvas);
    this.contentLayer = refs.contentLayer;
    this.logoArea = refs.logoArea;
    this.brandEntryLayer = refs.brandEntryLayer;
    this.backButtonNode = refs.backButton;
    this.roleSelectLayer = refs.roleSelectLayer;
    this.authFormLayer = refs.authFormLayer;
    this.loginPanel = refs.loginPanel;
    this.inputArea = refs.inputArea;
    this.buttonRow = refs.buttonRow;
    this.statusArea = refs.statusArea;

    reparentIfNeeded(nodes.startButton?.node ?? null, this.brandEntryLayer);
    reparentIfNeeded(nodes.backButton?.node ?? null, this.contentLayer);
    reparentIfNeeded(nodes.accountEntryButton?.node ?? null, this.brandEntryLayer);
    reparentIfNeeded(nodes.accountModalMaskButton?.node ?? null, this.contentLayer);
    reparentIfNeeded(nodes.accountModalPanel, nodes.accountModalMaskButton?.node ?? null);
    reparentIfNeeded(nodes.defaultAccountOptionButton?.node ?? null, nodes.accountModalPanel);
    reparentIfNeeded(nodes.otherAccountOptionButton?.node ?? null, nodes.accountModalPanel);
    reparentIfNeeded(nodes.childRoleButton?.node ?? null, this.roleSelectLayer);
    reparentIfNeeded(nodes.parentRoleButton?.node ?? null, this.roleSelectLayer);
    reparentIfNeeded(nodes.usernameInput?.node ?? null, this.inputArea);
    reparentIfNeeded(nodes.passwordInput?.node ?? null, this.inputArea);
    reparentIfNeeded(nodes.confirmPasswordInput?.node ?? null, this.inputArea);
    reparentIfNeeded(nodes.loginButton?.node ?? null, this.buttonRow);
    reparentIfNeeded(nodes.registerButton?.node ?? null, this.buttonRow);
    reparentIfNeeded(nodes.parentRegisterButton?.node ?? null, this.buttonRow);
    reparentIfNeeded(nodes.statusLabel, this.statusArea);
    reparentIfNeeded(nodes.loadingNode, this.statusArea);
  }

  private applyResponsiveLayout(
    canvas: Node,
    viewState: LoginViewState,
    flowState: LoginFlowState,
    nodes: LoginViewNodes
  ): void {
    // 先算布局，再决定显示隐藏，最后统一补样式。
    if (
      !this.contentLayer ||
      !this.logoArea ||
      !this.brandEntryLayer ||
      !this.backButtonNode ||
      !this.roleSelectLayer ||
      !this.authFormLayer ||
      !this.loginPanel ||
      !this.inputArea ||
      !this.buttonRow ||
      !this.statusArea
    ) {
      return;
    }

    const canvasTransform = canvas.getComponent(UITransform);
    const layout = resolveLoginLayout(
      resolveLoginViewportMetrics(
        view.getVisibleSize(),
        canvasTransform?.width,
        canvasTransform?.height
      ),
      flowState.mode
    );

    this.applyLayout(layout, nodes);
    this.applyFlowVisibility(flowState, viewState, nodes);
    this.decorateLayoutNodes(layout, nodes);
  }

  private applyLayout(layout: LoginResolvedLayout, nodes: LoginViewNodes): void {
    // 真正把每个节点的尺寸和坐标写回去。
    this.setNodeFrame(this.contentLayer, layout.metrics.width, layout.metrics.height, 0, 0);
    this.setNodeFrame(
      this.logoArea,
      layout.logoArea.width,
      layout.logoArea.height,
      layout.logoArea.x,
      layout.logoArea.y
    );
    this.setNodeFrame(
      this.brandEntryLayer,
      layout.brandEntry.width,
      layout.brandEntry.height,
      layout.brandEntry.x,
      layout.brandEntry.y
    );
    this.setNodeFrame(
      nodes.accountEntryButton?.node ?? null,
      layout.accountEntry.width,
      layout.accountEntry.height,
      layout.accountEntry.x,
      layout.accountEntry.y
    );
    this.setNodeFrame(
      nodes.startButton?.node ?? null,
      layout.startButton.width,
      layout.startButton.height,
      layout.startButton.x,
      layout.startButton.y
    );
    this.setNodeFrame(
      nodes.backButton?.node ?? null,
      layout.backButton.width,
      layout.backButton.height,
      layout.backButton.x,
      layout.backButton.y
    );
    this.setNodeFrame(
      nodes.accountModalMaskButton?.node ?? null,
      layout.accountModalMask.width,
      layout.accountModalMask.height,
      layout.accountModalMask.x,
      layout.accountModalMask.y
    );
    this.setNodeFrame(
      nodes.accountModalPanel,
      layout.accountModalPanel.width,
      layout.accountModalPanel.height,
      layout.accountModalPanel.x,
      layout.accountModalPanel.y
    );
    this.setNodeFrame(
      nodes.defaultAccountOptionButton?.node ?? null,
      layout.defaultAccountOption.width,
      layout.defaultAccountOption.height,
      layout.defaultAccountOption.x,
      layout.defaultAccountOption.y
    );
    this.setNodeFrame(
      nodes.otherAccountOptionButton?.node ?? null,
      layout.otherAccountOption.width,
      layout.otherAccountOption.height,
      layout.otherAccountOption.x,
      layout.otherAccountOption.y
    );
    this.setNodeFrame(
      this.roleSelectLayer,
      layout.roleSelect.width,
      layout.roleSelect.height,
      layout.roleSelect.x,
      layout.roleSelect.y
    );
    this.setNodeFrame(
      nodes.childRoleButton?.node ?? null,
      layout.childRoleButton.width,
      layout.childRoleButton.height,
      layout.childRoleButton.x,
      layout.childRoleButton.y
    );
    this.setNodeFrame(
      nodes.parentRoleButton?.node ?? null,
      layout.parentRoleButton.width,
      layout.parentRoleButton.height,
      layout.parentRoleButton.x,
      layout.parentRoleButton.y
    );
    this.setNodeFrame(
      this.authFormLayer,
      layout.panel.width,
      layout.panel.height + 170,
      layout.panel.x,
      layout.panel.y - 38
    );
    this.setNodeFrame(
      this.loginPanel,
      layout.panel.width,
      layout.panel.height,
      0,
      0
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
      nodes.confirmPasswordInput?.node ?? null,
      layout.confirmPasswordInput.width,
      layout.confirmPasswordInput.height,
      layout.confirmPasswordInput.x,
      layout.confirmPasswordInput.y
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
      nodes.parentRegisterButton?.node ?? null,
      layout.parentRegisterButton.width,
      layout.parentRegisterButton.height,
      layout.parentRegisterButton.x,
      layout.parentRegisterButton.y
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

  private applyFlowVisibility(
    flowState: LoginFlowState,
    viewState: LoginViewState,
    nodes: LoginViewNodes
  ): void {
    // 根据当前流程步骤，决定品牌入口、角色选择、表单、账号弹层分别显示还是隐藏。
    const showBrandEntry = flowState.step === "brandEntry" || flowState.step === "restore";
    const showRoleSelect = flowState.step === "roleSelect";
    const showAuthForm = flowState.step === "authForm";
    const showRegisterMode = showAuthForm && flowState.mode === "register";
    const showBackButton = flowState.step === "roleSelect" || flowState.step === "authForm";
    // 注册按钮要作为“模式切换入口 + 注册提交按钮”双重使用：
    // - 在 login 模式下，它负责把页面切到 register 模式
    // - 在 register 模式下，它负责真正提交注册
    // 所以只要当前已经进入对应角色的 authForm，就应该显示出来。
    const showChildRegisterAction = showAuthForm && flowState.role === "CHILD";
    const showParentRegisterAction = showAuthForm && flowState.role === "PARENT";

    if (this.brandEntryLayer) {
      this.brandEntryLayer.active = showBrandEntry;
    }

    if (this.roleSelectLayer) {
      this.roleSelectLayer.active = showRoleSelect;
    }

    if (this.authFormLayer) {
      this.authFormLayer.active = showAuthForm;
    }

    if (nodes.backButton) {
      nodes.backButton.node.active = showBackButton;
    }

    if (nodes.accountEntryButton) {
      nodes.accountEntryButton.node.active = showBrandEntry;
    }

    if (nodes.accountModalMaskButton) {
      nodes.accountModalMaskButton.node.active = showBrandEntry && viewState.isAccountPickerOpen;
    }

    if (nodes.loginButton) {
      nodes.loginButton.node.active = showAuthForm;
    }

    if (nodes.confirmPasswordInput) {
      nodes.confirmPasswordInput.node.active = showRegisterMode;
    }

    if (nodes.registerButton) {
      nodes.registerButton.node.active = showChildRegisterAction;
    }

    if (nodes.parentRegisterButton) {
      nodes.parentRegisterButton.node.active = showParentRegisterAction;
    }

    if (nodes.statusLabel) {
      nodes.statusLabel.active = showAuthForm;
    }

    if (nodes.loadingNode) {
      nodes.loadingNode.active = showAuthForm && viewState.isLoading;
    }
  }

  private decorateLayoutNodes(layout: LoginResolvedLayout, nodes: LoginViewNodes): void {
    // 在位置确定后，再统一给节点补外观。
    const viewState = this.latestViewState;
    const flowState = this.latestFlowState;
    const loginActionText =
      flowState.mode === "register" ? SWITCH_TO_LOGIN_TEXT : LOGIN_BUTTON_TEXT;
    const registerActionText =
      flowState.mode === "register" ? REGISTER_BUTTON_TEXT : SWITCH_TO_REGISTER_TEXT;
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

    loginVisualStyler.styleAccountEntryNode(
      nodes.accountEntryButton?.node ?? null,
      layout.accountEntry.width,
      layout.accountEntry.height,
      viewState.accountEntryText
    );
    loginVisualStyler.styleButtonNode(
      nodes.startButton?.node ?? null,
      layout.startButton.width,
      layout.startButton.height,
      true,
      START_BUTTON_TEXT
    );
    loginVisualStyler.styleButtonNode(
      nodes.defaultAccountOptionButton?.node ?? null,
      layout.defaultAccountOption.width,
      layout.defaultAccountOption.height,
      true,
      viewState.defaultAccountText
    );
    loginVisualStyler.styleButtonNode(
      nodes.otherAccountOptionButton?.node ?? null,
      layout.otherAccountOption.width,
      layout.otherAccountOption.height,
      false,
      viewState.otherAccountText
    );
    this.styleAccountModalMask(
      nodes.accountModalMaskButton?.node ?? null,
      layout.accountModalMask.width,
      layout.accountModalMask.height
    );
    this.styleAccountModalPanel(
      nodes.accountModalPanel,
      layout.accountModalPanel.width,
      layout.accountModalPanel.height,
      layout.metrics.isPortrait
    );
    loginVisualStyler.styleButtonNode(
      nodes.backButton?.node ?? null,
      layout.backButton.width,
      layout.backButton.height,
      false,
      BACK_BUTTON_TEXT
    );
    loginVisualStyler.styleButtonNode(
      nodes.childRoleButton?.node ?? null,
      layout.childRoleButton.width,
      layout.childRoleButton.height,
      false,
      CHILD_ROLE_BUTTON_TEXT
    );
    loginVisualStyler.styleButtonNode(
      nodes.parentRoleButton?.node ?? null,
      layout.parentRoleButton.width,
      layout.parentRoleButton.height,
      false,
      PARENT_ROLE_BUTTON_TEXT
    );
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
    loginVisualStyler.styleInputNode(
      nodes.confirmPasswordInput?.node ?? null,
      layout.confirmPasswordInput.width,
      layout.confirmPasswordInput.height
    );
    loginVisualStyler.styleButtonNode(
      nodes.loginButton?.node ?? null,
      layout.loginButton.width,
      layout.loginButton.height,
      flowState.mode === "login",
      loginActionText
    );
    loginVisualStyler.styleButtonNode(
      nodes.registerButton?.node ?? null,
      layout.registerButton.width,
      layout.registerButton.height,
      flowState.mode === "register" && flowState.role === "CHILD",
      registerActionText
    );
    loginVisualStyler.styleButtonNode(
      nodes.parentRegisterButton?.node ?? null,
      layout.parentRegisterButton.width,
      layout.parentRegisterButton.height,
      flowState.mode === "register" && flowState.role === "PARENT",
      registerActionText
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
    // 异步加载正式 logo，加载完后再刷新一遍页面。
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
        this.refresh(this.latestViewState, this.latestFlowState, this.latestNodes);
      }
    });
  }

  private styleAccountModalMask(node: Node | null, width: number, height: number): void {
    // 弹层遮罩：负责压暗背景，并接收“点空白关闭”这类交互。
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = new Color(7, 14, 24, 168);
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
  }

  private styleAccountModalPanel(
    node: Node | null,
    width: number,
    height: number,
    isPortrait: boolean
  ): void {
    // 账号选择弹层本体沿用登录面板的装饰风格。
    if (!node) {
      return;
    }

    loginVisualStyler.decorateLoginPanel(node, width, height, isPortrait);
  }
}
