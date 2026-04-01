import {
  _decorator,
  Button,
  Color,
  Component,
  EditBox,
  find,
  Label,
  Node,
} from "cc";
import { authService } from "../../services/AuthService";
import { sceneRouter } from "../../navigation/SceneRouter";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

const { ccclass, property } = _decorator;

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

  private loginButton: Button | null = null;
  private registerButton: Button | null = null;
  private isSubmitting = false;

  onLoad(): void {
    this.usernameInput ??=
      this.findNode("UsernameInput")?.getComponent(EditBox) ?? null;
    this.passwordInput ??=
      this.findNode("PasswordInput")?.getComponent(EditBox) ?? null;
    this.statusLabel ??= this.findNode("StatusLabel");
    this.loadingNode ??=
      this.findNode("LoadingNode") ?? this.findNode("LodingNode");

    const loginButtonNode = this.findNode("LoginButton");
    this.loginButton = loginButtonNode?.getComponent(Button) ?? null;
    this.loginButton?.node.off(Button.EventType.CLICK, this.onLoginClick, this);
    this.loginButton?.node.on(Button.EventType.CLICK, this.onLoginClick, this);

    const registerButtonNode =
      this.findNode("RegisterButton") ?? this.createRegisterButton();
    this.registerButton = registerButtonNode?.getComponent(Button) ?? null;
    this.registerButton?.node.off(
      Button.EventType.CLICK,
      this.onRegisterClick,
      this
    );
    this.registerButton?.node.on(
      Button.EventType.CLICK,
      this.onRegisterClick,
      this
    );
  }

  async start(): Promise<void> {
    this.setLoading(false);
    this.setStatus("请输入账号密码");

    const user = await authService.bootstrapSession();
    if (user) {
      this.setStatus("检测到已登录状态，正在进入主界面...");
      sceneRouter.goToMain();
    }
  }

  async onLoginClick(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const username = this.usernameInput?.string.trim() ?? "";
    const password = this.passwordInput?.string.trim() ?? "";

    if (!username || !password) {
      this.setStatus("请填写账号和密码");
      return;
    }

    this.isSubmitting = true;
    this.setLoading(true);
    this.setStatus("登录中...");

    try {
      const result = await authService.login(username, password);

      if (!result.success || !result.data) {
        this.setStatus(result.message ?? "登录失败");
        return;
      }

      this.setStatus("登录成功，正在进入主界面...");
      sceneRouter.goToMain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常";
      this.setStatus(message);
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }

  async onRegisterClick(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const username = this.usernameInput?.string.trim() ?? "";
    const password = this.passwordInput?.string.trim() ?? "";

    if (!username || !password) {
      this.setStatus("请先输入要注册的账号和密码");
      return;
    }

    if (username.length < 3 || password.length < 6) {
      this.setStatus("账号至少 3 位，密码至少 6 位");
      return;
    }

    this.isSubmitting = true;
    this.setLoading(true);
    this.setStatus("注册中...");

    try {
      const result = await authService.register(username, password);
      if (!result.success || !result.data) {
        this.setStatus(result.message ?? "注册失败");
        return;
      }

      this.setStatus("注册成功，正在进入主界面...");
      sceneRouter.goToMain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常";
      this.setStatus(message);
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }

  onClearClick(): void {
    if (this.usernameInput) {
      this.usernameInput.string = "";
    }

    if (this.passwordInput) {
      this.passwordInput.string = "";
    }

    this.setStatus("请输入账号密码");
  }

  private findNode(name: string): Node | null {
    return find(name, this.node) ?? find(`Canvas/${name}`) ?? null;
  }

  private createRegisterButton(): Node | null {
    const canvas = this.findNode("Canvas") ?? this.node;
    const button = RuntimeUI.createButton(canvas, {
      name: "RegisterButton",
      text: "注册并登录",
      x: 0,
      y: -40,
      width: 220,
      height: 56,
      color: new Color(49, 180, 113, 255),
      fontSize: 20,
    });
    return button.node;
  }

  private setStatus(message: string): void {
    if (!this.statusLabel) {
      return;
    }

    const label = this.statusLabel.getComponent(Label);
    if (label) {
      label.string = message;
      label.color = message.includes("成功")
        ? new Color(86, 205, 134, 255)
        : message.includes("失败") || message.includes("请")
        ? new Color(255, 125, 125, 255)
        : new Color(235, 239, 244, 255);
      return;
    }

    const editBox = this.statusLabel.getComponent(EditBox);
    if (editBox) {
      editBox.string = message;
      return;
    }

    const childLabel = this.statusLabel.getComponentInChildren(Label);
    if (childLabel) {
      childLabel.string = message;
    }
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
  }
}
