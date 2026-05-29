import { Color, HorizontalTextAlignment, Mask, Node, ScrollView, UITransform, Vec3 } from "cc";
import type { ChildPetPayload, WeeklyReportPayload } from "../../../types/api";
import { RuntimeUI } from "../../common/runtime/RuntimeUI";
import { UiTokens } from "../../theme/UiTokens";
import { renderDottedDivider, renderPawTitleDecor } from "../MainDecorations";
import type { ParentColumnKey, ParentColumnRenderOptions } from "./ParentDashboardTypes";

export type ParentInsightRow = { kind: "title" | "body"; text: string };

export type ParentPetGrowthPanelState = {
  overviewData: ChildPetPayload | null;
  evolutionHint: string;
  formatPetStage(stage: string | undefined): string;
  installColumnClick(card: Node, column: ParentColumnKey): void;
};

export type ParentHomeworkPanelState = {
  reportData: WeeklyReportPayload | null;
  reportScores: Array<{ label: string; score: number }>;
  subjectBreakdown: Array<{ label: string; avg: number; count: number }>;
  installColumnClick(card: Node, column: ParentColumnKey): void;
};

export type ParentInsightPanelState = {
  rows: ParentInsightRow[];
  installColumnClick(card: Node, column: ParentColumnKey): void;
};

