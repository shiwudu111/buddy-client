import {
  Button,
  Color,
  EditBox,
  HorizontalTextAlignment,
  Mask,
  Node,
  ScrollView,
  UITransform,
  VerticalTextAlignment,
  Vec3,
} from "cc";
import type { HomeworkSubject } from "../../types/api";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import {
  HOMEWORK_REWARD_SUBJECT_LABELS,
  HOMEWORK_REWARD_SUBJECTS,
  type HomeworkSubmitFeedback,
  type HomeworkUploadedImage,
} from "./HomeworkCenterCoordinator";

export type HomeworkCenterViewState = {
  selectedSubject: HomeworkSubject | null;
  noteDraft: string;
  historySummary: string;
  hint: string;
  hintIsWarning: boolean;
  uploadedImage: HomeworkUploadedImage | null;
  uploading: boolean;
  submitting: boolean;
  uploadError: string | null;
  submitError: string | null;
  rewardFeedback: HomeworkSubmitFeedback | null;
  devResetting: boolean;
  devResetMessage: string | null;
  layout?: HomeworkCenterLayoutTuning;
};

export type HomeworkCenterLayoutTuning = {
  workCardX: number;
  workCardY: number;
  workCardWidth: number;
  workCardHeight: number;
  rewardCardX: number;
  rewardCardY: number;
  rewardCardWidth: number;
  rewardCardHeight: number;
  panelAlpha: number;
  panelInnerAlpha: number;
  panelBorderWidth: number;
  panelRadius: number;
  panelGradientAlpha: number;
  panelGradientRange: number;
  panelGradientColorR: number;
  panelGradientColorG: number;
  panelGradientColorB: number;
};

const DEFAULT_LAYOUT: HomeworkCenterLayoutTuning = {
  workCardX: -290,
  workCardY: 0,
  workCardWidth: 600,
  workCardHeight: 500,
  rewardCardX: 292,
  rewardCardY: 0,
  rewardCardWidth: 500,
  rewardCardHeight: 500,
  panelAlpha: 236,
  panelInnerAlpha: 244,
  panelBorderWidth: 2,
  panelRadius: 24,
  panelGradientAlpha: 82,
  panelGradientRange: 0.72,
  panelGradientColorR: 255,
  panelGradientColorG: 252,
  panelGradientColorB: 247,
};

export type HomeworkCenterViewActions = {
  onSelectSubject: (subject: HomeworkSubject) => void;
  onUploadImage: () => void | Promise<void>;
  onRemoveImage: () => void;
  onSubmit: () => void | Promise<void>;
  onBackToOverview: () => void;
  onViewBag: () => void;
  onContinue: () => void;
  onDevResetToday: () => void | Promise<void>;
};

export type HomeworkCenterViewRefs = {
  noteInput: EditBox;
};

const PANEL_COLOR = new Color(235, 207, 180, 236);
const PANEL_INNER_COLOR = new Color(255, 252, 247, 244);
const TEXT_PRIMARY = new Color(126, 68, 32, 242);
const TEXT_SECONDARY = new Color(151, 105, 76, 220);
const TEXT_MUTED = new Color(151, 105, 76, 170);
const WARNING_TEXT = new Color(198, 111, 55, 238);
const BRAND = new Color(238, 145, 84, 236);
const MINT = new Color(114, 187, 130, 232);
const SOFT_BUTTON = new Color(190, 178, 164, 170);
const CHIP_ACTIVE = new Color(238, 145, 84, 230);
const CHIP_INACTIVE = new Color(255, 244, 226, 230);

const NOTE_PLACEHOLDER = "可以补充一句说明，例如：今天完成了数学口算 2 页";

