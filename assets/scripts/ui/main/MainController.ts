import { _decorator, Component, Label } from "cc";
import { appState } from "../../app/AppState";

const { ccclass, property } = _decorator;

@ccclass("MainController")
export class MainController extends Component {
  @property(Label)
  titleLabel: Label | null = null;

  start(): void {
    const user = appState.getCurrentUser();
    if (this.titleLabel) {
      this.titleLabel.string = user
        ? `Welcome back, ${user.username}`
        : "Welcome to Buddy Client";
    }
  }
}
