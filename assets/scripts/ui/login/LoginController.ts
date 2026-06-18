import {
  _decorator,
  Button,
  Color,
  Component,
  EditBox,
  EventTouch,
  Graphics,
  Label,
  Node,
  native,
  sys,
  UITransform,
  Vec3,
  view,
} from "cc";
import { appState } from "../../app/AppState";
import { isDiagnosticsEnabled } from "../../core/config";
import { devActionLogger } from "../../core/DevActionLogger";
import { sceneRouter } from "../../navigation/SceneRouter";
import { authService } from "../../services/AuthService";
import { hotUpdateService } from "../../services/HotUpdateService";
import type { HotUpdateProgress } from "../../services/HotUpdateService";
import type { UserRole } from "../../types/api";
import {
  LoginAuthCoordinator,
  LOGIN_STATUS_STATES,
  type LoginAuthOutcome,
  type LoginStatusState,
  type LoginStatusTone,
} from "./LoginAuthCoordinator";
import { applyLoginLoadingState, renderLoginStatus } from "./LoginFeedbackPresenter";
import { loginAccountStore, type LoginSavedAccount } from "./LoginAccountStore";
import { LoginFlowCoordinator, type LoginFlowMode } from "./LoginFlowCoordinator";
import { LoginResolutionCoordinator } from "./LoginResolutionCoordinator";
import { resolveLoginSceneRefs } from "./LoginSceneRefs";
import { LOGIN_THEME, themeColor } from "./LoginViewConfig";
import { LoginViewOrchestrator, type LoginViewNodes } from "./LoginViewOrchestrator";

const DEV_LOG_BUTTON_VERTICAL_OFFSET = 64;

// 文件整体作用：
// 这是整个登录页的总控制器。
// 它会把登录流程、账号选择弹层、输入框内容、状态提示、场景跳转全部串起来。
//
// 一句话版本：
// 这段代码的核心意思就是：统一控制登录页每一步该显示什么、点按钮后去哪里、成功后怎么进入主界面。
//
// 美术需要关注的重点：
// 1. 登录页大部分按钮点击后会不会切界面、切到哪一步，主要都由这里控制。
// 2. 账号条、账号弹层、登录/注册表单、返回按钮，都是这里决定显示与隐藏。
// 3. 如果只是想改位置和样式，优先看 ViewConfig / ViewOrchestrator / VisualStyler，不要先动这里。
const { ccclass, property } = _decorator;

@ccclass("LoginController")
export class LoginController extends Component {
  @property(EditBox)
  // usernameInput：用户名输入框，必须是场景里真实存在的输入框节点。
  usernameInput: EditBox | null = null;

  @property(EditBox)
  // passwordInput：密码输入框。
  passwordInput: EditBox | null = null;

  // confirmPasswordInput：注册模式下才会显示的“确认密码”输入框。
  private confirmPasswordInput: EditBox | null = null;

  @property(Node)
  // statusLabel：底部状态提示区域。
  statusLabel: Node | null = null;

  @property(Node)
  // loadingNode：登录提交时显示的“请稍候”提示区域。
  loadingNode: Node | null = null;

  // 下面这些 coordinator / 引用，分别负责业务、流程和布局适配。
  private readonly authCoordinator = new LoginAuthCoordinator(authService);
  private readonly flowCoordinator = new LoginFlowCoordinator();
  private readonly resolutionCoordinator = new LoginResolutionCoordinator();
  private startButton: Button | null = null;
  private backButton: Button | null = null;
  private accountEntryButton: Button | null = null;
  private accountModalMaskButton: Button | null = null;
  private accountModalPanel: Node | null = null;
  private defaultAccountOptionButton: Button | null = null;
  private otherAccountOptionButton: Button | null = null;
  private childRoleButton: Button | null = null;
  private parentRoleButton: Button | null = null;
  private loginButton: Button | null = null;
  private registerButton: Button | null = null;
  private parentRegisterButton: Button | null = null;
  private viewOrchestrator: LoginViewOrchestrator | null = null;
  private currentStatus: LoginStatusState = LOGIN_STATUS_STATES.idle;
  private isLoading = false;
  private resumableRole: UserRole | null = null;
  private resumableUsername: string | null = null;
  private defaultAccount: LoginSavedAccount | null = loginAccountStore.getDefaultAccount();
  private selectedAccount: LoginSavedAccount | null = this.defaultAccount;
  private isAccountPickerOpen = false;
  private devLogButton: Button | null = null;
  private devLogPanel: Node | null = null;
  private devLogLabel: Label | null = null;
  private devLogStatusLabel: Label | null = null;
  private clearHotUpdateButton: Button | null = null;
  private copyDevLogButton: Button | null = null;
  private retryHotUpdateButton: Button | null = null;
  private isDevLogOpen = false;
  private devLogScrollOffset = 0;
  private devLogTouchY = 0;
  private devLogTouchCarry = 0;
  private hotUpdateGate: Node | null = null;
  private hotUpdateStatusLabel: Label | null = null;
  private hotUpdateDetailLabel: Label | null = null;
  private hotUpdatePercentLabel: Label | null = null;
  private hotUpdateProgressFill: Node | null = null;
  private hotUpdateRetryButton: Button | null = null;
  private hotUpdateContinueButton: Button | null = null;
  private hotUpdateFailureResolver: ((action: "retry" | "continue") => void) | null = null;

