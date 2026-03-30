import {
  _decorator,
  Component,
  director,
  EditBox,
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

  @property(Label)
  statusLabel: Label | null = null;

  @property(Node)
  loadingNode: Node | null = null;

  private isSubmitting = false;

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

  private setStatus(message: string): void {
    if (this.statusLabel) {
      this.statusLabel.string = message;
    }
  }

  private setLoading(loading: boolean): void {
    if (this.loadingNode) {
      this.loadingNode.active = loading;
    }
  }
}
