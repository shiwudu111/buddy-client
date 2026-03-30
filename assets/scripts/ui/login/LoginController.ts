import {
  _decorator,
  Button,
  Component,
  director,
  EditBox,
  find,
  Label,
  Node,
} from "cc";
import { appState } from "../../app/AppState";
import { apiClient } from "../../network/ApiClient";
import type { AuthUser } from "../../types/api";

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
  }

  start(): void {
    this.setLoading(false);
    this.setStatus("Enter username and password");
  }

  async onLoginClick(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const username = this.usernameInput?.string.trim() ?? "";
    const password = this.passwordInput?.string.trim() ?? "";

    if (!username || !password) {
      this.setStatus("Please fill in both fields");
      return;
    }

    this.isSubmitting = true;
    this.setLoading(true);
    this.setStatus("Signing in...");

    try {
      const result = await apiClient.login({ username, password });

      if (!result.success || !result.data) {
        this.setStatus(result.message ?? "Login failed");
        return;
      }

      appState.setCurrentUser(result.data.user as AuthUser);
      this.setStatus("Success. Opening main scene...");
      director.loadScene("Main");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Network error";
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

    this.setStatus("Enter username and password");
  }

  private findNode(name: string): Node | null {
    return find(name, this.node) ?? find(`Canvas/${name}`) ?? null;
  }

  private setStatus(message: string): void {
    if (!this.statusLabel) {
      return;
    }

    const label = this.statusLabel.getComponent(Label);
    if (label) {
      label.string = message;
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
  }
}