  onLoad(): void {
    // 登录页加载时，先抓分辨率、节点引用、按钮事件，再刷新一次显示。
    devActionLogger.info("runtime.bundle.fingerprint.v53.devLogScrollFix", "login.onLoad");
    this.resolutionCoordinator.capture();
    this.resolutionCoordinator.applyCurrentFrame();
    this.resolveSceneReferences();
    this.bindActionButtons();
    this.configureInputs();
    devActionLogger.setHeaderProvider(() => hotUpdateService.getVersionSummary());
    if (isDiagnosticsEnabled()) {
      this.ensureDevLogEntry();
    }
    this.viewOrchestrator = new LoginViewOrchestrator(this.node);
    this.refreshResponsiveView();
    view.on("canvas-resize", this.handleCanvasResize, this);
  }

  onDestroy(): void {
    view.off("canvas-resize", this.handleCanvasResize, this);
    this.hotUpdateFailureResolver?.("continue");
    this.hotUpdateFailureResolver = null;
    this.resolutionCoordinator.restore();
  }

  async start(): Promise<void> {
    // 登录页启动时先回到“恢复态”，再决定是继续上次会话还是展示默认入口。
    this.flowCoordinator.enterRestore();
    this.setLoading(false);
    this.setStatus(LOGIN_STATUS_STATES.idle);
    const shouldContinue = await this.runVisibleHotUpdateGate();
    if (!shouldContinue) {
      return;
    }
    await this.restoreSessionIfNeeded();
  }

  async onLoginClick(): Promise<void> {
    if (this.flowCoordinator.getState().mode === "register") {
      this.enterAuthForm(this.getCurrentRole(), "login");
      return;
    }

    await this.executeAuthFlow(() =>
      this.authCoordinator.login(
        this.usernameInput?.string.trim() ?? "",
        this.passwordInput?.string ?? "",
        this.handlePendingStatus
      )
    );
  }

  async onRegisterClick(): Promise<void> {
    devActionLogger.info("login.registerButton.tap", {
      mode: this.flowCoordinator.getState().mode,
      role: "CHILD",
    });
    await this.handleRegisterAction("CHILD");
  }

  async onParentRegisterClick(): Promise<void> {
    devActionLogger.info("login.registerButton.tap", {
      mode: this.flowCoordinator.getState().mode,
      role: "PARENT",
    });
    await this.handleRegisterAction("PARENT");
  }

  onClearClick(): void {
    this.resetAuthFormState();
    this.isAccountPickerOpen = false;
    this.refreshResponsiveView();
  }

  private resolveSceneReferences(): void {
    // 把场景里要用的按钮、输入框、弹层节点一次性整理出来。
    const refs = resolveLoginSceneRefs(this.node, {
      usernameInput: this.usernameInput,
      passwordInput: this.passwordInput,
      confirmPasswordInput: this.confirmPasswordInput,
      statusLabel: this.statusLabel,
      loadingNode: this.loadingNode,
    });

    this.usernameInput = refs.usernameInput;
    this.passwordInput = refs.passwordInput;
    this.confirmPasswordInput = refs.confirmPasswordInput;
    this.statusLabel = refs.statusLabel;
    this.loadingNode = refs.loadingNode;
    this.startButton = refs.startButton;
    this.backButton = refs.backButton;
    this.accountEntryButton = refs.accountEntryButton;
    this.accountModalMaskButton = refs.accountModalMaskButton;
    this.accountModalPanel = refs.accountModalPanel;
    this.defaultAccountOptionButton = refs.defaultAccountOptionButton;
    this.otherAccountOptionButton = refs.otherAccountOptionButton;
    this.childRoleButton = refs.childRoleButton;
    this.parentRoleButton = refs.parentRoleButton;
    this.loginButton = refs.loginButton;
    this.registerButton = refs.registerButton;
    this.parentRegisterButton = refs.parentRegisterButton;
  }

  private bindActionButtons(): void {
    // 所有登录页按钮点击事件统一在这里挂上。
    this.bindButton(this.startButton, this.onStartClick);
    this.bindButton(this.backButton, this.onBackClick);
    this.bindButton(this.accountEntryButton, this.onAccountEntryClick);
    this.bindButton(this.accountModalMaskButton, this.onAccountPickerDismiss);
    this.bindButton(this.defaultAccountOptionButton, this.onDefaultAccountOptionClick);
    this.bindButton(this.otherAccountOptionButton, this.onOtherAccountOptionClick);
    this.bindButton(this.childRoleButton, this.onChildRoleClick);
    this.bindButton(this.parentRoleButton, this.onParentRoleClick);
    this.bindButton(this.loginButton, this.onLoginClick);
    this.bindButton(this.registerButton, this.onRegisterClick);
    this.bindButton(this.parentRegisterButton, this.onParentRegisterClick);
  }

  private bindButton(
    button: Button | null,
    handler: () => void | Promise<void>
  ): void {
    button?.node.off(Button.EventType.CLICK, handler, this);
    button?.node.on(Button.EventType.CLICK, handler, this);
  }

  private configureInputs(): void {
    // 给输入框统一设置长度上限，避免异常超长文本。
    if (this.usernameInput) {
      this.usernameInput.maxLength = 64;
    }

    if (this.passwordInput) {
      this.passwordInput.maxLength = 64;
    }

    if (this.confirmPasswordInput) {
      this.confirmPasswordInput.maxLength = 64;
    }
  }

  private getViewNodes(): LoginViewNodes {
    // 把所有当前可用的界面节点打包给 ViewOrchestrator 使用。
    return {
      usernameInput: this.usernameInput,
      passwordInput: this.passwordInput,
      confirmPasswordInput: this.confirmPasswordInput,
      statusLabel: this.statusLabel,
      loadingNode: this.loadingNode,
      startButton: this.startButton,
      backButton: this.backButton,
      accountEntryButton: this.accountEntryButton,
      accountModalMaskButton: this.accountModalMaskButton,
      accountModalPanel: this.accountModalPanel,
      defaultAccountOptionButton: this.defaultAccountOptionButton,
      otherAccountOptionButton: this.otherAccountOptionButton,
      childRoleButton: this.childRoleButton,
      parentRoleButton: this.parentRoleButton,
      loginButton: this.loginButton,
      registerButton: this.registerButton,
      parentRegisterButton: this.parentRegisterButton,
    };
  }

