import { Button, Color, HorizontalTextAlignment, Node } from "cc";
import { RuntimeUI } from "../../common/runtime/RuntimeUI";
import { UiTokens } from "../../theme/UiTokens";
import { renderDottedDivider, renderPawTitleDecor } from "../MainDecorations";
import type {
  ParentDashboardCallbacks,
  ParentDashboardLayout,
  ParentDashboardPanelState,
} from "./ParentDashboardTypes";

export type RenderParentDashboardPanelOptions = {
  root: Node;
  layout: ParentDashboardLayout;
  state: ParentDashboardPanelState;
  callbacks: ParentDashboardCallbacks;
};

export function renderParentDashboardPanel(options: RenderParentDashboardPanelOptions): void {
  const { root, layout, state, callbacks } = options;
  const panelWidth = Math.max(760, Math.min(1040, Math.round(layout.viewportWidth * 0.84)));
  const panelHeight = Math.max(560, Math.min(700, Math.round(layout.viewportHeight * 0.9)));
  const user = state.user;
  const childLabel = user?.childNickname || user?.childId || "\u672a\u7ed1\u5b9a";
  const childDisplayName = callbacks.resolveChildDisplayName(childLabel);
  const childMetaText = callbacks.resolveChildMetaText(childLabel);
  const hasLinkedChild = Boolean(user?.childId || state.linkedChildId);
  const contentWidth = panelWidth - 64;
  const panel = RuntimeUI.createCard(root, {
    name: "ParentHomePanelV2",
    x: 0,
    y: 0,
    width: panelWidth,
    height: panelHeight,
    color: UiTokens.colors.borderSoft,
    innerColor: UiTokens.colors.panel,
    radius: UiTokens.radii.cardLG,
    borderThickness: 3,
    innerRadius: UiTokens.radii.cardMD,
  });

  const headerHeight = 72;
  const headerY = panelHeight / 2 - 24 - headerHeight / 2;
  renderParentDashboardHeader(panel, {
    contentWidth,
    headerHeight,
    headerY,
    childDisplayName,
    childMetaText,
    username: user?.username ?? "\u5bb6\u957f",
    hasLinkedChild,
    state,
    callbacks,
  });

  const noticeText = state.notice || (hasLinkedChild ? "\u6570\u636e\u4f1a\u5728\u5237\u65b0\u540e\u540c\u6b65\u5230\u6700\u65b0\u72b6\u6001\u3002" : "\u7ed1\u5b9a\u5b69\u5b50\u540e\u5c55\u793a\u5ba0\u7269\u6210\u957f\u548c\u5b66\u4e60\u8d8b\u52bf\u3002");
  RuntimeUI.createLabel(panel, {
    name: "ParentNoticeV2",
    text: noticeText,
    x: 0,
    y: headerY - headerHeight / 2 - 14,
    width: contentWidth - 36,
    height: 22,
    fontSize: 13,
    color: state.notice ? UiTokens.colors.brand : UiTokens.colors.textSecondary,
  });

  if (!hasLinkedChild) {
    callbacks.renderBindEmptyState(panel, contentWidth, panelHeight, headerY - 112);
    return;
  }

  const mainTop = headerY - headerHeight / 2 - 34;
  const mainBottom = -panelHeight / 2 + 32;
  const mainGap = 16;
  const mainPanelHeight = Math.max(330, mainTop - mainBottom);
  const mainY = mainBottom + mainPanelHeight / 2;
  const columns = callbacks.resolveColumnLayout(contentWidth, mainGap);
  callbacks.renderPetGrowthPanel(panel, {
    x: columns.pet.x,
    y: mainY,
    width: columns.pet.width,
    height: mainPanelHeight,
    column: "pet",
  });
  callbacks.renderInsightScroll(panel, {
    x: columns.insight.x,
    width: columns.insight.width,
    y: mainY,
    height: mainPanelHeight,
    column: "insight",
  });
  callbacks.renderHomeworkPanel(panel, {
    x: columns.homework.x,
    y: mainY,
    width: columns.homework.width,
    height: mainPanelHeight,
    column: "homework",
  });
}

