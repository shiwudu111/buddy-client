import { Button, Color, EditBox, Node } from "cc";
import type { PetCreationState } from "./PetCreationCoordinator";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

// 文件整体作用：
// 这是首次创建宠物流程的界面绘制函数。
// 它会根据当前步骤，动态画出说明页、命名页、提交中页、成功页。
//
// 一句话版本：
// 这段代码的核心意思就是：根据当前创建步骤，把首次创建宠物这几张界面一页一页画出来。
//
// 美术需要关注的重点：
// 1. PetCreationPanel 以及内部按钮、提示文字，都是运行时动态创建的。
// 2. 不同 step 下出现的节点并不一样，所以切步骤时旧节点会被整页重建。
export type PetCreationViewActions = {
  // 这些回调由上层控制器传入，界面点击后会通知控制器继续流程。
  onOpenNaming: () => void;
  onBackToIntro: () => void;
  onSubmitCreate: () => void | Promise<void>;
  onEnterPetHome: () => void;
};

export type PetCreationViewRefs = {
  // 只在命名页会把 nameInput 回传出去，其它页返回 null。
  nameInput: EditBox | null;
};

const PANEL_COLOR = new Color(24, 31, 43, 255);
const SUBTEXT_COLOR = new Color(190, 200, 216, 255);
const PRIMARY_ACTION_COLOR = new Color(76, 128, 255, 255);
const SECONDARY_ACTION_COLOR = new Color(93, 102, 122, 255);
const SUCCESS_TITLE_COLOR = new Color(121, 225, 167, 255);