  private refreshResponsiveView(): void {
    // 每次流程或状态变化后，统一从这里刷新登录页显示。
    this.viewOrchestrator?.refresh(
      {
        message: this.currentStatus.message,
        color: this.getToneColor(this.currentStatus.tone),
        isLoading: this.isLoading,
        accountEntryText: this.selectedAccount
          ? this.selectedAccount.username
          : "其他账号登录",
        defaultAccountText: this.defaultAccount
          ? `${this.defaultAccount.username} · ${this.formatRoleLabel(this.defaultAccount.role)}`
          : "当前没有默认账号",
        otherAccountText: "其他账号登录",
        isAccountPickerOpen: this.isAccountPickerOpen,
      },
      this.flowCoordinator.getState(),
      this.getViewNodes()
    );
    this.positionDevLogEntry();
  }

  private handleCanvasResize(): void {
    if (this.resolutionCoordinator.shouldIgnoreResize()) {
      return;
    }

    this.resolutionCoordinator.applyCurrentFrame();
    this.positionDevLogEntry();
    this.positionHotUpdateGate();
    this.refreshResponsiveView();
  }

  private async runVisibleHotUpdateGate(): Promise<boolean> {
    this.showHotUpdateGate();
    this.renderHotUpdateProgress({
      stage: "checking",
      localVersion: "unknown",
      remoteVersion: "unknown",
      manifestUrl: "",
    });

    while (this.node.isValid) {
      const result = await hotUpdateService.checkAndUpdate({
        onProgress: (progress) => this.renderHotUpdateProgress(progress),
      });

      if (result.status === "updated" || result.status === "updating") {
        this.renderHotUpdateProgress({
          stage: "updated",
          message: "\u66f4\u65b0\u5df2\u5b8c\u6210\uff0c\u8bf7\u5173\u95ed\u5e76\u91cd\u65b0\u6253\u5f00\u5e94\u7528",
          percent: 100,
          localVersion: "unknown",
          remoteVersion: "unknown",
          manifestUrl: "",
        });
        return await this.waitForHotUpdateCompletedAction();
      }

      if (result.status === "failed") {
        const action = await this.waitForHotUpdateFailureAction(result.message);
        if (action === "retry") {
          continue;
        }
        this.hideHotUpdateGate();
        return true;
      }

      if (result.status === "disabled" || result.status === "unsupported") {
        await this.delay(280);
        this.hideHotUpdateGate();
        return true;
      }

      this.renderHotUpdateProgress({
        stage: "upToDate",
        percent: 100,
        localVersion: "unknown",
        remoteVersion: "unknown",
        manifestUrl: "",
      });
      await this.delay(280);
      this.hideHotUpdateGate();
      return true;
    }

    return false;
  }

  private showHotUpdateGate(): void {
    const canvas = this.node.scene?.getChildByName("Canvas") ?? this.node;
    if (!canvas) {
      return;
    }

    this.ensureHotUpdateGate(canvas);
    if (this.hotUpdateGate) {
      this.hotUpdateGate.active = true;
      this.hotUpdateGate.setSiblingIndex(10000);
    }
    this.setHotUpdateActionButtonsVisible(false);
    this.positionHotUpdateGate();
  }

  private hideHotUpdateGate(): void {
    if (this.hotUpdateGate) {
      this.hotUpdateGate.active = false;
    }
    this.hotUpdateFailureResolver = null;
  }

  private ensureHotUpdateGate(canvas: Node): void {
    if (this.hotUpdateGate) {
      return;
    }

    const gate = new Node("HotUpdateGate");
    gate.parent = canvas;
    gate.addComponent(UITransform);
    this.paintRect(gate, 1280, 720, new Color(6, 14, 30, 216));

    const panel = new Node("HotUpdatePanel");
    panel.parent = gate;
    panel.addComponent(UITransform).setContentSize(720, 230);
    this.paintRect(panel, 720, 230, new Color(10, 20, 36, 120));

    const titleNode = this.createHotUpdateLabel(
      gate,
      "HotUpdateTitle",
      "\u68c0\u67e5\u66f4\u65b0\u4e2d",
      30,
      new Color(255, 255, 255, 255),
      new Vec3(0, 42, 0),
      520,
      48
    );
    const statusNode = this.createHotUpdateLabel(
      gate,
      "HotUpdateStatus",
      "\u6b63\u5728\u8fde\u63a5\u66f4\u65b0\u670d\u52a1...",
      20,
      new Color(232, 244, 255, 238),
      new Vec3(0, -8, 0),
      620,
      34
    );
    this.hotUpdateStatusLabel = statusNode.getComponent(Label);

    const progressTrack = new Node("HotUpdateProgressTrack");
    progressTrack.parent = gate;
    progressTrack.addComponent(UITransform).setContentSize(560, 16);
    progressTrack.setPosition(new Vec3(0, -56, 0));
    this.paintRect(progressTrack, 560, 16, new Color(12, 17, 28, 178));

    const progressFill = new Node("HotUpdateProgressFill");
    progressFill.parent = progressTrack;
    progressFill.addComponent(UITransform).setContentSize(0, 16);
    progressFill.setPosition(new Vec3(-280, 0, 0));
    this.hotUpdateProgressFill = progressFill;
    this.paintProgressFill(0);

    const percentNode = this.createHotUpdateLabel(
      gate,
      "HotUpdatePercent",
      "0%",
      24,
      new Color(255, 255, 255, 255),
      new Vec3(0, -92, 0),
      160,
      34
    );
    this.hotUpdatePercentLabel = percentNode.getComponent(Label);

    const detailNode = this.createHotUpdateLabel(
      gate,
      "HotUpdateDetail",
      "",
      16,
      new Color(198, 219, 238, 210),
      new Vec3(0, -128, 0),
      680,
      32
    );
    this.hotUpdateDetailLabel = detailNode.getComponent(Label);

    this.hotUpdateRetryButton = this.createHotUpdateButton(
      gate,
      "\u91cd\u8bd5",
      new Vec3(-90, -174, 0),
      this.onHotUpdateRetryClick
    );
    this.hotUpdateContinueButton = this.createHotUpdateButton(
      gate,
      "\u7ee7\u7eed\u8fdb\u5165",
      new Vec3(90, -174, 0),
      this.onHotUpdateContinueClick
    );

    this.hotUpdateGate = gate;
    this.setHotUpdateActionButtonsVisible(false);
  }

