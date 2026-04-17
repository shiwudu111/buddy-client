import {
  Button,
  Color,
  EditBox,
  Label,
  HorizontalTextAlignment,
  Mask,
  Node,
  ScrollView,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";
import type { ChatConversationItem } from "../../types/api";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

// 文件整体作用：
// 这是学生端主界面里的“宠物对话”小面板。
// 它会画出聊天历史、输入框、发送按钮，以及顶部的提示文字。
//
// 一句话版本：
// 这段代码的核心意思就是：把左下角的宠物聊天框画出来，让学生能输入一句话、看到宠物气泡回复。
//
// 美术需要关注的重点：
// 1. 这个聊天面板是运行时动态生成的，不是场景里固定摆好的节点。
// 2. 聊天历史区域会滚动，消息多了以后只能靠滚动看完整内容。
// 3. 输入框和发送按钮的节点名固定，后续排查布局或接事件时要认这些名字。

export type ChatConversationViewState = {
  messages: ChatConversationItem[];
  draft: string;
  notice: string;
  sending: boolean;
};

export type ChatConversationViewActions = {
  onSend: () => void | Promise<void>;
};

export type ChatConversationViewRefs = {
  input: import("cc").EditBox;
};

const PANEL_COLOR = new Color(28, 35, 48, 255);
const HISTORY_BG_COLOR = new Color(20, 26, 37, 255);
const USER_BUBBLE_COLOR = new Color(65, 117, 255, 230);
const PET_BUBBLE_COLOR = new Color(54, 73, 93, 230);
const TITLE_COLOR = new Color(245, 247, 250, 255);
const NOTICE_COLOR = new Color(255, 210, 120, 255);
const HINT_COLOR = new Color(171, 183, 200, 255);
const COUNTER_WARNING_COLOR = new Color(255, 194, 107, 255);
const BUBBLE_TEXT_COLOR = new Color(255, 255, 255, 255);
const SEND_COLOR = new Color(49, 180, 113, 255);
const SENDING_COLOR = new Color(93, 102, 122, 255);
const CHAT_DRAFT_MAX_LENGTH = 140;
const CHAT_DRAFT_WARNING_THRESHOLD = 120;

export function renderPetChatPanel(
  root: Node,
  state: ChatConversationViewState,
  actions: ChatConversationViewActions,
  context?: object
): ChatConversationViewRefs {
  const panel = RuntimeUI.createBox(root, {
    name: "PetChatPanel",
    x: -250,
    y: -240,
    width: 470,
    height: 240,
    color: PANEL_COLOR,
  });

  RuntimeUI.createLabel(panel, {
    name: "PetChatTitle",
    text: "宠物对话",
    x: 0,
    y: 84,
    width: 220,
    height: 24,
    fontSize: 18,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(panel, {
    name: "PetChatNotice",
    text: state.notice || "输入一句话，宠物会气泡回复。",
    x: -135,
    y: 58,
    width: 250,
    height: 20,
    fontSize: 13,
    horizontalAlign: HorizontalTextAlignment.LEFT,
    color: state.notice ? NOTICE_COLOR : HINT_COLOR,
  });

  const counterLabel = RuntimeUI.createLabel(panel, {
    name: "PetChatCounter",
    text: formatDraftCounter(state.draft.length),
    x: 145,
    y: 58,
    width: 110,
    height: 20,
    fontSize: 13,
    horizontalAlign: HorizontalTextAlignment.RIGHT,
    color: resolveDraftCounterColor(state.draft.length),
  });

  renderConversationHistory(panel, state.messages);

  const inputRow = RuntimeUI.createEditBox(panel, {
    name: "PetChatInput",
    placeholder: "想对宠物说什么？例如：今天作业有点难",
    x: -70,
    y: -82,
    width: 310,
    height: 56,
    defaultValue: state.draft,
    maxLength: 140,
    multiline: true,
  });

  const sendButton = RuntimeUI.createButton(panel, {
    name: "PetChatSendButton",
    text: state.sending ? "发送中" : "发送",
    x: 150,
    y: -82,
    width: 88,
    height: 32,
    color: state.sending ? SENDING_COLOR : SEND_COLOR,
    fontSize: 15,
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

function renderConversationHistory(panel: Node, messages: ChatConversationItem[]): void {
  const historyArea = RuntimeUI.createBox(panel, {
    name: "PetChatHistoryArea",
    x: 0,
    y: -2,
    width: 428,
    height: 116,
    color: HISTORY_BG_COLOR,
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
  const innerWidth = 428 - padding * 2;
  const content = new Node("PetChatHistoryContent");
  content.setParent(historyArea);
  const contentTransform = content.addComponent(UITransform);

  const history = messages;
  if (history.length === 0) {
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

  const bubbles = history.map((item) => {
    const text = formatConversationText(item);
    const bubbleWidth = item.role === "user" ? 292 : 300;
    const bubbleHeight = estimateBubbleHeight(text, bubbleWidth);
    return {
      item,
      text,
      bubbleWidth,
      bubbleHeight,
    };
  });

  const totalHeight =
    padding * 2 + bubbles.reduce((sum, bubble) => sum + bubble.bubbleHeight, 0) + Math.max(0, bubbles.length - 1) * 8;
  contentTransform.setContentSize(innerWidth, Math.max(42, totalHeight));

  let cursorY = totalHeight / 2 - padding;
  bubbles.forEach((bubble, index) => {
    const x =
      bubble.item.role === "user"
        ? innerWidth / 2 - bubble.bubbleWidth / 2
        : -innerWidth / 2 + bubble.bubbleWidth / 2;
    const backgroundColor =
      bubble.item.role === "user" ? USER_BUBBLE_COLOR : PET_BUBBLE_COLOR;
    const bubbleNode = RuntimeUI.createBox(content, {
      name: `PetChatBubble${index}`,
      x,
      y: cursorY - bubble.bubbleHeight / 2,
      width: bubble.bubbleWidth,
      height: bubble.bubbleHeight,
      color: backgroundColor,
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
    const bubbleLabel = bubbleNode.getChildByName(`PetChatBubble${index}Text`)?.getComponent(Label);
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
    item.role === "user"
      ? "我"
      : item.source === "fallback"
      ? "宠物（本地）"
      : "宠物";
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
