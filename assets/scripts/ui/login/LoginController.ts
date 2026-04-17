import { _decorator, Button, Color, Component, EditBox, Node, view } from "cc";
import { appState } from "../../app/AppState";
import { sceneRouter } from "../../navigation/SceneRouter";
import { authService } from "../../services/AuthService";
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

  onLoad(): void {
    // 登录页加载时，先抓分辨率、节点引用、按钮事件，再刷新一次显示。
    this.resolutionCoordinator.capture();
    this.resolutionCoordinator.applyCurrentFrame();
    this.resolveSceneReferences();
    this.bindActionButtons();
    this.configureInputs();
    this.viewOrchestrator = new LoginViewOrchestrator(this.node);
    this.refreshResponsiveView();
    view.on("canvas-resize", this.handleCanvasResize, this);
  }

  onDestroy(): void {
    view.off("canvas-resize", this.handleCanvasResize, this);
    this.resolutionCoordinator.restore();
  }

  async start(): Promise<void> {
    // 登录页启动时先回到“恢复态”，再决定是继续上次会话还是展示默认入口。
    this.flowCoordinator.enterRestore();
    this.setLoading(false);
    this.setStatus(LOGIN_STATUS_STATES.idle);
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
    await this.handleRegisterAction("CHILD");
  }

  async onParentRegisterClick(): Promise<void> {
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
  }

  private handleCanvasResize(): void {
    if (this.resolutionCoordinator.shouldIgnoreResize()) {
      return;
    }

    this.resolutionCoordinator.applyCurrentFrame();
    this.refreshResponsiveView();
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
    const outcome = await action();
    if (!outcome) {
      return;
    }

    this.applyAuthOutcome(outcome);
  }

  private applyAuthOutcome(outcome: LoginAuthOutcome): void {
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
