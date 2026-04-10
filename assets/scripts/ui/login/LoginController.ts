import {
  _decorator,
  Button,
  Color,
  Component,
  EditBox,
  Label,
  Node,
  ResolutionPolicy,
  view,
} from "cc";
import { sceneRouter } from "../../navigation/SceneRouter";
import { authService } from "../../services/AuthService";
import { findLoginNode, findNodeInTree } from "./LoginSceneStructure";
import { LOGIN_THEME, themeColor } from "./LoginViewConfig";
import {
  LoginAuthCoordinator,
  LOGIN_STATUS_STATES,
  type LoginAuthOutcome,
  type LoginStatusState,
  type LoginStatusTone,
} from "./LoginAuthCoordinator";
import {
  LoginViewOrchestrator,
  type LoginViewNodes,
} from "./LoginViewOrchestrator";

const { ccclass, property } = _decorator;

const LOGIN_RESOLUTION_POLICY = ResolutionPolicy.NO_BORDER;

@ccclass("LoginController")
export class LoginController extends Component {
  @property(EditBox)
  usernameInput: EditBox | null = null;

  @property(EditBox)
  passwordInput: EditBox | null = null;

  @property(Node)
  statusLabel: Node | null = null;

  @property(Node)
  loadingNode: Node | null = null;

  private readonly authCoordinator = new LoginAuthCoordinator(authService);
  private loginButton: Button | null = null;
  private registerButton: Button | null = null;
  private viewOrchestrator: LoginViewOrchestrator | null = null;
  private currentStatus: LoginStatusState = LOGIN_STATUS_STATES.idle;
  private isRestoringResolution = false;
  private originalDesignWidth: number | null = null;
  private originalDesignHeight: number | null = null;
  private originalResolutionPolicy: ResolutionPolicy | number | null = null;

  onLoad(): void {
    this.captureDesignResolution();
    this.updateDesignResolution();
    this.resolveSceneReferences();
    this.bindActionButtons();
    this.configureInputs();
    this.viewOrchestrator = new LoginViewOrchestrator(this.node);
    this.refreshResponsiveView();
    view.on("canvas-resize", this.handleCanvasResize, this);
  }

  onDestroy(): void {
    view.off("canvas-resize", this.handleCanvasResize, this);
    this.restoreDesignResolution();
  }

  async start(): Promise<void> {
    this.setLoading(false);
    this.setStatus(LOGIN_STATUS_STATES.idle);
    await this.restoreSessionIfNeeded();
  }

  async onLoginClick(): Promise<void> {
    await this.executeAuthFlow(() =>
      this.authCoordinator.login(
        this.usernameInput?.string.trim() ?? "",
        this.passwordInput?.string ?? "",
        this.handlePendingStatus
      )
    );
  }

  async onRegisterClick(): Promise<void> {
    await this.executeAuthFlow(() =>
      this.authCoordinator.register(
        this.usernameInput?.string.trim() ?? "",
        this.passwordInput?.string ?? "",
        this.handlePendingStatus
      )
    );
  }

  onClearClick(): void {
    if (this.usernameInput) {
      this.usernameInput.string = "";
    }

    if (this.passwordInput) {
      this.passwordInput.string = "";
    }

    this.setStatus(LOGIN_STATUS_STATES.idle);
  }

  private resolveSceneReferences(): void {
    this.usernameInput ??= this.requireComponent("UsernameInput", EditBox);
    this.passwordInput ??= this.requireComponent("PasswordInput", EditBox);
    this.statusLabel ??= this.requireNode("StatusLabel");
    this.loadingNode ??= this.requireNode("LoadingNode");
    this.loginButton = this.requireComponent("LoginButton", Button);
    this.registerButton = this.requireComponent("RegisterButton", Button);
  }

  private bindActionButtons(): void {
    this.bindButton(this.loginButton, this.onLoginClick);
    this.bindButton(this.registerButton, this.onRegisterClick);
  }

  private bindButton(
    button: Button | null,
    handler: () => void | Promise<void>
  ): void {
    button?.node.off(Button.EventType.CLICK, handler, this);
    button?.node.on(Button.EventType.CLICK, handler, this);
  }