export function renderPetCreationFlow(
  root: Node,
  state: PetCreationState,
  actions: PetCreationViewActions,
  context?: object
): PetCreationViewRefs {
  // 首次创建宠物是一个四步小流程：intro -> naming -> submitting -> success。
  // 这个函数只负责把“当前步骤该显示什么”渲染出来，不负责保存业务数据。
  const panel = RuntimeUI.createBox(root, {
    name: "PetCreationPanel",
    x: 0,
    y: 0,
    width: 980,
    height: 520,
    color: PANEL_COLOR,
  });

  RuntimeUI.createLabel(panel, {
    name: "PetCreationTitle",
    text: resolveTitle(state),
    x: 0,
    y: 205,
    width: 760,
    height: 42,
    fontSize: 30,
  });

  RuntimeUI.createLabel(panel, {
    name: "PetCreationSubtitle",
    text: resolveSubtitle(state),
    x: 0,
    y: 160,
    width: 760,
    height: 40,
    fontSize: 18,
    color: SUBTEXT_COLOR,
  });

  if (state.step === "intro") {
    // 第一页先讲清楚：这是学生端第一次创建宠物的入口，点按钮后才进入命名页。
    RuntimeUI.createLabel(panel, {
      name: "PetOnboardingBody",
      text:
        "\u8fd9\u662f\u5b66\u751f\u7aef\u9996\u6b21\u521b\u5efa\u5ba0\u7269\u5165\u53e3\u3002\n\n\u5b8c\u6210\u4e00\u6b21\u547d\u540d\u5e76\u521b\u5efa\u6210\u529f\u540e\uff0c\u4f60\u5c31\u4f1a\u8fdb\u5165\u6b63\u5f0f\u6210\u957f\u4e3b\u94fe\u8def\u3002",
      x: 0,
      y: 28,
      width: 540,
      height: 140,
      fontSize: 22,
      color: new Color(235, 240, 247, 255),
    });

    const startButton = RuntimeUI.createButton(panel, {
      name: "StartCreatePetButton",
      text: "\u5f00\u59cb\u521b\u5efa\u5ba0\u7269",
      x: 0,
      y: -150,
      width: 220,
      height: 56,
      color: PRIMARY_ACTION_COLOR,
      fontSize: 20,
    });
    startButton.button.node.on(Button.EventType.CLICK, actions.onOpenNaming, context);

    return { nameInput: null };
  }

  if (state.step === "naming") {
    // 命名页只做一件事：收集宠物名字。蛋型、稀有度、物种等内容这里都不展示。
    const preview = RuntimeUI.createBox(panel, {
      name: "PetNamingPreview",
      x: 0,
      y: 28,
      width: 360,
      height: 150,
      color: new Color(76, 128, 255, 210),
    });
    RuntimeUI.createLabel(preview, {
      name: "PetNamingTitle",
      text: "\u7b2c\u4e00\u53ea\u5ba0\u7269\u5373\u5c06\u52a0\u5165",
      x: 0,
      y: 28,
      width: 280,
      height: 34,
      fontSize: 26,
    });
    RuntimeUI.createLabel(preview, {
      name: "PetNamingDesc",
      text:
        "\u5f53\u524d MVP \u53ea\u51bb\u7ed3\u201c\u547d\u540d\u5e76\u521b\u5efa\u6210\u529f\u201d\uff0c\u4e0d\u5c55\u793a\u86cb\u578b\u3001\u7a00\u6709\u5ea6\u6216\u7269\u79cd\u7ed3\u679c\u3002",
      x: 0,
      y: -18,
      width: 300,
      height: 72,
      fontSize: 18,
      color: new Color(242, 246, 251, 255),
    });

    const nameInput = RuntimeUI.createEditBox(panel, {
      name: "PetNameInput",
      placeholder: "\u7ed9\u4f60\u7684\u5ba0\u7269\u8d77\u4e00\u4e2a\u540d\u5b57",
      x: 0,
      y: -88,
      width: 420,
      height: 60,
      defaultValue: state.petName,
      maxLength: 20,
    }).editBox;

    const backButton = RuntimeUI.createButton(panel, {
      name: "BackToIntroButton",
      text: "\u8fd4\u56de\u8bf4\u660e",
      x: -110,
      y: -185,
      width: 180,
      height: 54,
      color: SECONDARY_ACTION_COLOR,
      fontSize: 18,
    });
    backButton.button.node.on(Button.EventType.CLICK, actions.onBackToIntro, context);

    const submitButton = RuntimeUI.createButton(panel, {
      name: "SubmitCreatePetButton",
      text: "\u786e\u8ba4\u521b\u5efa",
      x: 110,
      y: -185,
      width: 180,
      height: 54,
      color: PRIMARY_ACTION_COLOR,
      fontSize: 18,
    });
    submitButton.button.node.on(
      Button.EventType.CLICK,
      () => void actions.onSubmitCreate(),
      context
    );

    return { nameInput };
  }

  if (state.step === "submitting") {
    // 提交中页面只负责告诉用户“请求已经发出”，避免重复点击和重复提交。
    const submittingCard = RuntimeUI.createBox(panel, {
      name: "PetSubmittingCard",
      x: 0,
      y: 0,
      width: 430,
      height: 250,
      color: new Color(76, 128, 255, 230),
    });
    RuntimeUI.createLabel(submittingCard, {
      name: "SubmittingTitle",
      text: "\u6b63\u5728\u521b\u5efa\u5ba0\u7269",
      x: 0,
      y: 48,
      width: 260,
      height: 40,
      fontSize: 30,
    });
    RuntimeUI.createLabel(submittingCard, {
      name: "SubmittingStatus",
      text: "\u8bf7\u6c42\u5df2\u53d1\u8d77\uff0c\u8bf7\u7a0d\u7b49",
      x: 0,
      y: -12,
      width: 300,
      height: 46,
      fontSize: 22,
    });
    RuntimeUI.createLabel(submittingCard, {
      name: "SubmittingHint",
      text: "\u521b\u5efa\u6210\u529f\u540e\u4f1a\u76f4\u63a5\u8fdb\u5165\u5b66\u751f\u7aef\u6210\u957f\u4e3b\u94fe\u8def\u3002",
      x: 0,
      y: -66,
      width: 320,
      height: 40,
      fontSize: 18,
      color: new Color(244, 247, 251, 220),
    });

    return { nameInput: null };
  }

  if (state.step === "success") {
    // 成功页是收口页：告诉用户创建完成，并把他带回学生主链路。
    const successCard = RuntimeUI.createBox(panel, {
      name: "PetSuccessCard",
      x: 0,
      y: 8,
      width: 460,
      height: 270,
      color: new Color(63, 171, 111, 224),
    });
    RuntimeUI.createLabel(successCard, {
      name: "SuccessTitle",
      text: "\u5ba0\u7269\u521b\u5efa\u6210\u529f",
      x: 0,
      y: 84,
      width: 260,
      height: 34,
      fontSize: 24,
      color: SUCCESS_TITLE_COLOR,
    });
    RuntimeUI.createLabel(successCard, {
      name: "SuccessName",
      text: state.petName || "\u65b0\u7684\u4f19\u4f34",
      x: 0,
      y: 34,
      width: 280,
      height: 42,
      fontSize: 32,
    });
    RuntimeUI.createLabel(successCard, {
      name: "SuccessDesc",
      text:
        "\u5df2\u5b8c\u6210\u9996\u6b21\u521b\u5efa\uff0c\u63a5\u4e0b\u6765\u53ef\u4ee5\u8fdb\u5165\u4e3b\u754c\u9762\u67e5\u770b\u5ba0\u7269\u72b6\u6001\u3001\u5582\u517b\u5ba0\u7269\u5e76\u7ee7\u7eed\u6210\u957f\u3002",
      x: 0,
      y: -18,
      width: 340,
      height: 64,
      fontSize: 18,
      color: new Color(243, 247, 252, 230),
    });

    const enterButton = RuntimeUI.createButton(panel, {
      name: "EnterPetHomeButton",
      text: "\u8fdb\u5165\u5ba0\u7269\u9875",
      x: 0,
      y: -190,
      width: 220,
      height: 56,
      color: PRIMARY_ACTION_COLOR,
      fontSize: 20,
    });
    enterButton.button.node.on(Button.EventType.CLICK, actions.onEnterPetHome, context);
  }

  return { nameInput: null };
}