  private createHotUpdateLabel(
    parent: Node,
    name: string,
    text: string,
    fontSize: number,
    color: Color,
    position: Vec3,
    width: number,
    height: number
  ): Node {
    const node = new Node(name);
    node.parent = parent;
    node.addComponent(UITransform).setContentSize(width, height);
    node.setPosition(position);
    const label = node.addComponent(Label);
    label.string = text;
    label.fontSize = fontSize;
    label.color = color;
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;
    label.overflow = Label.Overflow.SHRINK;
    return node;
  }

  private createHotUpdateButton(
    parent: Node,
    text: string,
    position: Vec3,
    handler: () => void
  ): Button {
    const buttonNode = new Node(text);
    buttonNode.parent = parent;
    buttonNode.addComponent(UITransform).setContentSize(138, 42);
    buttonNode.setPosition(position);
    this.paintRect(buttonNode, 138, 42, new Color(24, 76, 102, 232));

    const labelNode = new Node("Label");
    labelNode.parent = buttonNode;
    labelNode.addComponent(UITransform).setContentSize(138, 42);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 18;
    label.color = new Color(255, 255, 255, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    const button = buttonNode.addComponent(Button);
    button.node.on(Button.EventType.CLICK, handler, this);
    return button;
  }

  private renderHotUpdateProgress(progress: HotUpdateProgress): void {
    const percent = this.resolveHotUpdatePercent(progress);
    if (this.hotUpdateStatusLabel) {
      this.hotUpdateStatusLabel.string = this.formatHotUpdateStatus(progress);
    }
    if (this.hotUpdatePercentLabel) {
      this.hotUpdatePercentLabel.string = `${percent}%`;
    }
    if (this.hotUpdateDetailLabel) {
      this.hotUpdateDetailLabel.string = this.formatHotUpdateDetail(progress);
    }
    this.paintProgressFill(percent);
  }

  private resolveHotUpdatePercent(progress: HotUpdateProgress): number {
    if (typeof progress.percent === "number") {
      return Math.max(0, Math.min(100, Math.round(progress.percent)));
    }

    if (progress.stage === "upToDate" || progress.stage === "updated") {
      return 100;
    }

    if (progress.stage === "checking") {
      return 6;
    }

    return 0;
  }

  private formatHotUpdateStatus(progress: HotUpdateProgress): string {
    if (progress.stage === "checking") {
      return "\u6b63\u5728\u68c0\u67e5\u66f4\u65b0...";
    }
    if (progress.stage === "downloading") {
      return "\u53d1\u73b0\u65b0\u7248\u672c\uff0c\u6b63\u5728\u4e0b\u8f7d...";
    }
    if (progress.stage === "upToDate") {
      return "\u5df2\u662f\u6700\u65b0\u7248\u672c";
    }
    if (progress.stage === "updated") {
      return progress.message || "\u66f4\u65b0\u5df2\u5b8c\u6210\uff0c\u8bf7\u5173\u95ed\u5e76\u91cd\u65b0\u6253\u5f00\u5e94\u7528";
    }
    if (progress.stage === "failed") {
      return progress.message
        ? `\u66f4\u65b0\u68c0\u67e5\u5931\u8d25\uff1a${progress.message}`
        : "\u66f4\u65b0\u68c0\u67e5\u5931\u8d25";
    }
    if (progress.stage === "disabled") {
      return "\u5f53\u524d\u672a\u914d\u7f6e\u70ed\u66f4\u5730\u5740";
    }
    return "\u5f53\u524d\u73af\u5883\u4e0d\u652f\u6301\u70ed\u66f4";
  }

  private formatHotUpdateDetail(progress: HotUpdateProgress): string {
    if (progress.stage === "downloading" && progress.total && progress.downloaded !== undefined) {
      return `\u6587\u4ef6 ${progress.downloaded}/${progress.total}  \u8fdc\u7a0b ${progress.remoteVersion}`;
    }

    const local = progress.localVersion || "unknown";
    const remote = progress.remoteVersion || "unknown";
    return `\u5f53\u524d ${local}  /  \u8fdc\u7a0b ${remote}`;
  }

  private paintProgressFill(percent: number): void {
    if (!this.hotUpdateProgressFill) {
      return;
    }

    const width = Math.max(0, Math.min(560, (560 * percent) / 100));
    const transform =
      this.hotUpdateProgressFill.getComponent(UITransform) ??
      this.hotUpdateProgressFill.addComponent(UITransform);
    transform.setContentSize(width, 16);
    this.hotUpdateProgressFill.setPosition(new Vec3(-280 + width / 2, 0, 0));
    this.paintRect(this.hotUpdateProgressFill, width, 16, new Color(82, 216, 162, 255));
  }

  private waitForHotUpdateFailureAction(message?: string): Promise<"retry" | "continue"> {
    this.renderHotUpdateProgress({
      stage: "failed",
      message,
      localVersion: "unknown",
      remoteVersion: "unknown",
      manifestUrl: "",
    });
    this.setHotUpdateActionButtonsVisible(true);
    return new Promise((resolve) => {
      this.hotUpdateFailureResolver = resolve;
    });
  }

  private async waitForHotUpdateCompletedAction(): Promise<boolean> {
    if (this.hotUpdateRetryButton) {
      this.hotUpdateRetryButton.node.active = false;
    }
    if (this.hotUpdateContinueButton) {
      this.hotUpdateContinueButton.node.active = true;
    }
    await new Promise<void>((resolve) => {
      this.hotUpdateFailureResolver = () => resolve();
    });
    this.hideHotUpdateGate();
    return true;
  }

  private setHotUpdateActionButtonsVisible(visible: boolean): void {
    if (this.hotUpdateRetryButton) {
      this.hotUpdateRetryButton.node.active = visible;
    }
    if (this.hotUpdateContinueButton) {
      this.hotUpdateContinueButton.node.active = visible;
    }
  }

  private onHotUpdateRetryClick = (): void => {
    this.setHotUpdateActionButtonsVisible(false);
    const resolver = this.hotUpdateFailureResolver;
    this.hotUpdateFailureResolver = null;
    resolver?.("retry");
  };

  private onHotUpdateContinueClick = (): void => {
    const resolver = this.hotUpdateFailureResolver;
    this.hotUpdateFailureResolver = null;
    resolver?.("continue");
  };

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private async restoreSessionIfNeeded(): Promise<void> {
    // 这里负责“断线重进 / 刷新后恢复”的入口判断，不是普通登录流程。
    const outcome = await this.authCoordinator.restoreSessionIfNeeded(this.handlePendingStatus);
    if (!outcome) {
      return;
    }

    this.setLoading(false);

    if (outcome.kind === "restoreSuccess") {
      this.resumableRole = outcome.resolvedRole;
      this.defaultAccount = loginAccountStore.getDefaultAccount();
      this.selectedAccount = this.defaultAccount;
      this.resumableUsername =
        appState.getCurrentUser()?.username ?? this.defaultAccount?.username ?? null;
      this.flowCoordinator.enterBrandEntry();
      this.setStatus(LOGIN_STATUS_STATES.idle);
      this.refreshResponsiveView();
      return;
    }

    this.resumableRole = null;
    this.resumableUsername = null;
    this.defaultAccount = loginAccountStore.getDefaultAccount();
    this.selectedAccount = this.defaultAccount;
    this.flowCoordinator.enterBrandEntry();
    this.refreshResponsiveView();
    this.applyAuthOutcome(outcome);
  }

  private async executeAuthFlow(
    action: () => Promise<LoginAuthOutcome | null>
  ): Promise<void> {
    this.clearResumableSession();
    const outcome = await action();
    if (!outcome) {
      return;
    }

    this.applyAuthOutcome(outcome);
  }

  private clearResumableSession(): void {
    this.resumableRole = null;
    this.resumableUsername = null;
  }

  private applyAuthOutcome(outcome: LoginAuthOutcome): void {
    devActionLogger.info("login.auth.outcome", {
      status: outcome.status.key,
      shouldNavigate: outcome.shouldNavigate,
      role: outcome.resolvedRole,
    });
    if (outcome.resolvedRole && !outcome.shouldNavigate) {
      this.enterAuthForm(outcome.resolvedRole, "login");
    }

    this.defaultAccount = loginAccountStore.getDefaultAccount();
    if (this.defaultAccount) {
      this.selectedAccount = this.defaultAccount;
    }
    this.setStatus(outcome.status);
    this.setLoading(false);

    if (outcome.shouldNavigate) {
      this.prepareSceneExit();
      sceneRouter.goToMain();
    }
  }

  private handlePendingStatus = (status: LoginStatusState): void => {
    devActionLogger.info("login.status.pending", status.key);
    this.setStatus(status);
    this.setLoading(true);
  };

  private onStartClick(): void {
    // 点击“开始”后，优先判断是否能直接复用上次会话；不行才进入账号入口或角色选择。
    if (
      this.resumableRole &&
      this.selectedAccount &&
      this.selectedAccount.username === this.resumableUsername
    ) {
      this.setStatus(LOGIN_STATUS_STATES.restoreSuccess);
      this.setLoading(true);
      this.prepareSceneExit();
      sceneRouter.goToMain();
      return;
    }

    if (this.selectedAccount) {
      this.prepareAuthFormForAccount(this.selectedAccount);
      this.enterAuthForm(this.selectedAccount.role, "login");
      return;
    }

    this.flowCoordinator.enterRoleSelect();
    this.refreshResponsiveView();
  }

  private onAccountEntryClick(): void {
    // 账号入口只是打开一个选择弹层，不会马上改登录状态。
    this.isAccountPickerOpen = true;
    this.refreshResponsiveView();
  }

  private onAccountPickerDismiss(): void {
    // 点空白区域就关闭弹层，避免遮住主登录页。
    this.isAccountPickerOpen = false;
    this.refreshResponsiveView();
  }

  private onDefaultAccountOptionClick(): void {
    // 切到默认账号时，要把上一轮输入的用户名 / 密码清空，避免串号。
    this.selectedAccount = this.defaultAccount;
    this.isAccountPickerOpen = false;
    this.resetAuthFormState();
    this.refreshResponsiveView();
  }

  private onOtherAccountOptionClick(): void {
    // “其他账号”就是回到空白登录态，适合手动输入新账号。
    this.selectedAccount = null;
    this.isAccountPickerOpen = false;
    this.resetAuthFormState();
    this.refreshResponsiveView();
  }

  private onBackClick(): void {
    // 返回键的规则：如果当前在表单页，就回到账号入口；如果还没进表单，就保持原状。
    const previousStep = this.flowCoordinator.getState().step;
    this.flowCoordinator.goBack();

    if (previousStep === "authForm") {
      this.resetAuthFormState();
    }

    this.isAccountPickerOpen = false;
    this.refreshResponsiveView();
  }

  private onChildRoleClick(): void {
    // 学生 / 家长只是入口角色不同，后面的账号表单逻辑是同一套。
    this.enterAuthForm("CHILD", "login");
  }

  private onParentRoleClick(): void {
    // 家长端复用同一个表单，只是最终提交到不同的角色分支。
    this.enterAuthForm("PARENT", "login");
  }
  private enterAuthForm(role: UserRole, mode: LoginFlowMode): void {
    // 进入表单页时，会同步决定“登录 / 注册”模式，并按模式切换确认密码框。
    const previousMode = this.flowCoordinator.getState().mode;
    if (mode === "register") {
      this.flowCoordinator.showRegisterForRole(role);
    } else {
      this.flowCoordinator.showLoginForRole(role);
    }

    if (previousMode !== mode && this.confirmPasswordInput) {
      this.confirmPasswordInput.string = "";
    }

    if (
      this.currentStatus.key === "restoreNoSession" ||
      this.currentStatus.key === "restoreFailure" ||
      previousMode !== mode
    ) {
      this.setStatus(LOGIN_STATUS_STATES.idle);
    }

    this.refreshResponsiveView();
  }

  private getCurrentRole(): UserRole {
    return this.flowCoordinator.getState().role ?? "CHILD";
  }

  private async handleRegisterAction(role: UserRole): Promise<void> {
    // 注册逻辑和登录逻辑分开：先检查表单是否完整，再走真正的提交请求。
    if (this.flowCoordinator.getState().mode === "login") {
      this.enterAuthForm(role, "register");
      return;
    }

    const validationStatus = this.validateRegisterForm();
    if (validationStatus) {
      devActionLogger.warn("login.register.formValidation", validationStatus.key);
      this.setStatus(validationStatus);
      this.setLoading(false);
      return;
    }

    await this.executeAuthFlow(() =>
      this.authCoordinator.register(
        this.usernameInput?.string.trim() ?? "",
        this.passwordInput?.string ?? "",
        role,
        this.handlePendingStatus
      )
    );
  }

  private ensureDevLogEntry(): void {
    const canvas = this.node.scene?.getChildByName("Canvas") ?? this.node;
    if (!canvas || this.devLogButton) {
      return;
    }

    const buttonNode = new Node("DevActionLogButton");
    buttonNode.parent = canvas;
    buttonNode.addComponent(UITransform).setContentSize(116, 44);
    this.paintRect(buttonNode, 116, 44, new Color(16, 42, 58, 230));

    const buttonLabelNode = new Node("Label");
    buttonLabelNode.parent = buttonNode;
    buttonLabelNode.addComponent(UITransform).setContentSize(116, 44);
    const buttonLabel = buttonLabelNode.addComponent(Label);
    buttonLabel.string = "日志";
    buttonLabel.fontSize = 22;
    buttonLabel.color = new Color(255, 250, 230, 255);
    buttonLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    buttonLabel.verticalAlign = Label.VerticalAlign.CENTER;

    this.devLogButton = buttonNode.addComponent(Button);
    this.devLogButton.node.on(Button.EventType.CLICK, this.toggleDevLogPanel, this);

    const panel = new Node("DevActionLogPanel");
    panel.parent = canvas;
    panel.active = false;
    panel.addComponent(UITransform).setContentSize(720, 360);
    this.paintRect(panel, 720, 360, new Color(8, 15, 24, 232));
    panel.on(Node.EventType.TOUCH_START, this.onDevLogTouchStart, this);
    panel.on(Node.EventType.TOUCH_MOVE, this.onDevLogTouchMove, this);

    const labelNode = new Node("Text");
    labelNode.parent = panel;
    labelNode.addComponent(UITransform).setContentSize(660, 214);
    labelNode.setPosition(new Vec3(0, 46, 0));
    this.devLogLabel = labelNode.addComponent(Label);
    this.devLogLabel.string = this.formatDevLogWindow();
    this.devLogLabel.fontSize = 12;
    this.devLogLabel.color = new Color(232, 246, 255, 255);
    this.devLogLabel.horizontalAlign = Label.HorizontalAlign.LEFT;
    this.devLogLabel.verticalAlign = Label.VerticalAlign.TOP;
    this.devLogLabel.overflow = Label.Overflow.CLAMP;

    const statusNode = new Node("Status");
    statusNode.parent = panel;
    statusNode.addComponent(UITransform).setContentSize(660, 28);
    statusNode.setPosition(new Vec3(0, -82, 0));
    this.devLogStatusLabel = statusNode.addComponent(Label);
    this.devLogStatusLabel.string = this.formatDevLogStatus("日志面板已就绪");
    this.devLogStatusLabel.fontSize = 13;
    this.devLogStatusLabel.color = new Color(160, 218, 184, 255);
    this.devLogStatusLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
    this.devLogStatusLabel.verticalAlign = Label.VerticalAlign.CENTER;
    this.devLogStatusLabel.overflow = Label.Overflow.SHRINK;

    this.clearHotUpdateButton = this.createDevPanelButton(
      panel,
      "清热更",
      new Vec3(-276, -140, 0),
      this.onClearHotUpdateClick
    );
    this.copyDevLogButton = this.createDevPanelButton(
      panel,
      "复制",
      new Vec3(-138, -140, 0),
      this.onCopyDevLogClick
    );
    this.retryHotUpdateButton = this.createDevPanelButton(
      panel,
      "查热更",
      new Vec3(138, -140, 0),
      this.onRetryHotUpdateClick
    );

    this.devLogPanel = panel;
    this.positionDevLogEntry();
    devActionLogger.info("devLog.entry.ready");
  }

  private toggleDevLogPanel(): void {
    this.isDevLogOpen = !this.isDevLogOpen;
    if (this.devLogPanel) {
      this.devLogPanel.active = this.isDevLogOpen;
    }
    devActionLogger.info("devLog.toggle", this.isDevLogOpen ? "open" : "close");
    this.refreshDevLogPanel(this.isDevLogOpen ? "日志已打开" : "日志已关闭");
  }

  private onCopyDevLogClick = async (): Promise<void> => {
    const copyResult = this.prepareDevLogClipboardText();
    const copiedToClipboard = await this.copyTextToClipboard(copyResult.text);
    devActionLogger.info("devLog.copy", copiedToClipboard ? "clipboard" : "localCache");
    const status = copiedToClipboard ? "已复制全部日志" : "已保存到本地缓存，系统剪贴板不可用";
    this.refreshDevLogPanel(copyResult.truncated ? `${status}，内容较大已截断` : status);
  };

  private onClearHotUpdateClick = (): void => {
    hotUpdateService.clearCache();
    this.devLogScrollOffset = 0;
    this.refreshDevLogPanel("已清理热更缓存，下次会重新检查更新");
  };

  private onRetryHotUpdateClick = async (): Promise<void> => {
    this.refreshDevLogPanel("正在检查热更...");
    await hotUpdateService.manualCheckAndUpdate();
    this.devLogScrollOffset = 0;
    this.refreshDevLogPanel("热更检查已完成，请看最新日志");
  };

  private onDevLogTouchStart = (event: EventTouch): void => {
    this.devLogTouchY = event.getUILocation().y;
    this.devLogTouchCarry = 0;
  };

  private onDevLogTouchMove = (event: EventTouch): void => {
    const nextY = event.getUILocation().y;
    const deltaY = nextY - this.devLogTouchY;
    this.devLogTouchY = nextY;
    this.devLogTouchCarry += deltaY;

    const lineStep = 30;
    if (Math.abs(this.devLogTouchCarry) < lineStep) {
      return;
    }

    const lines = Math.trunc(this.devLogTouchCarry / lineStep);
    this.devLogTouchCarry -= lines * lineStep;
    const maxOffset = Math.max(0, devActionLogger.getCount() - 8);
    this.devLogScrollOffset = Math.max(
      0,
      Math.min(maxOffset, this.devLogScrollOffset + lines)
    );
    this.refreshDevLogPanel("滑动查看日志");
  };

  private refreshDevLogPanel(status?: string): void {
    if (this.devLogLabel) {
      this.devLogLabel.string = this.formatDevLogWindow();
    }
    if (this.devLogStatusLabel) {
      this.devLogStatusLabel.string = this.formatDevLogStatus(status);
    }
  }

  private formatDevLogWindow(): string {
    return devActionLogger.formatRecent(8, this.devLogScrollOffset);
  }

  private formatDevLogStatus(status?: string): string {
    const count = devActionLogger.getCount();
    const start = count === 0 ? 0 : this.devLogScrollOffset + 1;
    const end = Math.min(count, this.devLogScrollOffset + 8);
    const prefix = status ? `${status}  ` : "";
    return `${prefix}${start}-${end}/${count} 条，最新在上`;
  }

  private createDevPanelButton(
    parent: Node,
    text: string,
    position: Vec3,
    handler: () => void | Promise<void>
  ): Button {
    const buttonNode = new Node(text);
    buttonNode.parent = parent;
    buttonNode.addComponent(UITransform).setContentSize(138, 38);
    buttonNode.setPosition(position);
    this.paintRect(buttonNode, 138, 38, new Color(24, 72, 92, 238));

    const labelNode = new Node("Label");
    labelNode.parent = buttonNode;
    labelNode.addComponent(UITransform).setContentSize(138, 38);
    const label = labelNode.addComponent(Label);
    label.string = text;
    label.fontSize = 18;
    label.color = new Color(255, 250, 230, 255);
    label.horizontalAlign = Label.HorizontalAlign.CENTER;
    label.verticalAlign = Label.VerticalAlign.CENTER;

    const button = buttonNode.addComponent(Button);
    button.node.on(Button.EventType.CLICK, handler, this);
    return button;
  }

  private async copyTextToClipboard(text: string): Promise<boolean> {
    try {
      sys.localStorage.setItem("buddy.dev.actionLog.copied", text);
    } catch {
      // Copy is a debug helper; storage failures should never affect login.
    }

    if (sys.isNative && sys.os === sys.OS.ANDROID) {
      const nativeCopyResult = this.copyTextToAndroidClipboard(text);
      if (nativeCopyResult.copied) {
        return true;
      }
      if (nativeCopyResult.reason) {
        devActionLogger.warn("devLog.copy.androidClipboard", nativeCopyResult.reason);
      }
    }

    const runtimeGlobal = globalThis as typeof globalThis & {
      navigator?: { clipboard?: { writeText?: (value: string) => Promise<void> } };
    };

    try {
      await runtimeGlobal.navigator?.clipboard?.writeText?.(text);
      return true;
    } catch {
      return false;
    }

    return false;
  }

  private prepareDevLogClipboardText(): { text: string; truncated: boolean } {
    const text = devActionLogger.formatAll();
    const maxLength = 30000;
    if (text.length <= maxLength) {
      return { text, truncated: false };
    }
    return { text: `${text.slice(0, maxLength)}\n...`, truncated: true };
  }

  private copyTextToAndroidClipboard(text: string): { copied: boolean; reason?: string } {
    type ReflectionBridge = {
      callStaticMethod?: (
        className: string,
        methodName: string,
        methodSignature: string,
        value: string
      ) => boolean;
    };
    const runtimeGlobal = globalThis as typeof globalThis & {
      jsb?: { reflection?: ReflectionBridge };
    };
    const nativeBridge = native as typeof native & {
      reflection?: ReflectionBridge;
    };
    const bridges = [
      { name: "native.reflection", bridge: nativeBridge.reflection },
      { name: "jsb.reflection", bridge: runtimeGlobal.jsb?.reflection },
    ];

    const errors: string[] = [];
    for (const { name, bridge } of bridges) {
      if (!bridge?.callStaticMethod) {
        errors.push(`${name}:missing`);
        continue;
      }
      try {
        bridge.callStaticMethod(
          "com/cocos/game/AppActivity",
          "copyLogToClipboard",
          "(Ljava/lang/String;)V",
          text
        );
        return { copied: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${name}:void:${message}`);
      }
      try {
        const copied = bridge.callStaticMethod(
          "com/cocos/game/AppActivity",
          "copyTextToClipboard",
          "(Ljava/lang/String;)Z",
          text
        );
        if (copied) {
          return { copied: true };
        }
        errors.push(`${name}:false`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push(`${name}:${message}`);
      }
    }

    return { copied: false, reason: errors.join(";") || "no reflection bridge" };
  }

  private positionDevLogEntry(): void {
    const visibleSize = view.getVisibleSize();
    this.devLogButton?.node.setPosition(
      new Vec3(
        visibleSize.width / 2 - 92,
        -visibleSize.height / 2 + 138 - DEV_LOG_BUTTON_VERTICAL_OFFSET,
        0
      )
    );
    this.devLogPanel?.setPosition(
      new Vec3(
        visibleSize.width / 2 - 410,
        -visibleSize.height / 2 + 338 - DEV_LOG_BUTTON_VERTICAL_OFFSET,
        0
      )
    );
    this.devLogButton?.node.setSiblingIndex(9999);
    this.devLogPanel?.setSiblingIndex(9999);
  }

  private positionHotUpdateGate(): void {
    if (!this.hotUpdateGate) {
      return;
    }

    const visibleSize = view.getVisibleSize();
    const width = visibleSize.width;
    const height = visibleSize.height;
    this.hotUpdateGate
      .getComponent(UITransform)
      ?.setContentSize(width, height);
    this.paintRect(this.hotUpdateGate, width, height, new Color(6, 14, 30, 216));
    this.hotUpdateGate.setPosition(new Vec3(0, 0, 0));
    this.hotUpdateGate.setSiblingIndex(10000);
  }

  private paintRect(node: Node, width: number, height: number, color: Color): void {
    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = color;
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();
  }

  private prepareAuthFormForAccount(account: LoginSavedAccount): void {
    // 选择某个已保存账号时，只预填用户名，不预填密码，避免误把旧密码带出来。
    if (this.usernameInput) {
      this.usernameInput.string = account.username;
    }

    if (this.passwordInput) {
      this.passwordInput.string = "";
    }

    if (this.confirmPasswordInput) {
      this.confirmPasswordInput.string = "";
    }
  }

  private formatRoleLabel(role: UserRole): string {
    return role === "PARENT" ? "家长" : "学生";
  }

  private validateRegisterForm(): LoginStatusState | null {
    const username = this.usernameInput?.string.trim() ?? "";
    const password = this.passwordInput?.string ?? "";
    const confirmPassword = this.confirmPasswordInput?.string ?? "";

    if (!username || !password || !confirmPassword) {
      return LOGIN_STATUS_STATES.registerMissingFields;
    }

    if (password !== confirmPassword) {
      return LOGIN_STATUS_STATES.registerPasswordMismatch;
    }

    return null;
  }

  private resetAuthFormState(): void {
    // 表单回收时，用户名、密码、确认密码都要一起清空，避免换账号后残留旧输入。
    if (this.usernameInput) {
      this.usernameInput.string = "";
    }

    if (this.passwordInput) {
      this.passwordInput.string = "";
    }

    if (this.confirmPasswordInput) {
      this.confirmPasswordInput.string = "";
    }

    this.setStatus(LOGIN_STATUS_STATES.idle);
    this.setLoading(false);
  }

  private prepareSceneExit(): void {
    // 真正跳转前先解绑窗口事件，避免旧场景还在响应尺寸变化。
    view.off("canvas-resize", this.handleCanvasResize, this);
    this.resolutionCoordinator.prepareSceneExit();
  }

  private setStatus(status: LoginStatusState): void {
    // 状态条是登录页的“结果提示区”，所有成功 / 失败 / 处理中信息都从这里刷新。
    this.currentStatus = status;
    renderLoginStatus(this.statusLabel, status, this.getToneColor(status.tone));
  }

  private getToneColor(tone: LoginStatusTone): Color {
    if (tone === "success") {
      return themeColor(LOGIN_THEME.status.success);
    }

    if (tone === "error") {
      return themeColor(LOGIN_THEME.status.error);
    }

    return themeColor(LOGIN_THEME.status.neutral);
  }

  private setLoading(loading: boolean): void {
    // loading 只负责视觉层的“忙碌态”，不直接决定流程是否成功。
    this.isLoading = loading;
    applyLoginLoadingState(this.getViewNodes(), loading);
  }
}
