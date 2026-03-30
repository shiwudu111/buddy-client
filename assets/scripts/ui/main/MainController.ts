import { _decorator, Component, Label, Node, UITransform } from "cc";
import { appState } from "../../app/AppState";

const { ccclass, property } = _decorator;

@ccclass("MainController")
export class MainController extends Component {
  @property(Label)
  titleLabel: Label | null = null;

  onLoad(): void {
    this.titleLabel ??= this.node.getComponentInChildren(Label);

    if (!this.titleLabel) {
      const titleNode = new Node("TitleLabel");
      titleNode.setParent(this.node);
      titleNode.setPosition(0, 240, 0);

      const transform = titleNode.addComponent(UITransform);
      transform.setContentSize(800, 80);

      this.titleLabel = titleNode.addComponent(Label);
      this.titleLabel.fontSize = 32;
      this.titleLabel.lineHeight = 40;
    }
  }

  start(): void {
    const user = appState.getCurrentUser();
    if (this.titleLabel) {
      this.titleLabel.string = user
        ? `Welcome back, ${user.username}`
        : "Welcome to Buddy Client";
    }
  }
}