export function renderHomeworkCenter(
  root: Node,
  state: HomeworkCenterViewState,
  actions: HomeworkCenterViewActions,
  context?: object
): HomeworkCenterViewRefs {
  const layout = state.layout ?? DEFAULT_LAYOUT;
  const workCard = createHomeworkPanel(root, {
    name: "HomeworkCard",
    gradientDirection: "left-to-right",
    x: layout.workCardX,
    y: layout.workCardY,
    width: layout.workCardWidth,
    height: layout.workCardHeight,
    borderAlpha: layout.panelAlpha,
    bodyAlpha: layout.panelInnerAlpha,
    borderWidth: layout.panelBorderWidth,
    radius: layout.panelRadius,
    gradientAlpha: layout.panelGradientAlpha,
    gradientRange: layout.panelGradientRange,
    gradientColor: new Color(
      layout.panelGradientColorR,
      layout.panelGradientColorG,
      layout.panelGradientColorB,
      255
    ),
  });

  const sideCard = createHomeworkPanel(root, {
    name: "HomeworkRewardCard",
    gradientDirection: "right-to-left",
    x: layout.rewardCardX,
    y: layout.rewardCardY,
    width: layout.rewardCardWidth,
    height: layout.rewardCardHeight,
    borderAlpha: layout.panelAlpha,
    bodyAlpha: layout.panelInnerAlpha,
    borderWidth: layout.panelBorderWidth,
    radius: layout.panelRadius,
    gradientAlpha: layout.panelGradientAlpha,
    gradientRange: layout.panelGradientRange,
    gradientColor: new Color(
      layout.panelGradientColorR,
      layout.panelGradientColorG,
      layout.panelGradientColorB,
      255
    ),
  });

  RuntimeUI.createLabel(workCard, {
    name: "HomeworkTitle",
    text: "提交学习任务",
    x: 0,
    y: 216,
    width: 430,
    height: 34,
    fontSize: 25,
    color: TEXT_PRIMARY,
  });
  RuntimeUI.createLabel(workCard, {
    name: "HomeworkSubtitle",
    text: "上传一张作业图片，完成后可获得新的口粮",
    x: 0,
    y: 184,
    width: 430,
    height: 24,
    fontSize: 15,
    color: TEXT_SECONDARY,
  });

  renderSubjectButtons(workCard, state, actions, context);
  renderUploadArea(workCard, state, actions, context);

  const noteInput = RuntimeUI.createEditBox(workCard, {
    name: "HomeworkNoteInput",
    placeholder: NOTE_PLACEHOLDER,
    x: 0,
    y: -24,
    width: 500,
    height: 92,
    defaultValue: state.noteDraft,
    maxLength: 160,
    multiline: true,
    radius: 18,
    backgroundColor: new Color(255, 244, 226, 226),
    textColor: TEXT_PRIMARY,
    placeholderColor: TEXT_MUTED,
  }).editBox;

  RuntimeUI.createLabel(workCard, {
    name: "HomeworkHint",
    text: state.uploadError ?? state.submitError ?? state.hint,
    x: 0,
    y: -116,
    width: 492,
    height: 28,
    fontSize: 14,
    color: state.uploadError || state.submitError || state.hintIsWarning ? WARNING_TEXT : TEXT_SECONDARY,
  });

  const submitDisabled = state.uploading || state.submitting;
  const submitButton = RuntimeUI.createButton(workCard, {
    name: "SubmitHomeworkButton",
    text: state.submitting ? "提交中" : state.uploading ? "上传中" : "提交作业",
    x: -92,
    y: -206,
    width: 158,
    height: 44,
    color: submitDisabled ? SOFT_BUTTON : BRAND,
    textColor: new Color(255, 255, 255, submitDisabled ? 190 : 255),
    fontSize: 17,
    radius: 22,
  });
  submitButton.button.transition = Button.Transition.NONE;
  submitButton.button.interactable = !submitDisabled;
  if (!submitDisabled) {
    submitButton.node.on(Button.EventType.CLICK, () => void actions.onSubmit(), context);
  }

  const backButton = RuntimeUI.createButton(workCard, {
    name: "BackOverviewButton",
    text: "返回主页",
    x: 94,
    y: -206,
    width: 150,
    height: 44,
    color: new Color(151, 105, 76, 148),
    fontSize: 17,
    radius: 22,
  });
  backButton.button.transition = Button.Transition.NONE;
  backButton.node.on(Button.EventType.CLICK, actions.onBackToOverview, context);

  renderRewardAndHistory(sideCard, state, actions, context);

  return {
    noteInput,
  };
}