  private requireNode(name: string): Node {
    const node = findLoginNode(this.node, name);
    if (!node) {
      throw new Error(`[LoginController] Missing required node: ${name}`);
    }

    return node;
  }

  private requireComponent<T extends Component>(
    nodeName: string,
    componentType: new (...args: never[]) => T
  ): T {
    const node = this.requireNode(nodeName);
    const component = node.getComponent(componentType);
    if (!component) {
      throw new Error(`[LoginController] Missing required component on ${nodeName}`);
    }

    return component;
  }

  private configureInputs(): void {
    if (this.usernameInput) {
      this.usernameInput.maxLength = 64;
    }

    if (this.passwordInput) {
      this.passwordInput.maxLength = 64;
    }
  }

  private getViewNodes(): LoginViewNodes {
    return {
      usernameInput: this.usernameInput,
      passwordInput: this.passwordInput,
      statusLabel: this.statusLabel,
      loadingNode: this.loadingNode,
      loginButton: this.loginButton,
      registerButton: this.registerButton,
    };
  }

  private refreshResponsiveView(): void {
    this.viewOrchestrator?.refresh(
      {
        message: this.currentStatus.message,
        color: this.getToneColor(this.currentStatus.tone),
      },
      this.getViewNodes()
    );
  }

  private handleCanvasResize(): void {
    if (this.isRestoringResolution) {
      return;
    }

    this.updateDesignResolution();
    this.refreshResponsiveView();
  }

  private async restoreSessionIfNeeded(): Promise<void> {
    if (!this.authCoordinator.canRestoreSession()) {
      return;
    }

    await this.executeAuthFlow(() =>
      this.authCoordinator.restoreSessionIfNeeded(this.handlePendingStatus)
    );
  }

  private async executeAuthFlow(
    action: () => Promise<LoginAuthOutcome | null>
  ): Promise<void> {
    const outcome = await action();
    if (!outcome) {
      return;
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

  private updateDesignResolution(): void {
    const frameSize = view.getFrameSize();
    const isPortrait = frameSize.height > frameSize.width;
    const width = isPortrait ? 720 : 1280;
    const height = isPortrait ? 1280 : 720;
    view.setDesignResolutionSize(width, height, LOGIN_RESOLUTION_POLICY);
  }

  private captureDesignResolution(): void {
    if (this.originalDesignWidth !== null && this.originalDesignHeight !== null) {
      return;
    }

    const size = view.getDesignResolutionSize();
    this.originalDesignWidth = size.width;
    this.originalDesignHeight = size.height;
    this.originalResolutionPolicy = view.getResolutionPolicy();
  }

  private restoreDesignResolution(): void {
    if (
      this.originalDesignWidth === null ||
      this.originalDesignHeight === null ||
      this.originalResolutionPolicy === null
    ) {
      return;
    }

    view.setDesignResolutionSize(
      this.originalDesignWidth,
      this.originalDesignHeight,
      this.originalResolutionPolicy
    );
  }

  private prepareSceneExit(): void {
    this.isRestoringResolution = true;
    view.off("canvas-resize", this.handleCanvasResize, this);
    this.restoreDesignResolution();
  }

  private setStatus(status: LoginStatusState): void {
    this.currentStatus = status;

    if (!this.statusLabel) {
      return;
    }

    const color = this.getToneColor(status.tone);
    const statusText = findNodeInTree(this.statusLabel, "StatusText");
    const statusTextLabel = statusText?.getComponent(Label) ?? null;
    if (statusTextLabel) {
      statusTextLabel.string = status.message;
      statusTextLabel.color = color;
      return;
    }

    const label = this.statusLabel.getComponent(Label);
    if (label) {
      label.string = status.message;
      label.color = color;
      return;
    }

    const childLabel = this.statusLabel.getComponentInChildren(Label);
    if (childLabel) {
      childLabel.string = status.message;
      childLabel.color = color;
    }
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
    if (this.loadingNode) {
      this.loadingNode.active = loading;
    }

    if (this.loginButton) {
      this.loginButton.interactable = !loading;
    }

    if (this.registerButton) {
      this.registerButton.interactable = !loading;
    }

    if (this.usernameInput) {
      this.usernameInput.enabled = !loading;
    }

    if (this.passwordInput) {
      this.passwordInput.enabled = !loading;
    }
  }
}