export function renderParentPetGrowthPanel(
  parent: Node,
  options: ParentColumnRenderOptions,
  state: ParentPetGrowthPanelState
): void {
  const pet = state.overviewData?.pet;
  const isCompact = options.width < 260;
  const titleFontSize = isCompact ? 17 : 20;
  const subtitleFontSize = isCompact ? 11 : 13;
  const titleLeft = isCompact ? 54 : 66;
  const titleWidth = options.width - titleLeft - 20;
  const titleX = -options.width / 2 + titleLeft + titleWidth / 2;
  const pawX = -options.width / 2 + (isCompact ? 34 : 42);
  const card = RuntimeUI.createCard(parent, {
    name: "ParentPetGrowthPanelV2",
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    color: UiTokens.colors.borderSoft,
    innerColor: UiTokens.colors.bgSecondary,
    radius: UiTokens.radii.cardMD,
    borderThickness: 2,
    innerRadius: 18,
  });
  state.installColumnClick(card, options.column);
  renderPawTitleDecor(card, {
    name: "ParentPetPanelPawV2",
    x: pawX,
    y: options.height / 2 - 34,
    mirrored: false,
    scale: isCompact ? 0.48 : 0.62,
  });
  renderDottedDivider(card, {
    name: "ParentPetPanelDividerV2",
    y: options.height / 2 - 78,
    width: options.width - 56,
    dotCount: 24,
  });
  RuntimeUI.createLabel(card, {
    name: "ParentPetPanelTitleV2",
    text: "宠物成长",
    x: titleX,
    y: options.height / 2 - 34,
    width: titleWidth,
    height: 28,
    fontSize: titleFontSize,
    color: UiTokens.colors.textPrimary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  RuntimeUI.createLabel(card, {
    name: "ParentPetPanelSubTitleV2",
    text: pet ? `${pet.name} · Lv.${pet.level} · ${state.formatPetStage(pet.stage)}` : "等待宠物数据同步",
    x: 0,
    y: options.height / 2 - 64,
    width: options.width - 44,
    height: 22,
    fontSize: subtitleFontSize,
    color: UiTokens.colors.textSecondary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });

  renderParentPetVisual(card, {
    x: 0,
    y: options.height / 2 - 154,
    size: Math.min(isCompact ? 82 : 110, Math.round(options.width * (isCompact ? 0.32 : 0.36))),
    name: pet?.name ?? "宠物",
    level: pet?.level ?? 1,
  });

  const barX = isCompact ? 14 : 8;
  const barWidth = Math.max(isCompact ? 82 : 112, options.width - (isCompact ? 96 : 120));
  const barStartY = Math.min(48, options.height / 2 - (isCompact ? 210 : 228));
  renderParentMetricBar(card, {
    name: "ParentPetHungerBarV2",
    label: "饥饿",
    value: pet?.hunger,
    x: barX,
    y: barStartY,
    width: barWidth,
    fillColor: UiTokens.colors.hunger,
  });
  renderParentMetricBar(card, {
    name: "ParentPetMoodBarV2",
    label: "心情",
    value: pet?.mood,
    x: barX,
    y: barStartY - 38,
    width: barWidth,
    fillColor: UiTokens.colors.mood,
  });
  renderParentMetricBar(card, {
    name: "ParentPetEnergyBarV2",
    label: "体力",
    value: pet?.energy ?? pet?.health,
    x: barX,
    y: barStartY - 76,
    width: barWidth,
    fillColor: UiTokens.colors.energy,
  });
  renderParentMetricBar(card, {
    name: "ParentPetCleanBarV2",
    label: "清洁",
    value: pet?.cleanliness,
    x: barX,
    y: barStartY - 114,
    width: barWidth,
    fillColor: UiTokens.colors.blue,
  });
  RuntimeUI.createLabel(card, {
    name: "ParentEvolutionHintV2",
    text: state.evolutionHint,
    x: 0,
    y: -options.height / 2 + 24,
    width: options.width - 38,
    height: 34,
    fontSize: isCompact ? 11 : 13,
    color: UiTokens.colors.brand,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
}

export function renderParentHomeworkPanel(
  parent: Node,
  options: ParentColumnRenderOptions,
  state: ParentHomeworkPanelState
): void {
  const report = state.reportData;
  const isCompact = options.width < 260;
  const titleFontSize = isCompact ? 17 : 20;
  const subtitleFontSize = isCompact ? 11 : 13;
  const titleLeft = isCompact ? 54 : 66;
  const titleWidth = options.width - titleLeft - 20;
  const titleX = -options.width / 2 + titleLeft + titleWidth / 2;
  const pawX = -options.width / 2 + (isCompact ? 34 : 42);
  const card = RuntimeUI.createCard(parent, {
    name: "ParentHomeworkAnalysisPanelV2",
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    color: UiTokens.colors.borderSoft,
    innerColor: UiTokens.colors.panel,
    radius: UiTokens.radii.cardMD,
    borderThickness: 2,
    innerRadius: 18,
  });
  state.installColumnClick(card, options.column);
  renderPawTitleDecor(card, {
    name: "ParentHomeworkPanelPawV2",
    x: pawX,
    y: options.height / 2 - 34,
    mirrored: false,
    scale: isCompact ? 0.48 : 0.62,
  });
  renderDottedDivider(card, {
    name: "ParentHomeworkPanelDividerV2",
    y: options.height / 2 - 78,
    width: options.width - 56,
    dotCount: 20,
  });
  RuntimeUI.createLabel(card, {
    name: "ParentHomeworkPanelTitleV2",
    text: "学习分析",
    x: titleX,
    y: options.height / 2 - 34,
    width: titleWidth,
    height: 28,
    fontSize: titleFontSize,
    color: UiTokens.colors.textPrimary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  RuntimeUI.createLabel(card, {
    name: "ParentHomeworkPanelSubV2",
    text: report ? `${report.week} · 平均分 ${Math.round(report.average_score)}` : "点击刷新同步本周报告",
    x: 0,
    y: options.height / 2 - 64,
    width: options.width - 44,
    height: 22,
    fontSize: subtitleFontSize,
    color: UiTokens.colors.textSecondary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  const chartY = options.height / 2 - 146;
  renderParentScoreTrend(card, {
    x: 0,
    y: chartY,
    width: options.width - (isCompact ? 42 : 64),
    height: isCompact ? 86 : 96,
  }, state.reportScores);
  renderParentSubjectBreakdown(card, {
    x: 0,
    y: -66,
    width: options.width - (isCompact ? 42 : 64),
    height: 142,
  }, state.subjectBreakdown);
}

export function renderParentInsightScroll(
  parent: Node,
  options: ParentColumnRenderOptions,
  state: ParentInsightPanelState
): void {
  const isCompact = options.width < 260;
  const titleFontSize = isCompact ? 17 : 20;
  const titleLeft = isCompact ? 54 : 66;
  const titleWidth = options.width - titleLeft - 20;
  const titleX = -options.width / 2 + titleLeft + titleWidth / 2;
  const pawX = -options.width / 2 + (isCompact ? 34 : 42);
  const shell = RuntimeUI.createCard(parent, {
    name: "ParentInsightShellV2",
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    color: UiTokens.colors.borderSoft,
    innerColor: new Color(255, 252, 247, 230),
    radius: UiTokens.radii.cardMD,
    borderThickness: 2,
    innerRadius: 18,
  });
  state.installColumnClick(shell, options.column);
  renderPawTitleDecor(shell, {
    name: "ParentInsightPawV2",
    x: pawX,
    y: options.height / 2 - 28,
    mirrored: false,
    scale: isCompact ? 0.48 : 0.62,
  });
  RuntimeUI.createLabel(shell, {
    name: "ParentInsightTitleV2",
    text: "成长洞察",
    x: titleX,
    y: options.height / 2 - 29,
    width: titleWidth,
    height: 24,
    fontSize: titleFontSize,
    color: UiTokens.colors.textPrimary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  renderDottedDivider(shell, {
    name: "ParentInsightDividerV2",
    y: options.height / 2 - 54,
    width: options.width - 52,
    dotCount: isCompact ? 12 : 18,
  });

  const scrollHeight = Math.max(72, options.height - 72);
  const scrollArea = RuntimeUI.createBox(shell, {
    name: "ParentInsightScrollAreaV2",
    x: 0,
    y: -options.height / 2 + 16 + scrollHeight / 2,
    width: options.width - (isCompact ? 20 : 28),
    height: scrollHeight,
    color: new Color(255, 244, 226, 96),
    radius: 16,
  });
  state.installColumnClick(scrollArea, options.column);
  const mask = scrollArea.addComponent(Mask);
  mask.enabled = true;
  const scrollView = scrollArea.addComponent(ScrollView);
  scrollView.horizontal = false;
  scrollView.vertical = true;
  scrollView.inertia = true;
  scrollView.brake = 0.35;
  scrollView.elastic = true;

  const content = new Node("ParentInsightScrollContentV2");
  content.setParent(scrollArea);
  const contentTransform = content.addComponent(UITransform);
  const rowHeight = 28;
  const contentPadding = 16;
  const contentHeight = Math.max(scrollHeight + 40, contentPadding * 2 + state.rows.length * rowHeight);
  const contentWidth = options.width - (isCompact ? 44 : 58);
  contentTransform.setContentSize(contentWidth, contentHeight);
  let cursorY = contentHeight / 2 - contentPadding;
  state.rows.forEach((row, index) => {
    const isTitle = row.kind === "title";
    RuntimeUI.createLabel(content, {
      name: `ParentInsightRow${index}`,
      text: row.text,
      x: 0,
      y: cursorY - rowHeight / 2,
      width: contentWidth,
      height: rowHeight,
      fontSize: isTitle ? (isCompact ? 13 : 15) : (isCompact ? 11 : 13),
      color: isTitle ? UiTokens.colors.textPrimary : UiTokens.colors.textSecondary,
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    cursorY -= rowHeight;
  });
  content.setPosition(Vec3.ZERO);
  scrollView.content = content;
}

function renderParentPetVisual(
  parent: Node,
  options: { x: number; y: number; size: number; name: string; level: number }
): void {
  RuntimeUI.createBox(parent, {
    name: "ParentPetVisualGlowV2",
    x: options.x,
    y: options.y - 6,
    width: options.size + 34,
    height: options.size + 34,
    color: new Color(255, 224, 164, 124),
    radius: Math.round((options.size + 34) / 2),
  });
  RuntimeUI.createBox(parent, {
    name: "ParentPetVisualBodyV2",
    x: options.x,
    y: options.y,
    width: options.size,
    height: options.size,
    color: UiTokens.colors.brand,
    radius: Math.round(options.size / 2),
  });
  RuntimeUI.createBox(parent, {
    name: "ParentPetVisualFaceV2",
    x: options.x,
    y: options.y - 8,
    width: Math.round(options.size * 0.62),
    height: Math.round(options.size * 0.46),
    color: new Color(255, 250, 231, 252),
    radius: Math.round(options.size * 0.23),
  });
  RuntimeUI.createBox(parent, {
    name: "ParentPetVisualEarLeftV2",
    x: options.x - Math.round(options.size * 0.28),
    y: options.y + Math.round(options.size * 0.32),
    width: Math.round(options.size * 0.25),
    height: Math.round(options.size * 0.25),
    color: new Color(238, 132, 72, 238),
    radius: Math.round(options.size * 0.08),
  });
  RuntimeUI.createBox(parent, {
    name: "ParentPetVisualEarRightV2",
    x: options.x + Math.round(options.size * 0.28),
    y: options.y + Math.round(options.size * 0.32),
    width: Math.round(options.size * 0.25),
    height: Math.round(options.size * 0.25),
    color: new Color(238, 132, 72, 238),
    radius: Math.round(options.size * 0.08),
  });
  RuntimeUI.createLabel(parent, {
    name: "ParentPetVisualNameV2",
    text: `${options.name} Lv.${options.level}`,
    x: options.x,
    y: options.y - options.size / 2 - 24,
    width: options.size + 92,
    height: 22,
    fontSize: 14,
    color: UiTokens.colors.textPrimary,
  });
}

function renderParentMetricBar(
  parent: Node,
  options: { name: string; label: string; value?: number; x: number; y: number; width: number; fillColor: Color }
): void {
  const percent = Math.max(0, Math.min(100, options.value ?? 0));
  RuntimeUI.createLabel(parent, {
    name: `${options.name}Label`,
    text: options.label,
    x: options.x - options.width / 2 - 30,
    y: options.y,
    width: 48,
    height: 20,
    fontSize: 13,
    color: UiTokens.colors.textSecondary,
    horizontalAlign: HorizontalTextAlignment.RIGHT,
  });
  RuntimeUI.createProgressBar(parent, {
    name: options.name,
    x: options.x + 18,
    y: options.y,
    width: options.width,
    height: 14,
    percent,
    trackColor: new Color(242, 226, 211, 255),
    fillColor: options.fillColor,
    radius: 8,
  });
  RuntimeUI.createLabel(parent, {
    name: `${options.name}Value`,
    text: options.value == null ? "-" : `${Math.round(options.value)}`,
    x: options.x + options.width / 2 + 48,
    y: options.y,
    width: 46,
    height: 20,
    fontSize: 13,
    color: UiTokens.colors.textSecondary,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
}

function renderParentScoreTrend(
  parent: Node,
  options: { x: number; y: number; width: number; height: number },
  scores: Array<{ label: string; score: number }>
): void {
  RuntimeUI.createBox(parent, {
    name: "ParentScoreTrendBgV2",
    x: options.x,
    y: options.y,
    width: options.width,
    height: options.height,
    color: new Color(255, 244, 226, 110),
    radius: 16,
  });
  if (!scores.length) {
    RuntimeUI.createLabel(parent, {
      name: "ParentScoreTrendEmptyV2",
      text: "暂无本周趋势\n刷新周报后展示分数变化",
      x: options.x,
      y: options.y,
      width: options.width - 24,
      height: 44,
      fontSize: 14,
      color: UiTokens.colors.textSecondary,
    });
    return;
  }
  const barGap = 14;
  const barWidth = Math.max(26, Math.round((options.width - 50 - barGap * (scores.length - 1)) / scores.length));
  scores.forEach((item, index) => {
    const height = Math.max(10, Math.round((options.height - 34) * Math.max(0, Math.min(100, item.score)) / 100));
    const x = options.x - options.width / 2 + 28 + barWidth / 2 + index * (barWidth + barGap);
    RuntimeUI.createBox(parent, {
      name: `ParentScoreTrendBar${index}`,
      x,
      y: options.y - options.height / 2 + 20 + height / 2,
      width: barWidth,
      height,
      color: item.score >= 80 ? UiTokens.colors.mint : UiTokens.colors.brand,
      radius: 8,
    });
    RuntimeUI.createLabel(parent, {
      name: `ParentScoreTrendLabel${index}`,
      text: item.label,
      x,
      y: options.y - options.height / 2 + 8,
      width: barWidth + 20,
      height: 16,
      fontSize: 11,
      color: UiTokens.colors.textSecondary,
    });
  });
}

function renderParentSubjectBreakdown(
  parent: Node,
  options: { x: number; y: number; width: number; height: number },
  subjects: Array<{ label: string; avg: number; count: number }>
): void {
  if (!subjects.length) {
    RuntimeUI.createLabel(parent, {
      name: "ParentSubjectBreakdownEmptyV2",
      text: "暂无科目拆解",
      x: options.x,
      y: options.y,
      width: options.width,
      height: 24,
      fontSize: 14,
      color: UiTokens.colors.textSecondary,
    });
    return;
  }
  subjects.slice(0, 3).forEach((item, index) => {
    const rowY = options.y + options.height / 2 - 18 - index * 31;
    RuntimeUI.createLabel(parent, {
      name: `ParentSubjectName${index}`,
      text: item.label,
      x: options.x - options.width / 2 + 38,
      y: rowY,
      width: 60,
      height: 20,
      fontSize: 13,
      color: UiTokens.colors.textPrimary,
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createProgressBar(parent, {
      name: `ParentSubjectAvg${index}`,
      x: options.x + 42,
      y: rowY,
      width: options.width - 134,
      height: 12,
      percent: item.avg,
      trackColor: new Color(242, 226, 211, 255),
      fillColor: item.avg >= 80 ? UiTokens.colors.mint : UiTokens.colors.brand,
      radius: 7,
    });
    RuntimeUI.createLabel(parent, {
      name: `ParentSubjectValue${index}`,
      text: `${Math.round(item.avg)}`,
      x: options.x + options.width / 2 - 26,
      y: rowY,
      width: 44,
      height: 20,
      fontSize: 13,
      color: UiTokens.colors.textPrimary,
    });
  });
}
