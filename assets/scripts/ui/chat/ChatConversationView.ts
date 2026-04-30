import {
  Button,
  Color,
  EditBox,
  HorizontalTextAlignment,
  Label,
  Mask,
  Node,
  ScrollView,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";
import type { ChatConversationItem } from "../../types/api";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

export type ChatConversationViewState = {
  messages: ChatConversationItem[];
  draft: string;
  notice: string;
  sending: boolean;
};

export type ChatConversationViewActions = {
  onSend: () => void | Promise<void>;
};

export type ChatConversationLayout = {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  historyHeight?: number;
  inputWidth?: number;
  inputHeight?: number;
  sendButtonWidth?: number;
  sendButtonHeight?: number;
};

export type ChatConversationViewRefs = {
  input: EditBox;
};

const PANEL_COLOR = new Color(255, 248, 241, 255);
const PANEL_INNER_COLOR = new Color(255, 252, 247, 175);
const HISTORY_BG_COLOR = new Color(249, 236, 223, 255);
const USER_BUBBLE_COLOR = new Color(126, 148, 240, 235);
const PET_BUBBLE_COLOR = new Color(247, 155, 52, 230);
const TITLE_COLOR = new Color(110, 74, 51, 255);
const NOTICE_COLOR = new Color(247, 155, 52, 255);
const HINT_COLOR = new Color(156, 123, 99, 255);
const COUNTER_WARNING_COLOR = new Color(238, 138, 56, 255);
const BUBBLE_TEXT_COLOR = new Color(255, 255, 255, 255);
const SEND_COLOR = new Color(49, 180, 113, 255);
const SENDING_COLOR = new Color(140, 119, 101, 255);
const INPUT_BG_COLOR = new Color(255, 246, 237, 255);
const CHAT_DRAFT_MAX_LENGTH = 140;
const CHAT_DRAFT_WARNING_THRESHOLD = 120;

export function renderPetChatPanel(
  root: Node,
  state: ChatConversationViewState,
  actions: ChatConversationViewActions,
  context?: object,
  layout: ChatConversationLayout = {}
): ChatConversationViewRefs {
  const panelWidth = layout.width ?? 470;
  const panelHeight = layout.height ?? 240;
  const historyHeight = layout.historyHeight ?? 116;
  const inputWidth = layout.inputWidth ?? 310;
  const inputHeight = layout.inputHeight ?? 56;
  const sendButtonWidth = layout.sendButtonWidth ?? 88;
  const sendButtonHeight = layout.sendButtonHeight ?? 32;
  const titleY = panelHeight / 2 - 24;
  const noticeY = titleY - 24;
  const historyY = panelHeight > 170 ? -2 : 10;
  const inputY = -panelHeight / 2 + inputHeight / 2 + 16;
  const gap = 14;
  const inputX = -(sendButtonWidth + gap) / 2;
  const sendX = inputX + inputWidth / 2 + gap + sendButtonWidth / 2;

  const panel = RuntimeUI.createBox(root, {
    name: "PetChatPanel",
    x: layout.x ?? -250,
    y: layout.y ?? -240,
    width: panelWidth,
    height: panelHeight,
    color: PANEL_COLOR,
    radius: 28,
  });
  RuntimeUI.createBox(panel, {
    name: "PetChatPanelInner",
    x: 0,
    y: 0,
    width: panelWidth - 24,
    height: panelHeight - 18,
    color: PANEL_INNER_COLOR,
    radius: 24,
  });
  RuntimeUI.createBox(panel, {
    name: "PetChatTitleIconWrap",
    x: -panelWidth / 2 + 36,
    y: titleY - 2,
    width: 30,
    height: 30,
    color: new Color(247, 232, 215, 255),
    radius: 12,
  });
  RuntimeUI.createLabel(panel, {
    name: "PetChatTitleIcon",
    text: "✦",
    x: -panelWidth / 2 + 36,
    y: titleY - 2,
    width: 16,
    height: 16,
    fontSize: 14,
    color: new Color(247, 155, 52, 255),
  });

  RuntimeUI.createLabel(panel, {
    name: "PetChatTitle",
    text: "宠物对话",
    x: -panelWidth / 2 + 110,
    y: titleY,
    width: 150,
    height: 24,
    fontSize: 18,
    horizontalAlign: HorizontalTextAlignment.LEFT,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(panel, {
    name: "PetChatNotice",
    text: state.notice || "输入一句话，宠物会在主页里回应你。",
    x: -panelWidth / 2 + 162,
    y: noticeY,
    width: Math.max(180, panelWidth - 260),
    height: 20,
    fontSize: 13,
    horizontalAlign: HorizontalTextAlignment.LEFT,
    color: state.notice ? NOTICE_COLOR : HINT_COLOR,
  });

  const counterLabel = RuntimeUI.createLabel(panel, {
    name: "PetChatCounter",
    text: formatDraftCounter(state.draft.length),
    x: panelWidth / 2 - 70,
    y: titleY,
    width: 110,
    height: 20,
    fontSize: 13,
    horizontalAlign: HorizontalTextAlignment.RIGHT,
    color: resolveDraftCounterColor(state.draft.length),
  });

  renderConversationHistory(panel, state.messages, panelWidth - 28, historyHeight, historyY);

  const inputRow = RuntimeUI.createEditBox(panel, {
    name: "PetChatInput",
    placeholder: "想对宠物说什么？例如：今天作业有点难",
    x: inputX,
    y: inputY,
    width: inputWidth,
    height: inputHeight,
    defaultValue: state.draft,
    maxLength: CHAT_DRAFT_MAX_LENGTH,
    multiline: true,
    radius: 18,
    backgroundColor: INPUT_BG_COLOR,
    textColor: TITLE_COLOR,
    placeholderColor: HINT_COLOR,
  });

  const sendButton = RuntimeUI.createButton(panel, {
    name: "PetChatSendButton",
    text: state.sending ? "发送中" : "发送",
    x: sendX,
    y: inputY,
    width: sendButtonWidth,
    height: sendButtonHeight,
    color: state.sending ? SENDING_COLOR : SEND_COLOR,
    fontSize: 15,
    radius: 18,
  });
  sendButton.button.node.on(Button.EventType.CLICK, () => void actions.onSend(), context);

  const updateDraftCounter = (): void => {
    const currentLength = inputRow.editBox.string.length;
    counterLabel.string = formatDraftCounter(currentLength);
    counterLabel.color = resolveDraftCounterColor(currentLength);
  };
  inputRow.editBox.node.on(EditBox.EventType.TEXT_CHANGED, updateDraftCounter, context);
  updateDraftCounter();

  return {
    input: inputRow.editBox,
  };
}

function renderConversationHistory(
  panel: Node,
  messages: ChatConversationItem[],
  historyWidth: number,
  historyHeight: number,
  historyY: number
): void {
  const historyArea = RuntimeUI.createBox(panel, {
    name: "PetChatHistoryArea",
    x: 0,
    y: historyY,
    width: historyWidth,
    height: historyHeight,
    color: HISTORY_BG_COLOR,
    radius: 20,
  });
  historyArea.setSiblingIndex(0);

  const mask = historyArea.addComponent(Mask);
  mask.enabled = true;

  const scrollView = historyArea.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  scrollView.brake = 0.35;
  scrollView.elastic = true;

  const padding = 8;
  const innerWidth = historyWidth - padding * 2;
  const content = new Node("PetChatHistoryContent");
  content.setParent(historyArea);
  const contentTransform = content.addComponent(UITransform);

  if (messages.length === 0) {
    const empty = RuntimeUI.createLabel(content, {
      name: "PetChatEmptyHint",
      text: "还没有开始聊天，先打个招呼吧。",
      x: 0,
      y: 0,
      width: innerWidth,
      height: 24,
      fontSize: 15,
      color: HINT_COLOR,
      horizontalAlign: HorizontalTextAlignment.CENTER,
      verticalAlign: VerticalTextAlignment.CENTER,
    });
    const emptyTransform = empty.node.getComponent(UITransform)!;
    contentTransform.setContentSize(innerWidth, Math.max(42, emptyTransform.height + padding * 2));
    empty.node.setPosition(new Vec3(0, 0, 0));
    scrollView.content = content;
    return;
  }

  const bubbles = messages.map((item) => {
    const text = formatConversationText(item);
    const bubbleWidth = Math.min(innerWidth - 10, item.role === "user" ? 292 : 300);
    const bubbleHeight = estimateBubbleHeight(text, bubbleWidth);
    return {
      item,
      text,
      bubbleWidth,
      bubbleHeight,
    };
  });

  const totalHeight =
    padding * 2 +
    bubbles.reduce((sum, bubble) => sum + bubble.bubbleHeight, 0) +
    Math.max(0, bubbles.length - 1) * 8;
  contentTransform.setContentSize(innerWidth, Math.max(42, totalHeight));

  let cursorY = totalHeight / 2 - padding;
  bubbles.forEach((bubble, index) => {
    const x =
      bubble.item.role === "user"
        ? innerWidth / 2 - bubble.bubbleWidth / 2
        : -innerWidth / 2 + bubble.bubbleWidth / 2;
    const bubbleNode = RuntimeUI.createBox(content, {
      name: `PetChatBubble${index}`,
      x,
      y: cursorY - bubble.bubbleHeight / 2,
      width: bubble.bubbleWidth,
      height: bubble.bubbleHeight,
      color: bubble.item.role === "user" ? USER_BUBBLE_COLOR : PET_BUBBLE_COLOR,
      radius: 20,
    });

    RuntimeUI.createLabel(bubbleNode, {
      name: `PetChatBubble${index}Text`,
      text: bubble.text,
      x: 0,
      y: 0,
      width: bubble.bubbleWidth - 18,
      height: bubble.bubbleHeight - 14,
      fontSize: 15,
      color: BUBBLE_TEXT_COLOR,
      horizontalAlign: HorizontalTextAlignment.LEFT,
      verticalAlign: VerticalTextAlignment.TOP,
    });
    const bubbleLabel = bubbleNode
      .getChildByName(`PetChatBubble${index}Text`)
      ?.getComponent(Label);
    if (bubbleLabel) {
      bubbleLabel.overflow = Label.Overflow.RESIZE_HEIGHT;
      bubbleLabel.enableWrapText = true;
    }

    cursorY -= bubble.bubbleHeight + 8;
  });

  content.setPosition(Vec3.ZERO);
  scrollView.content = content;
  scrollView.scheduleOnce(() => {
    if (scrollView.node.isValid) {
      scrollView.scrollToBottom(0);
    }
  }, 0);
}

function formatConversationText(item: ChatConversationItem): string {
  const prefix =
    item.role === "user" ? "我" : item.source === "fallback" ? "宠物（本地）" : "宠物";
  return `${prefix}：${item.content}`;
}

function formatDraftCounter(currentLength: number): string {
  return `字数 ${currentLength}/${CHAT_DRAFT_MAX_LENGTH}`;
}

function resolveDraftCounterColor(currentLength: number): Color {
  return currentLength >= CHAT_DRAFT_WARNING_THRESHOLD ? COUNTER_WARNING_COLOR : HINT_COLOR;
}

function estimateBubbleHeight(text: string, bubbleWidth: number): number {
  const fontSize = 15;
  const lines = text.split("\n").map((line) => line.trim());
  const charsPerLine = Math.max(8, Math.floor((bubbleWidth - 30) / (fontSize * 0.52)));
  const totalLines = lines.reduce((sum, line) => {
    return sum + Math.max(1, Math.ceil(Math.max(1, line.length) / charsPerLine));
  }, 0);
  return Math.max(56, Math.min(260, totalLines * 24 + 16));
}
