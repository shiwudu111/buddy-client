import { _decorator, Button, Color, UITransform } from "cc";
import { sceneRouter } from "../../navigation/SceneRouter";
import { ScreenController } from "../common/base/ScreenController";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

const { ccclass } = _decorator;

@ccclass("HomeworkController")
export class HomeworkController extends ScreenController {
  start(): void {
    const root = this.ensureManagedRoot("HomeworkStandaloneRoot");
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(1280, 720);
    RuntimeUI.clear(root);

    RuntimeUI.createBox(root, {
      name: "HomeworkStandaloneCard",
      x: 0,
      y: 0,
      width: 700,
      height: 320,
      color: new Color(24, 31, 43, 255),
    });

    RuntimeUI.createLabel(root, {
      name: "HomeworkStandaloneTitle",
      text: "作业中心已并入 Main 场景",
      x: 0,
      y: 70,
      width: 520,
      height: 40,
      fontSize: 28,
    });

    RuntimeUI.createLabel(root, {
      name: "HomeworkStandaloneDesc",
      text: "当前客户端框架将作业提交、作业历史与宠物联动统一放入 Main 场景的“作业中心”页签，避免依赖额外场景资源。",
      x: 0,
      y: 0,
      width: 560,
      height: 100,
      fontSize: 20,
      color: new Color(186, 197, 212, 255),
    });

    const backButton = RuntimeUI.createButton(root, {
      name: "BackToMainButton",
      text: "返回 Main",
      x: 0,
      y: -90,
      width: 180,
      height: 52,
      color: new Color(76, 128, 255, 255),
      fontSize: 20,
    });
    backButton.button.node.on(
      Button.EventType.CLICK,
      () => sceneRouter.goToMain(),
      this
    );
  }
}
