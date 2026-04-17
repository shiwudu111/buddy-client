import { _decorator } from "cc";
import { sceneRouter } from "../../navigation/SceneRouter";
import { ScreenController } from "../common/base/ScreenController";

// 文件整体作用：
// 这是旧版 Homework 场景的入口脚本。
// 现在正式作业界面已经并入 MainController，所以这里会直接跳回主界面。
//
// 一句话版本：
// 这段代码的核心意思就是：旧作业入口已经不用了，进来后直接跳回现在统一的主界面。
//
// 美术需要关注的重点：
// 1. 如果你看到单独 Homework 场景没承载完整内容，这是预期行为。
// 2. 现在真正需要关注的作业界面在 MainController + HomeworkCenterView。
const { ccclass } = _decorator;

@ccclass("HomeworkController")
export class HomeworkController extends ScreenController {
  start(): void {
    // 旧版作业入口现在只是一个跳转壳，真正的作业页面已经统一到 MainController 里。
    sceneRouter.goToMain();
  }
}