function renderParentDashboardHeader(
  panel: Node,
  options: {
    contentWidth: number;
    headerHeight: number;
    headerY: number;
    childDisplayName: string;
    childMetaText: string;
    username: string;
    hasLinkedChild: boolean;
    state: ParentDashboardPanelState;
    callbacks: ParentDashboardCallbacks;
  }
): void {
  const header = RuntimeUI.createCard(panel, {
    name: "ParentDashboardHeaderV2",
    x: 0,
    y: options.headerY,
    width: options.contentWidth,
    height: options.headerHeight,
    color: new Color(247, 155, 52, 168),
    innerColor: new Color(255, 252, 247, 238),
    radius: UiTokens.radii.cardMD,
    borderThickness: 2,
    innerRadius: 19,
  });
  renderPawTitleDecor(header, {
    name: "ParentHeaderPawV2",
    x: -options.contentWidth / 2 + 118,
    y: 18,
    mirrored: false,
    scale: 0.58,
  });
  renderDottedDivider(header, {
    name: "ParentHeaderDividerV2",
    y: -24,
    width: options.contentWidth - 56,
    dotCount: 34,
  });
  RuntimeUI.createBox(header, {
    name: "ParentChildAvatarV2",
    x: -options.contentWidth / 2 + 54,
    y: 2,
    width: 48,
    height: 48,
    color: UiTokens.colors.brand,
    radius: 24,
  });
  RuntimeUI.createLabel(header, {
    name: "ParentChildAvatarTextV2",
    text: options.childDisplayName.slice(0, 1),
    x: -options.contentWidth / 2 + 54,
    y: 2,
    width: 46,
    height: 34,
    fontSize: 22,
    color: UiTokens.colors.textLight,
  });
  RuntimeUI.createLabel(panel, {
    name: "ParentHomeTitleV2",
    text: options.hasLinkedChild ? `${options.childDisplayName} \u7684\u6210\u957f\u9762\u677f` : "\u5bb6\u957f\u6210\u957f\u9762\u677f",
    x: -options.contentWidth / 2 + 226,
    y: options.headerY + 12,
    width: Math.round(options.contentWidth * 0.36),
    height: 28,
    fontSize: 21,
    color: UiTokens.colors.textPrimary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  RuntimeUI.createLabel(panel, {
    name: "ParentHomeSubtitleV2",
    text: `${options.username} · ${options.hasLinkedChild ? options.childMetaText : "\u8bf7\u5148\u7ed1\u5b9a\u5b69\u5b50\u8d26\u53f7"}`,
    x: -options.contentWidth / 2 + 226,
    y: options.headerY - 14,
    width: Math.round(options.contentWidth * 0.36),
    height: 24,
    fontSize: 13,
    color: UiTokens.colors.textSecondary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });

  options.callbacks.renderRingProgress(panel, {
    name: "ParentTodayProgressRingV2",
    x: options.contentWidth / 2 - 250,
    y: options.headerY,
    radius: 27,
    percent: options.state.completion.percent,
    title: "\u4eca\u65e5\u5b8c\u6210",
    value: `${options.state.completion.completed}/${options.state.completion.total}`,
  });
  RuntimeUI.createLabel(panel, {
    name: "ParentTodayHintV2",
    text: options.state.completion.total ? options.state.completion.summary : "\u7b49\u5f85\u4eca\u65e5\u4f5c\u4e1a\u6570\u636e",
    x: options.contentWidth / 2 - 162,
    y: options.headerY,
    width: 136,
    height: 34,
    fontSize: 13,
    color: UiTokens.colors.textSecondary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });

  const refreshButton = RuntimeUI.createButton(panel, {
    name: "ParentRefreshButtonV2",
    text: options.state.overviewLoading || options.state.reportLoading ? "\u540c\u6b65\u4e2d" : "\u5237\u65b0",
    x: options.contentWidth / 2 - 56,
    y: options.headerY + 14,
    width: 86,
    height: 28,
    color: UiTokens.colors.mint,
    fontSize: 14,
    radius: 16,
  });
  refreshButton.node.on(Button.EventType.CLICK, options.callbacks.onRefresh);
  const logoutButton = RuntimeUI.createButton(panel, {
    name: "ParentLogoutButtonV2",
    text: "\u9000\u51fa",
    x: options.contentWidth / 2 - 56,
    y: options.headerY - 18,
    width: 86,
    height: 28,
    color: new Color(156, 123, 99, 230),
    fontSize: 14,
    radius: 16,
  });
  logoutButton.node.on(Button.EventType.CLICK, options.callbacks.onLogout);
}