function resolveTitle(state: PetCreationState): string {
  if (state.step === "success") {
    return "\u521b\u5efa\u5b8c\u6210";
  }

  if (state.step === "submitting") {
    return "\u63d0\u4ea4\u521b\u5efa\u8bf7\u6c42";
  }

  if (state.step === "naming") {
    return "\u7ed9\u4f60\u7684\u7b2c\u4e00\u53ea\u5ba0\u7269\u8d77\u4e2a\u540d\u5b57";
  }

  return "\u9996\u6b21\u521b\u5efa\u5ba0\u7269";
}

function resolveSubtitle(state: PetCreationState): string {
  if (state.step === "success") {
    return "\u5ba0\u7269\u5b9e\u4f53\u5df2\u521b\u5efa\u6210\u529f\uff0c\u53ef\u4ee5\u6b63\u5f0f\u8fdb\u5165\u5b66\u751f\u7aef\u6210\u957f\u4e3b\u94fe\u8def\u3002";
  }

  if (state.step === "submitting") {
    return "\u5f53\u524d\u6b63\u5f0f\u4e1a\u52a1\u7ed3\u679c\u53ea\u6709\u4e00\u4e2a\uff1a\u521b\u5efa\u5ba0\u7269\u6210\u529f\u3002";
  }

  if (state.step === "naming") {
    return "\u540d\u79f0\u4f1a\u76f4\u63a5\u4f5c\u4e3a\u5f53\u524d\u5ba0\u7269\u521b\u5efa\u63a5\u53e3\u7684\u6b63\u5f0f\u8f93\u5165\u3002";
  }

  return "\u65e0\u5ba0\u7269\u5b66\u751f\u8d26\u53f7\u9996\u6b21\u8fdb\u5165\u65f6\uff0c\u4f1a\u5148\u5b8c\u6210\u4e00\u6b21\u6b63\u5f0f\u5ba0\u7269\u521b\u5efa\uff0c\u518d\u8fdb\u5165\u6210\u957f\u94fe\u8def\u3002";
}