function createHomeworkPanel(
  parent: Node,
  options: {
    name: string;
    gradientDirection: "left-to-right" | "right-to-left";
    x: number;
    y: number;
    width: number;
    height: number;
    borderAlpha: number;
    bodyAlpha: number;
    borderWidth: number;
    radius: number;
    gradientAlpha: number;
    gradientRange: number;
    gradientColor: Color;
  }
): Node {
  const node = new Node(options.name);
  node.setParent(parent);
  node.setPosition(options.x, options.y, 0);
  const transform = node.addComponent(UITransform);
  transform.setContentSize(options.width, options.height);

  RuntimeUI.createBox(node, {
    name: `${options.name}Body`,
    x: 0,
    y: 0,
    width: options.width,
    height: options.height,
    color: withAlpha(PANEL_INNER_COLOR, options.bodyAlpha),
    radius: options.radius,
  });
  createOpacityGradient(node, {
    name: `${options.name}OpacityGradient`,
    direction: options.gradientDirection,
    width: options.width,
    height: options.height,
    radius: options.radius,
    maxAlpha: options.gradientAlpha,
    range: options.gradientRange,
    color: options.gradientColor,
  });
  RuntimeUI.createCard(node, {
    name: `${options.name}Outline`,
    x: 0,
    y: 0,
    width: options.width + 2,
    height: options.height + 2,
    style: "shell",
    borderColor: withAlpha(PANEL_COLOR, options.borderAlpha),
    radius: options.radius + 1,
    lineWidth: options.borderWidth,
  });

  return node;
}

function createOpacityGradient(
  parent: Node,
  options: {
    name: string;
    direction: "left-to-right" | "right-to-left";
    width: number;
    height: number;
    radius: number;
    maxAlpha: number;
    range: number;
    color: Color;
  }
): void {
  const clip = RuntimeUI.createRoundedClip(parent, {
    name: options.name,
    x: 0,
    y: 0,
    width: options.width,
    height: options.height,
    radius: options.radius,
  });
  const steps = 48;
  const segmentWidth = Math.ceil(options.width / steps) + 1;
  const solidCoverage = Math.max(0, Math.min(0.92, options.range / 3));
  for (let index = 0; index < steps; index += 1) {
    const progress = steps <= 1 ? 1 : index / (steps - 1);
    const edgeDistance = options.direction === "left-to-right" ? progress : 1 - progress;
    const fadeDistance = Math.max(0.08, 1 - solidCoverage);
    const strength =
      edgeDistance <= solidCoverage
        ? 1
        : Math.max(0, 1 - (edgeDistance - solidCoverage) / fadeDistance);
    const alpha = Math.round(options.maxAlpha * strength);
    if (alpha <= 0) {
      continue;
    }
    const x = -options.width / 2 + segmentWidth / 2 + index * (options.width / steps);
    RuntimeUI.createBox(clip, {
      name: `${options.name}${index + 1}`,
      x,
      y: 0,
      width: segmentWidth,
      height: options.height,
      color: withAlpha(options.color, alpha),
      radius: 0,
    });
  }
}

function withAlpha(color: Color, alpha: number): Color {
  return new Color(color.r, color.g, color.b, Math.round(alpha));
}

function renderSubjectButtons(
  parent: Node,
  state: HomeworkCenterViewState,
  actions: HomeworkCenterViewActions,
  context?: object
): void {
  const startX = -198;
  HOMEWORK_REWARD_SUBJECTS.forEach((subject, index) => {
    const selected = state.selectedSubject === subject;
    const button = RuntimeUI.createButton(parent, {
      name: `${subject}Button`,
      text: HOMEWORK_REWARD_SUBJECT_LABELS[subject],
      x: startX + index * 132,
      y: 138,
      width: 108,
      height: 38,
      color: selected ? CHIP_ACTIVE : CHIP_INACTIVE,
      textColor: selected ? new Color(255, 255, 255, 255) : TEXT_PRIMARY,
      fontSize: 16,
      radius: 19,
    });
    button.button.transition = Button.Transition.NONE;
    button.node.on(Button.EventType.CLICK, () => actions.onSelectSubject(subject), context);
  });
}

