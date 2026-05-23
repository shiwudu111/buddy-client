import {
  Color,
  HorizontalTextAlignment,
  Mask,
  Node,
  ScrollView,
  UITransform,
  Vec3,
} from "cc";
import type { DiaryDay } from "../../types/api";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

export function renderJournalPanelContent(options: {
  panel: Node;
  panelWidth: number;
  panelHeight: number;
  diaryDays: DiaryDay[];
  isLoading: boolean;
  isLoaded: boolean;
  syncMessage: string | null;
}): void {
  const { panel, panelWidth, panelHeight, diaryDays, isLoading, isLoaded, syncMessage } = options;
  if (isLoading && !diaryDays.length) {
    RuntimeUI.createLabel(panel, {
      name: "JournalLoadingText",
      text: "正在读取成长日记...",
      x: 0,
      y: -Math.round(panelHeight * 0.08),
      width: panelWidth - 48,
      height: Math.round(panelHeight * 0.34),
      fontSize: Math.max(14, Math.min(18, Math.round(panelWidth * 0.044))),
      color: new Color(151, 105, 76, 208),
    });
    return;
  }
  if (!diaryDays.length) {
    RuntimeUI.createLabel(panel, {
      name: "JournalEmptyText",
      text: syncMessage ?? (isLoaded ? "最近还没有成长记录" : "日记暂未同步，请稍后再试"),
      x: 0,
      y: -Math.round(panelHeight * 0.08),
      width: panelWidth - 48,
      height: Math.round(panelHeight * 0.34),
      fontSize: Math.max(14, Math.min(18, Math.round(panelWidth * 0.044))),
      color: new Color(151, 105, 76, 208),
    });
    return;
  }

  const scrollWidth = panelWidth - 44;
  const scrollHeight = Math.max(88, Math.round(panelHeight * 0.58));
  const scrollY = -Math.round(panelHeight * 0.04);
  const scrollArea = RuntimeUI.createBox(panel, {
    name: "JournalScrollArea",
    x: 0,
    y: scrollY,
    width: scrollWidth,
    height: scrollHeight,
    color: new Color(255, 244, 226, 68),
    radius: 16,
  });
  const mask = scrollArea.addComponent(Mask);
  mask.enabled = true;

  const scrollView = scrollArea.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  scrollView.brake = 0.35;
  scrollView.elastic = true;

  const content = new Node("JournalScrollContent");
  content.setParent(scrollArea);
  const contentTransform = content.addComponent(UITransform);
  const contentWidth = scrollWidth - 18;
  const dayHeaderHeight = 24;
  const entryHeight = 23;
  const dayBottomGap = 12;
  const contentPadding = 10;
  const totalHeight = Math.max(
    scrollHeight,
    contentPadding * 2 +
      diaryDays.reduce((sum, day) => {
        return sum + dayHeaderHeight + day.entries.length * entryHeight + dayBottomGap;
      }, 0)
  );
  contentTransform.setContentSize(contentWidth, totalHeight);

  let cursorY = totalHeight / 2 - contentPadding;
  diaryDays.forEach((day, dayIndex) => {
    RuntimeUI.createLabel(content, {
      name: `JournalDay${dayIndex}Title`,
      text: `${day.dateText}  ${day.summary}`,
      x: 0,
      y: cursorY - dayHeaderHeight / 2,
      width: contentWidth,
      height: 22,
      fontSize: Math.max(12, Math.min(16, Math.round(panelWidth * 0.038))),
      color: new Color(126, 68, 32, 228),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    cursorY -= dayHeaderHeight;
    day.entries.forEach((entry, entryIndex) => {
      RuntimeUI.createLabel(content, {
        name: `JournalDay${dayIndex}Entry${entryIndex}`,
        text: `${entry.timeText} ${entry.title}：${entry.detail}`,
        x: 0,
        y: cursorY - entryHeight / 2,
        width: contentWidth,
        height: 20,
        fontSize: Math.max(10, Math.min(14, Math.round(panelWidth * 0.032))),
        color: new Color(151, 105, 76, 208),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      cursorY -= entryHeight;
    });

    cursorY -= dayBottomGap;
  });
  content.setPosition(Vec3.ZERO);
  scrollView.content = content;
  scrollView.scheduleOnce(() => {
    if (scrollView.node.isValid) {
      scrollView.scrollToTop(0);
    }
  }, 0);

  const footerText = syncMessage ?? (totalHeight > scrollHeight ? "上下拖动查看最近 7 天全部记录" : "");
  if (footerText) {
    RuntimeUI.createLabel(panel, {
      name: "JournalFooterText",
      text: footerText,
      x: 0,
      y: -Math.round(panelHeight * 0.38),
      width: panelWidth - 60,
      height: 20,
      fontSize: Math.max(10, Math.min(13, Math.round(panelWidth * 0.03))),
      color: new Color(151, 105, 76, 188),
    });
  }
}