function renderUploadArea(
  parent: Node,
  state: HomeworkCenterViewState,
  actions: HomeworkCenterViewActions,
  context?: object
): void {
  RuntimeUI.createCard(parent, {
    name: "HomeworkUploadArea",
    x: 0,
    y: 74,
    width: 500,
    height: 82,
    color: new Color(255, 244, 226, 222),
    innerColor: new Color(255, 252, 247, 168),
    radius: 18,
    borderThickness: 2,
    innerRadius: 16,
  });

  RuntimeUI.createLabel(parent, {
    name: "HomeworkUploadTitle",
    text: state.uploadedImage ? `已上传：${state.uploadedImage.fileName}` : "上传 1 张作业图片",
    x: -64,
    y: 90,
    width: 326,
    height: 24,
    fontSize: 15,
    color: TEXT_PRIMARY,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  RuntimeUI.createLabel(parent, {
    name: "HomeworkUploadDetail",
    text: state.uploadedImage ? "可以移除后重新选择" : "V1 只支持单张图片，不做裁剪或压缩",
    x: -64,
    y: 62,
    width: 326,
    height: 22,
    fontSize: 12,
    color: TEXT_MUTED,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });

  const uploadLocked = Boolean(state.rewardFeedback);
  const uploadDisabled = state.uploading || state.submitting || uploadLocked;
  const uploadButton = RuntimeUI.createButton(parent, {
    name: "HomeworkUploadButton",
    text: state.uploading
      ? "上传中"
      : uploadLocked
        ? "已提交"
        : state.uploadedImage
          ? "重选"
          : "选择图片",
    x: 174,
    y: 76,
    width: 112,
    height: 34,
    color: uploadDisabled ? SOFT_BUTTON : MINT,
    textColor: new Color(255, 255, 255, uploadDisabled ? 190 : 255),
    fontSize: 14,
    radius: 17,
  });
  uploadButton.button.transition = Button.Transition.NONE;
  uploadButton.button.interactable = !uploadDisabled;
  if (!uploadDisabled) {
    uploadButton.node.on(
      Button.EventType.CLICK,
      () => {
        if (state.uploadedImage) {
          actions.onRemoveImage();
          return;
        }
        void actions.onUploadImage();
      },
      context
    );
  }
}

function renderRewardAndHistory(
  parent: Node,
  state: HomeworkCenterViewState,
  actions: HomeworkCenterViewActions,
  context?: object
): void {
  RuntimeUI.createLabel(parent, {
    name: "RewardCardTitle",
    text: "奖励反馈",
    x: 0,
    y: 216,
    width: 360,
    height: 32,
    fontSize: 24,
    color: TEXT_PRIMARY,
  });

  const feedback = state.rewardFeedback;
  const feedbackY = 134;
  RuntimeUI.createCard(parent, {
    name: "RewardFeedbackPanel",
    x: 0,
    y: feedbackY,
    width: 408,
    height: 118,
    color: feedback?.rewardStatus === "granted"
      ? new Color(235, 214, 157, 210)
      : new Color(255, 244, 226, 190),
    innerColor: new Color(255, 252, 247, 166),
    radius: 18,
    borderThickness: 2,
    innerRadius: 16,
  });

  RuntimeUI.createLabel(parent, {
    name: "RewardFeedbackText",
    text: feedback?.message ?? "提交后会在这里看到质量与奖励结果。",
    x: 0,
    y: feedbackY + 16,
    width: 350,
    height: 62,
    fontSize: 15,
    color: feedback?.isWarning ? WARNING_TEXT : TEXT_PRIMARY,
  });
  RuntimeUI.createLabel(parent, {
    name: "RewardQualityText",
    text: feedback?.qualityLevel ? `质量结果：${formatQualityLevel(feedback.qualityLevel)}` : "质量结果由后端判断",
    x: 0,
    y: feedbackY - 32,
    width: 350,
    height: 22,
    fontSize: 12,
    color: TEXT_MUTED,
  });

  if (feedback) {
    const canViewBag = feedback.rewardStatus === "granted";
    const viewBagButton = RuntimeUI.createButton(parent, {
      name: "HomeworkViewBagButton",
      text: "查看背包",
      x: -88,
      y: 54,
      width: 132,
      height: 36,
      color: canViewBag ? BRAND : SOFT_BUTTON,
      textColor: new Color(255, 255, 255, canViewBag ? 255 : 180),
      fontSize: 14,
      radius: 18,
    });
    viewBagButton.button.transition = Button.Transition.NONE;
    viewBagButton.button.interactable = canViewBag;
    if (canViewBag) {
      viewBagButton.node.on(Button.EventType.CLICK, actions.onViewBag, context);
    }

    const continueButton = RuntimeUI.createButton(parent, {
      name: "HomeworkContinueButton",
      text: "继续提交",
      x: 88,
      y: 54,
      width: 132,
      height: 36,
      color: MINT,
      fontSize: 14,
      radius: 18,
    });
    continueButton.button.transition = Button.Transition.NONE;
    continueButton.node.on(Button.EventType.CLICK, actions.onContinue, context);
  }

  RuntimeUI.createLabel(parent, {
    name: "HistoryCardTitle",
    text: "最近作业",
    x: -54,
    y: -16,
    width: 212,
    height: 28,
    fontSize: 20,
    color: TEXT_PRIMARY,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  const devResetButton = RuntimeUI.createButton(parent, {
    name: "HomeworkDevResetTodayButton",
    text: state.devResetting ? "重置中" : "开发重置",
    x: 116,
    y: -16,
    width: 104,
    height: 28,
    color: state.devResetting ? SOFT_BUTTON : new Color(151, 105, 76, 132),
    textColor: new Color(255, 255, 255, state.devResetting ? 170 : 238),
    fontSize: 12,
    radius: 14,
  });
  devResetButton.button.transition = Button.Transition.NONE;
  devResetButton.button.interactable = !state.devResetting;
  if (!state.devResetting) {
    devResetButton.node.on(Button.EventType.CLICK, () => void actions.onDevResetToday(), context);
  }
  if (state.devResetMessage) {
    RuntimeUI.createLabel(parent, {
      name: "HomeworkDevResetMessage",
      text: state.devResetMessage,
      x: 0,
      y: -42,
      width: 390,
      height: 18,
      fontSize: 11,
      color: state.devResetMessage.includes("失败") || state.devResetMessage.includes("不可用")
        ? WARNING_TEXT
        : TEXT_MUTED,
    });
  }
  renderHistoryScroll(parent, state.historySummary);
}

function renderHistoryScroll(parent: Node, text: string): void {
  const scrollWidth = 408;
  const scrollHeight = 150;
  const padding = 12;
  const lineHeight = 19;
  const scrollArea = RuntimeUI.createBox(parent, {
    name: "HistoryCardContentScroll",
    x: 0,
    y: -130,
    width: scrollWidth,
    height: scrollHeight,
    color: new Color(255, 244, 226, 112),
    radius: 16,
  });

  scrollArea.addComponent(Mask);
  const scrollView = scrollArea.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  scrollView.brake = 0.35;
  scrollView.elastic = true;

  const lines = text.split(/\r?\n/);
  const contentWidth = scrollWidth - padding * 2;
  const contentHeight = Math.max(scrollHeight, padding * 2 + lines.length * lineHeight);
  const content = new Node("HistoryCardContent");
  content.setParent(scrollArea);
  const contentTransform = content.addComponent(UITransform);
  contentTransform.setContentSize(contentWidth, contentHeight);

  let cursorY = contentHeight / 2 - padding - lineHeight / 2;
  lines.forEach((line, index) => {
    RuntimeUI.createLabel(content, {
      name: `HistoryCardContentLine${index}`,
      text: line || " ",
      x: 0,
      y: cursorY,
      width: contentWidth,
      height: lineHeight,
      fontSize: 13,
      color: line.trim() ? TEXT_SECONDARY : TEXT_MUTED,
      horizontalAlign: HorizontalTextAlignment.LEFT,
      verticalAlign: VerticalTextAlignment.CENTER,
    });
    cursorY -= lineHeight;
  });

  content.setPosition(Vec3.ZERO);
  scrollView.content = content;
  scrollView.scheduleOnce(() => {
    if (scrollView.node.isValid) {
      scrollView.scrollToTop(0);
    }
  }, 0);
}

function formatQualityLevel(level: string): string {
  switch (level) {
    case "good":
      return "较完整";
    case "basic":
      return "有效";
    case "invalid":
      return "未通过";
    default:
      return level;
  }
}
