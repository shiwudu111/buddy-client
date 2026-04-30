import { Button, Color, Node } from "cc";
import { storage } from "../../core/storage";
import type {
  PetEvolutionPayload,
  PetGrowthFeedback,
  PetStatus,
} from "../../types/api";
import { resolveLayoutMetrics, type LayoutMetrics } from "../layout/LayoutMetrics";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import { UiTokens } from "../theme/UiTokens";

export type PetGrowthViewActions = {
  onRefresh: () => void | Promise<void>;
  onBackToOverview: () => void;
  onPreviewModeChange: () => void;
};

export type PetGrowthViewState = {
  pet: PetStatus | null;
  evolution: PetEvolutionPayload | null;
  evolutionError?: string;
  recentFeedback: PetGrowthFeedback | null;
};

const PANEL_COLOR = UiTokens.colors.panel;
const SECTION_BG_COLOR = new Color(255, 246, 237, 255);
const TITLE_COLOR = UiTokens.colors.textPrimary;
const SUBTEXT_COLOR = UiTokens.colors.textSecondary;
const READY_COLOR = new Color(124, 214, 153, 255);
const WAIT_COLOR = UiTokens.colors.gold;
const MUTED_COLOR = UiTokens.colors.textSecondary;
const PRIMARY_ACTION_COLOR = UiTokens.colors.brand;
const SECONDARY_ACTION_COLOR = new Color(205, 189, 171, 255);
const PREVIEW_MODE_KEY = "buddy.dev.petGrowthPreviewMode";

type PreviewMode = "real" | "stage1" | "stage2" | "unknown" | "countdown";

type GrowthPanelLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
  titleY: number;
  subtitleY: number;
  sectionY: number;
  sectionHeight: number;
  feedbackTitleY: number;
  feedbackSectionY: number;
  feedbackSectionHeight: number;
  footerY: number;
  previewTitleY: number;
  previewTabY: number;
  previewTabHeight: number;
};

type GrowthPageLayout = {
  shellWidth: number;
  shellHeight: number;
  compact: boolean;
  growthCard: GrowthPanelLayout;
  evolutionCard: GrowthPanelLayout;
};

function resolveGrowthLayout(metrics?: LayoutMetrics): GrowthPageLayout {
  const base = metrics ?? resolveLayoutMetrics(1280, 720);
  const compact = base.deviceClass === "compact";
  const shellWidth = Math.max(
    compact ? 760 : 980,
    Math.min(base.safeWidth - (compact ? 18 : 28), compact ? 860 : base.deviceClass === "regular" ? 1080 : 1160)
  );
  const shellHeight = Math.max(
    compact ? 640 : 620,
    Math.min(base.safeHeight - (compact ? 18 : 28), compact ? 720 : 680)
  );
  const cardGap = compact ? 14 : 20;
  const cardWidth = compact ? shellWidth - 48 : Math.floor((shellWidth - 48 - cardGap) / 2);
  const leftX = compact ? 0 : -(cardWidth / 2 + cardGap / 2);
  const rightX = compact ? 0 : cardWidth / 2 + cardGap / 2;
  const growthHeight = compact ? 292 : 470;
  const evolutionHeight = compact ? 318 : 470;

  return {
    shellWidth,
    shellHeight,
    compact,
    growthCard: {
      x: leftX,
      y: compact ? 112 : 0,
      width: compact ? shellWidth - 48 : cardWidth,
      height: growthHeight,
      titleY: compact ? 98 : 176,
      subtitleY: compact ? 70 : 144,
      sectionY: compact ? 18 : 42,
      sectionHeight: compact ? 100 : 170,
      feedbackTitleY: compact ? -28 : -54,
      feedbackSectionY: compact ? -106 : -148,
      feedbackSectionHeight: compact ? 82 : 110,
      footerY: compact ? -172 : -188,
      previewTitleY: compact ? -142 : -200,
      previewTabY: compact ? -168 : -220,
      previewTabHeight: compact ? 34 : 24,
    },
    evolutionCard: {
      x: rightX,
      y: compact ? -164 : 0,
      width: compact ? shellWidth - 48 : cardWidth,
      height: evolutionHeight,
      titleY: compact ? 108 : 176,
      subtitleY: compact ? 80 : 144,
      sectionY: compact ? 38 : 2,
      sectionHeight: compact ? 156 : 252,
      feedbackTitleY: 0,
      feedbackSectionY: 0,
      feedbackSectionHeight: 0,
      footerY: compact ? -168 : -188,
      previewTitleY: 0,
      previewTabY: 0,
      previewTabHeight: 0,
    },
  };
}

export function renderPetGrowthView(
  root: Node,
  state: PetGrowthViewState,
  actions: PetGrowthViewActions,
  context?: object,
  metrics?: LayoutMetrics
): void {
  const previewMode = getPreviewMode();
  const displayPet = previewMode === "real" ? state.pet : resolvePreviewPet(state.pet, previewMode);
  const displayEvolution =
    previewMode === "real" ? state.evolution : synthesizeEvolutionFromPet(displayPet);
  const isPreviewMode = previewMode !== "real";

  const layout = resolveGrowthLayout(metrics);

  const shell = RuntimeUI.createCard(root, {
    name: "PetGrowthShell",
    x: 0,
    y: 0,
    width: layout.shellWidth,
    height: layout.shellHeight,
    color: PANEL_COLOR,
    innerColor: new Color(255, 252, 247, 180),
    borderColor: UiTokens.colors.borderSoft,
    radius: 34,
  });

  RuntimeUI.createBox(shell, {
    name: "PetGrowthShellGlowLeft",
    x: -Math.round(layout.shellWidth / 2) + 96,
    y: Math.round(layout.shellHeight / 2) - 92,
    width: 150,
    height: 150,
    color: new Color(255, 230, 190, 110),
    radius: 75,
  });
  RuntimeUI.createBox(shell, {
    name: "PetGrowthShellGlowRight",
    x: Math.round(layout.shellWidth / 2) - 110,
    y: -Math.round(layout.shellHeight / 2) + 100,
    width: 180,
    height: 180,
    color: new Color(255, 217, 203, 96),
    radius: 90,
  });

  RuntimeUI.createPanelHeader(shell, {
    name: "PetGrowthPageHeader",
    title: "宠物成长",
    subtitle: "查看当前阶段、进化条件和最近反馈",
    icon: "✦",
    x: 0,
    y: Math.round(layout.shellHeight / 2) - 42,
    width: Math.max(320, layout.shellWidth - 180),
    height: 54,
    titleFontSize: 24,
    subtitleFontSize: 13,
    titleColor: TITLE_COLOR,
    subtitleColor: SUBTEXT_COLOR,
    iconColor: WAIT_COLOR,
  });

  const growthCard = RuntimeUI.createCard(shell, {
    name: "PetGrowthCard",
    x: layout.growthCard.x,
    y: layout.growthCard.y,
    width: layout.growthCard.width,
    height: layout.growthCard.height,
    color: new Color(255, 249, 241, 255),
    innerColor: new Color(255, 255, 255, 112),
    borderColor: UiTokens.colors.borderSoft,
    radius: 28,
  });

  const evolutionCard = RuntimeUI.createCard(shell, {
    name: "PetEvolutionCard",
    x: layout.evolutionCard.x,
    y: layout.evolutionCard.y,
    width: layout.evolutionCard.width,
    height: layout.evolutionCard.height,
    color: new Color(255, 249, 241, 255),
    innerColor: new Color(255, 255, 255, 112),
    borderColor: UiTokens.colors.borderSoft,
    radius: 28,
  });

  renderGrowthSummaryResponsive(growthCard, displayPet, layout);
  renderRecentFeedbackResponsive(growthCard, state.recentFeedback, layout);
  if (isPreviewMode) {
    renderPreviewModeControlsResponsive(growthCard, previewMode, actions, context, layout);
  }

  renderEvolutionSummaryResponsive(
    evolutionCard,
    displayPet,
    displayEvolution,
    state.evolutionError,
    isPreviewMode,
    layout
  );
  renderFooterActionsResponsive(evolutionCard, actions, context, layout);
}

function renderGrowthSummary(card: Node, pet: PetStatus | null): void {
  RuntimeUI.createLabel(card, {
    name: "GrowthTitle",
    text: "宠物成长状态",
    x: 0,
    y: 176,
    width: 360,
    height: 34,
    fontSize: 24,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthSubtitle",
    text: pet ? "这里会展示当前成长阶段、状态和经验。" : "先创建宠物，再查看成长信息。",
    x: 0,
    y: 144,
    width: 420,
    height: 28,
    fontSize: 16,
    color: SUBTEXT_COLOR,
  });

  const summarySection = RuntimeUI.createBox(card, {
    name: "GrowthSummarySection",
    x: 0,
    y: 42,
    width: 450,
    height: 170,
    color: SECTION_BG_COLOR,
  });

  if (!pet) {
    RuntimeUI.createLabel(summarySection, {
      name: "GrowthEmptyTitle",
      text: "暂无宠物成长数据",
      x: 0,
      y: 16,
      width: 320,
      height: 30,
      fontSize: 22,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(summarySection, {
      name: "GrowthEmptyHint",
      text: "完成首次宠物创建后，就能在这里查看成长阶段、经验和进化条件。",
      x: 0,
      y: -24,
      width: 380,
      height: 52,
      fontSize: 16,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  const lines = [
    `成长阶段：${resolveStageLabel(pet.stage)}`,
    `等级：Lv.${pet.level}`,
    `经验值：${pet.experience}`,
    `饥饿度：${pet.hunger}%`,
    `心情值：${pet.mood}%`,
    `状态：${pet.status === false ? "异常" : "正常"}`,
  ].join("\n");

  RuntimeUI.createLabel(summarySection, {
    name: "GrowthSummaryText",
    text: lines,
    x: 0,
    y: 4,
    width: 390,
    height: 140,
    fontSize: 19,
    color: TITLE_COLOR,
  });
}

function renderRecentFeedback(card: Node, feedback: PetGrowthFeedback | null): void {
  RuntimeUI.createLabel(card, {
    name: "GrowthFeedbackTitle",
    text: "最近成长反馈",
    x: 0,
    y: -54,
    width: 240,
    height: 28,
    fontSize: 20,
    color: TITLE_COLOR,
  });

  const feedbackSection = RuntimeUI.createBox(card, {
    name: "GrowthFeedbackSection",
    x: 0,
    y: -148,
    width: 450,
    height: 110,
    color: SECTION_BG_COLOR,
  });

  if (!feedback) {
    RuntimeUI.createLabel(feedbackSection, {
      name: "GrowthFeedbackEmpty",
      text: "最近还没有新的成长反馈。完成一次喂养或作业提交后，再回来查看这里。",
      x: 0,
      y: 0,
      width: 390,
      height: 52,
      fontSize: 16,
      color: MUTED_COLOR,
    });
    return;
  }

  const sourceLabel = feedback.source === "pet_feed" ? "喂养成功" : "作业提交成功";
  RuntimeUI.createLabel(feedbackSection, {
    name: "GrowthFeedbackSource",
    text: sourceLabel,
    x: 0,
    y: 28,
    width: 320,
    height: 22,
    fontSize: 15,
    color: WAIT_COLOR,
  });

  RuntimeUI.createLabel(feedbackSection, {
    name: "GrowthFeedbackMessage",
    text: feedback.message,
    x: 0,
    y: -2,
    width: 390,
    height: 48,
    fontSize: 16,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(feedbackSection, {
    name: "GrowthFeedbackTime",
    text: formatFeedbackTime(feedback.timestamp),
    x: 0,
    y: -36,
    width: 390,
    height: 18,
    fontSize: 13,
    color: MUTED_COLOR,
  });
}

function renderEvolutionSummary(
  card: Node,
  pet: PetStatus | null,
  evolution: PetEvolutionPayload | null,
  evolutionError: string | undefined,
  isPreviewMode: boolean
): void {
  RuntimeUI.createLabel(card, {
    name: "EvolutionTitle",
    text: "进化条件",
    x: 0,
    y: 176,
    width: 260,
    height: 34,
    fontSize: 24,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(card, {
    name: "EvolutionSubtitle",
    text: isPreviewMode ? "当前处于开发预览模式。" : "这里会显示当前阶段、下一阶段和条件判断。",
    x: 0,
    y: 144,
    width: 390,
    height: 28,
    fontSize: 15,
    color: isPreviewMode ? WAIT_COLOR : SUBTEXT_COLOR,
  });

  const evolutionSection = RuntimeUI.createBox(card, {
    name: "EvolutionSummarySection",
    x: 0,
    y: 2,
    width: 440,
    height: 252,
    color: SECTION_BG_COLOR,
  });

  if (!pet) {
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionEmpty",
      text: "当前没有可用的进化信息",
      x: 0,
      y: 20,
      width: 320,
      height: 28,
      fontSize: 21,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionEmptyHint",
      text: "先创建宠物，再刷新状态查看正式进化条件。",
      x: 0,
      y: -20,
      width: 360,
      height: 44,
      fontSize: 16,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  if (!evolution) {
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionFallbackState",
      text: "当前缺少足够数据，仅显示保守提示。",
      x: 0,
      y: 48,
      width: 360,
      height: 28,
      fontSize: 20,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionFallbackHint",
      text:
        evolutionError?.trim() ||
        "宠物状态已同步，但进化接口暂未返回可判断的完整信息。请稍后刷新再查看。",
      x: 0,
      y: -2,
      width: 390,
      height: 64,
      fontSize: 16,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  const levelSatisfied = pet.level >= evolution.requirements.level;
  const daySatisfied = evolution.days_until_evolution <= 0;
  const growthRequirementText =
    evolution.requirements.growth > 0
      ? `成长要求：目标 ${evolution.requirements.growth}（当前未返回可直接比较字段）`
      : "成长要求：当前无需额外成长值判断";
  const overallStatus = resolveOverallEvolutionStatus(levelSatisfied, daySatisfied, evolution);

  const lines = [
    `当前阶段：${evolution.current_visual}`,
    `下一阶段：${evolution.next_visual}`,
    `等级要求：Lv.${evolution.requirements.level}（${levelSatisfied ? "已满足" : "未满足"}）`,
    growthRequirementText,
    `进化时机：${daySatisfied ? "已满足" : `距离进化 ${evolution.days_until_evolution} 天`}`,
  ].join("\n");

  RuntimeUI.createLabel(evolutionSection, {
    name: "EvolutionInfoText",
    text: lines,
    x: 0,
    y: 42,
    width: 390,
    height: 146,
    fontSize: 17,
    color: TITLE_COLOR,
  });

  const badgeColor =
    overallStatus.kind === "ready"
      ? READY_COLOR
      : overallStatus.kind === "waiting"
      ? WAIT_COLOR
      : new Color(110, 128, 152, 255);
  const badge = RuntimeUI.createBox(evolutionSection, {
    name: "EvolutionStatusBadge",
    x: 0,
    y: -72,
    width: 280,
    height: 42,
    color: badgeColor,
  });
  RuntimeUI.createLabel(badge, {
    name: "EvolutionStatusBadgeText",
    text: overallStatus.title,
    x: 0,
    y: 0,
    width: 240,
    height: 24,
    fontSize: 18,
    color: new Color(24, 30, 40, 255),
  });

  RuntimeUI.createLabel(evolutionSection, {
    name: "EvolutionSummaryText",
    text: overallStatus.message,
    x: 0,
    y: -110,
    width: 390,
    height: 44,
    fontSize: 15,
    color: SUBTEXT_COLOR,
  });
}

function renderFooterActions(
  card: Node,
  actions: PetGrowthViewActions,
  context?: object
): void {
  const refreshButton = RuntimeUI.createButton(card, {
    name: "RefreshGrowthButton",
    text: "刷新状态",
    x: -100,
    y: -188,
    width: 160,
    height: 50,
    color: PRIMARY_ACTION_COLOR,
    fontSize: 18,
  });
  refreshButton.button.node.on(Button.EventType.CLICK, () => void actions.onRefresh(), context);

  const backButton = RuntimeUI.createButton(card, {
    name: "BackGrowthButton",
    text: "返回总览",
    x: 100,
    y: -188,
    width: 160,
    height: 50,
    color: SECONDARY_ACTION_COLOR,
    fontSize: 18,
  });
  backButton.button.node.on(Button.EventType.CLICK, actions.onBackToOverview, context);
}

function renderPreviewModeControls(
  growthCard: Node,
  currentMode: PreviewMode,
  actions: PetGrowthViewActions,
  context?: object
): void {
  RuntimeUI.createLabel(growthCard, {
    name: "PreviewModeTitle",
    text: `开发预览：${resolvePreviewModeLabel(currentMode)}`,
    x: 0,
    y: -200,
    width: 240,
    height: 18,
    fontSize: 14,
    color: WAIT_COLOR,
  });

  const modes: Array<{ mode: PreviewMode; label: string; x: number }> = [
    { mode: "real", label: "真实", x: -160 },
    { mode: "stage1", label: "一阶段", x: -80 },
    { mode: "stage2", label: "二阶段", x: 0 },
    { mode: "unknown", label: "未知", x: 80 },
    { mode: "countdown", label: "倒计时", x: 160 },
  ];

  modes.forEach(({ mode, label, x }) => {
    const button = RuntimeUI.createButton(growthCard, {
      name: `PreviewMode${mode}Button`,
      text: label,
      x,
      y: -220,
      width: 72,
      height: 24,
      color: currentMode === mode ? READY_COLOR : new Color(62, 72, 96, 255),
      fontSize: 13,
    });
    button.button.node.on(
      Button.EventType.CLICK,
      () => {
        setPreviewMode(mode);
        actions.onPreviewModeChange();
      },
      context
    );
  });
}

function renderGrowthSummaryResponsive(
  card: Node,
  pet: PetStatus | null,
  layout: GrowthPageLayout
): void {
  const panel = layout.growthCard;
  RuntimeUI.createLabel(card, {
    name: "GrowthTitleResponsive",
    text: "宠物成长状态",
    x: 0,
    y: panel.titleY,
    width: Math.min(360, panel.width - 40),
    height: 34,
    fontSize: layout.compact ? 22 : 24,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthSubtitleResponsive",
    text: pet ? "这里会展示当前成长阶段、状态和经验。" : "先创建宠物，再查看成长信息。",
    x: 0,
    y: panel.subtitleY,
    width: Math.min(440, panel.width - 30),
    height: 28,
    fontSize: layout.compact ? 14 : 16,
    color: SUBTEXT_COLOR,
  });

  const summarySection = RuntimeUI.createCard(card, {
    name: "GrowthSummarySectionResponsive",
    x: 0,
    y: panel.sectionY,
    width: panel.width - 28,
    height: panel.sectionHeight,
    color: SECTION_BG_COLOR,
    innerColor: new Color(255, 255, 255, 140),
    borderColor: UiTokens.colors.borderSoft,
    radius: 24,
  });

  if (!pet) {
    RuntimeUI.createLabel(summarySection, {
      name: "GrowthEmptyTitleResponsive",
      text: "暂无宠物成长数据",
      x: 0,
      y: 16,
      width: Math.min(320, panel.width - 64),
      height: 30,
      fontSize: layout.compact ? 20 : 22,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(summarySection, {
      name: "GrowthEmptyHintResponsive",
      text: "完成首次宠物创建后，这里会显示成长阶段、经验和进化条件。",
      x: 0,
      y: -24,
      width: Math.min(390, panel.width - 56),
      height: 52,
      fontSize: layout.compact ? 14 : 16,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  const lines = [
    `成长阶段：${resolveStageLabel(pet.stage)}`,
    `等级：Lv.${pet.level}`,
    `经验值：${pet.experience}`,
    `饥饿度：${pet.hunger}%`,
    `心情值：${pet.mood}%`,
    `状态：${pet.status === false ? "异常" : "正常"}`,
  ].join("\n");

  RuntimeUI.createLabel(summarySection, {
    name: "GrowthSummaryTextResponsive",
    text: lines,
    x: 0,
    y: 4,
    width: Math.min(390, panel.width - 62),
    height: panel.sectionHeight - 24,
    fontSize: layout.compact ? 16 : 19,
    color: TITLE_COLOR,
  });
}

function renderRecentFeedbackResponsive(
  card: Node,
  feedback: PetGrowthFeedback | null,
  layout: GrowthPageLayout
): void {
  const panel = layout.growthCard;
  RuntimeUI.createLabel(card, {
    name: "GrowthFeedbackTitleResponsive",
    text: "最近成长反馈",
    x: 0,
    y: panel.feedbackTitleY,
    width: 240,
    height: 28,
    fontSize: layout.compact ? 18 : 20,
    color: TITLE_COLOR,
  });

  const feedbackSection = RuntimeUI.createCard(card, {
    name: "GrowthFeedbackSectionResponsive",
    x: 0,
    y: panel.feedbackSectionY,
    width: panel.width - 28,
    height: panel.feedbackSectionHeight,
    color: SECTION_BG_COLOR,
    innerColor: new Color(255, 255, 255, 140),
    borderColor: UiTokens.colors.borderSoft,
    radius: 24,
  });

  if (!feedback) {
    RuntimeUI.createLabel(feedbackSection, {
      name: "GrowthFeedbackEmptyResponsive",
      text: "最近还没有新的成长反馈。完成一次喂养或作业提交后，再回来查看这里。",
      x: 0,
      y: 0,
      width: Math.min(390, panel.width - 54),
      height: 52,
      fontSize: layout.compact ? 14 : 16,
      color: MUTED_COLOR,
    });
    return;
  }

  const sourceLabel = feedback.source === "pet_feed" ? "喂养成功" : "作业提交成功";
  RuntimeUI.createBadge(feedbackSection, {
    name: "GrowthFeedbackSourceResponsive",
    text: sourceLabel,
    x: 0,
    y: panel.feedbackSectionHeight / 2 - 22,
    width: Math.min(160, panel.width - 80),
    height: 30,
    fontSize: 14,
    color: WAIT_COLOR,
    textColor: TITLE_COLOR,
  });

  RuntimeUI.createLabel(feedbackSection, {
    name: "GrowthFeedbackMessageResponsive",
    text: feedback.message,
    x: 0,
    y: layout.compact ? -2 : 0,
    width: Math.min(390, panel.width - 58),
    height: 48,
    fontSize: layout.compact ? 14 : 16,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(feedbackSection, {
    name: "GrowthFeedbackTimeResponsive",
    text: formatFeedbackTime(feedback.timestamp),
    x: 0,
    y: -36,
    width: Math.min(390, panel.width - 58),
    height: 18,
    fontSize: 13,
    color: MUTED_COLOR,
  });
}

function renderEvolutionSummaryResponsive(
  card: Node,
  pet: PetStatus | null,
  evolution: PetEvolutionPayload | null,
  evolutionError: string | undefined,
  isPreviewMode: boolean,
  layout: GrowthPageLayout
): void {
  const panel = layout.evolutionCard;
  RuntimeUI.createLabel(card, {
    name: "EvolutionTitleResponsive",
    text: "进化条件",
    x: 0,
    y: panel.titleY,
    width: 260,
    height: 34,
    fontSize: layout.compact ? 22 : 24,
    color: TITLE_COLOR,
  });

  RuntimeUI.createLabel(card, {
    name: "EvolutionSubtitleResponsive",
    text: isPreviewMode ? "当前处于开发预览模式。" : "这里会显示当前阶段、下一阶段和条件判断。",
    x: 0,
    y: panel.subtitleY,
    width: Math.min(400, panel.width - 30),
    height: 28,
    fontSize: layout.compact ? 13 : 15,
    color: isPreviewMode ? WAIT_COLOR : SUBTEXT_COLOR,
  });

  const evolutionSection = RuntimeUI.createCard(card, {
    name: "EvolutionSummarySectionResponsive",
    x: 0,
    y: panel.sectionY,
    width: panel.width - 28,
    height: panel.sectionHeight,
    color: SECTION_BG_COLOR,
    innerColor: new Color(255, 255, 255, 140),
    borderColor: UiTokens.colors.borderSoft,
    radius: 24,
  });

  if (!pet) {
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionEmptyResponsive",
      text: "当前没有可用的进化信息",
      x: 0,
      y: 20,
      width: 320,
      height: 28,
      fontSize: layout.compact ? 19 : 21,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionEmptyHintResponsive",
      text: "先创建宠物，再刷新状态查看正式进化条件。",
      x: 0,
      y: -20,
      width: Math.min(360, panel.width - 42),
      height: 44,
      fontSize: layout.compact ? 14 : 16,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  if (!evolution) {
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionFallbackStateResponsive",
      text: "当前缺少足够数据，仅显示保守提示",
      x: 0,
      y: 48,
      width: 360,
      height: 28,
      fontSize: layout.compact ? 18 : 20,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(evolutionSection, {
      name: "EvolutionFallbackHintResponsive",
      text:
        evolutionError?.trim() ||
        "宠物状态已同步，但进化接口暂未返回可判断的完整信息，请稍后刷新再查看。",
      x: 0,
      y: -2,
      width: Math.min(390, panel.width - 48),
      height: 64,
      fontSize: layout.compact ? 14 : 16,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  const levelSatisfied = pet.level >= evolution.requirements.level;
  const daySatisfied = evolution.days_until_evolution <= 0;
  const growthRequirementText =
    evolution.requirements.growth > 0
      ? `成长要求：目标 ${evolution.requirements.growth}`
      : "成长要求：当前无需额外成长值判断";
  const overallStatus = resolveOverallEvolutionStatus(levelSatisfied, daySatisfied, evolution);

  const lines = [
    `当前阶段：${evolution.current_visual}`,
    `下一阶段：${evolution.next_visual}`,
    `等级要求：Lv.${evolution.requirements.level}（${levelSatisfied ? "已满足" : "未满足"}）`,
    growthRequirementText,
    `进化时机：${daySatisfied ? "已满足" : `距离进化 ${evolution.days_until_evolution} 天`}`,
  ].join("\n");

  RuntimeUI.createLabel(evolutionSection, {
    name: "EvolutionInfoTextResponsive",
    text: lines,
    x: 0,
    y: 42,
    width: Math.min(390, panel.width - 54),
    height: panel.sectionHeight - 100,
    fontSize: layout.compact ? 15 : 17,
    color: TITLE_COLOR,
  });

  const badgeColor =
    overallStatus.kind === "ready"
      ? READY_COLOR
      : overallStatus.kind === "waiting"
        ? WAIT_COLOR
        : new Color(110, 128, 152, 255);
  RuntimeUI.createBadge(evolutionSection, {
    name: "EvolutionStatusBadgeResponsive",
    text: overallStatus.title,
    x: 0,
    y: -72,
    width: Math.min(300, panel.width - 72),
    height: 42,
    fontSize: layout.compact ? 16 : 18,
    color: badgeColor,
    textColor: TITLE_COLOR,
  });

  RuntimeUI.createLabel(evolutionSection, {
    name: "EvolutionSummaryTextResponsive",
    text: overallStatus.message,
    x: 0,
    y: -110,
    width: Math.min(390, panel.width - 48),
    height: 44,
    fontSize: layout.compact ? 13 : 15,
    color: SUBTEXT_COLOR,
  });
}

function renderFooterActionsResponsive(
  card: Node,
  actions: PetGrowthViewActions,
  context?: object,
  layout?: GrowthPageLayout
): void {
  const panel = layout?.evolutionCard ?? layout?.growthCard;
  const compact = layout?.compact ?? false;
  const refreshButton = RuntimeUI.createGradientButton(card, {
    name: "RefreshGrowthButtonResponsive",
    text: "刷新状态",
    x: compact ? -86 : -104,
    y: panel?.footerY ?? -188,
    width: compact ? 140 : 160,
    height: compact ? 44 : 50,
    color: PRIMARY_ACTION_COLOR,
    fontSize: compact ? 16 : 18,
    selected: true,
  });
  refreshButton.button.node.on(Button.EventType.CLICK, () => void actions.onRefresh(), context);

  const backButton = RuntimeUI.createGradientButton(card, {
    name: "BackGrowthButtonResponsive",
    text: "返回总览",
    x: compact ? 86 : 104,
    y: panel?.footerY ?? -188,
    width: compact ? 140 : 160,
    height: compact ? 44 : 50,
    color: SECONDARY_ACTION_COLOR,
    textColor: TITLE_COLOR,
    fontSize: compact ? 16 : 18,
    selected: false,
  });
  backButton.button.node.on(Button.EventType.CLICK, actions.onBackToOverview, context);
}

function renderPreviewModeControlsResponsive(
  growthCard: Node,
  currentMode: PreviewMode,
  actions: PetGrowthViewActions,
  context?: object,
  layout?: GrowthPageLayout
): void {
  const panel = layout?.growthCard;
  RuntimeUI.createLabel(growthCard, {
    name: "PreviewModeTitleResponsive",
    text: `开发预览：${resolvePreviewModeLabel(currentMode)}`,
    x: 0,
    y: panel?.previewTitleY ?? -200,
    width: Math.min(240, (panel?.width ?? 360) - 40),
    height: 18,
    fontSize: 14,
    color: WAIT_COLOR,
  });

  RuntimeUI.createPillTabs(growthCard, {
    name: "PetGrowthPreviewTabsResponsive",
    x: 0,
    y: panel?.previewTabY ?? -220,
    width: Math.min(420, (panel?.width ?? 360) - 48),
    height: panel?.previewTabHeight ?? 24,
    tabs: [
      { name: "Real", text: "真实", active: currentMode === "real" },
      { name: "Stage1", text: "一阶段", active: currentMode === "stage1" },
      { name: "Stage2", text: "二阶段", active: currentMode === "stage2" },
      { name: "Unknown", text: "未知", active: currentMode === "unknown" },
      { name: "Countdown", text: "倒计时", active: currentMode === "countdown" },
    ],
    activeColor: READY_COLOR,
    inactiveColor: new Color(247, 238, 227, 255),
    activeTextColor: TITLE_COLOR,
    inactiveTextColor: SUBTEXT_COLOR,
    fontSize: 13,
    gap: 6,
    padding: 6,
    onSelect: (index: number) => {
      const mode: PreviewMode =
        index === 0 ? "real" : index === 1 ? "stage1" : index === 2 ? "stage2" : index === 3 ? "unknown" : "countdown";
      setPreviewMode(mode);
      actions.onPreviewModeChange();
    },
  });
}

function resolveOverallEvolutionStatus(
  levelSatisfied: boolean,
  daySatisfied: boolean,
  evolution: PetEvolutionPayload
): { kind: "ready" | "waiting" | "partial"; title: string; message: string } {
  if (daySatisfied && levelSatisfied) {
    return {
      kind: "ready",
      title: "已满足进化条件",
      message: "当前已满足可判断条件。若后端还有额外隐藏条件，以后端真实状态为准。",
    };
  }

  if (!levelSatisfied) {
    return {
      kind: "waiting",
      title: "未满足进化条件",
      message: `当前等级未达到 Lv.${evolution.requirements.level}，请继续完成喂养或作业提交后再查看。`,
    };
  }

  return {
    kind: "partial",
    title: "条件未完全满足或数据暂未齐全",
    message: "等级条件已满足，但成长值相关字段暂不足以精确判断，请结合进化时机和后端返回继续观察。",
  };
}

function resolvePreviewPet(pet: PetStatus | null, mode: PreviewMode): PetStatus | null {
  if (!pet) {
    return null;
  }

  if (mode === "stage1") {
    return {
      ...pet,
      level: 1,
      experience: 20,
      mood: 70,
      hunger: 80,
      stage: "stage_1",
      next_evolve_days: 4,
    };
  }

  if (mode === "stage2") {
    return {
      ...pet,
      level: 2,
      experience: 90,
      mood: 88,
      hunger: 76,
      stage: "stage_2",
      next_evolve_days: 0,
    };
  }

  if (mode === "unknown") {
    return {
      ...pet,
      experience: 45,
      stage: "unknown",
      next_evolve_days: undefined,
    };
  }

  if (mode === "countdown") {
    return {
      ...pet,
      level: Math.max(2, pet.level),
      experience: 75,
      stage: pet.stage ?? "stage_1",
      next_evolve_days: 1,
    };
  }

  return pet;
}

function synthesizeEvolutionFromPet(pet: PetStatus | null): PetEvolutionPayload | null {
  if (!pet) {
    return null;
  }

  const currentStage = resolveStageIndex(pet.stage);
  const nextStage = Math.min(currentStage + 1, 4);
  return {
    current_stage: currentStage,
    current_visual: resolveStageLabel(pet.stage),
    next_stage: nextStage,
    next_visual: resolveNextStageLabel(pet.stage),
    requirements: {
      level: Math.max(2, pet.level + 1),
      growth: currentStage * 50,
    },
    days_until_evolution: typeof pet.next_evolve_days === "number" ? pet.next_evolve_days : 3,
  };
}

function resolveStageIndex(stage?: string | null): number {
  const normalized = stage?.trim().toLowerCase();
  if (normalized === "stage_4" || normalized === "stage4" || normalized === "4") {
    return 4;
  }
  if (normalized === "stage_3" || normalized === "stage3" || normalized === "3") {
    return 3;
  }
  if (normalized === "stage_2" || normalized === "stage2" || normalized === "2") {
    return 2;
  }
  return 1;
}

function resolveStageLabel(stage?: string | null): string {
  const normalized = stage?.trim().toLowerCase();
  if (!normalized) {
    return "成长中";
  }
  if (normalized === "stage_1" || normalized === "stage1" || normalized === "1") {
    return "第一阶段";
  }
  if (normalized === "stage_2" || normalized === "stage2" || normalized === "2") {
    return "第二阶段";
  }
  if (normalized === "stage_3" || normalized === "stage3" || normalized === "3") {
    return "第三阶段";
  }
  return stage ?? "成长中";
}

function resolveNextStageLabel(stage?: string | null): string {
  const normalized = stage?.trim().toLowerCase();
  if (normalized === "stage_1" || normalized === "stage1" || normalized === "1") {
    return "第二阶段";
  }
  if (normalized === "stage_2" || normalized === "stage2" || normalized === "2") {
    return "第三阶段";
  }
  if (normalized === "stage_3" || normalized === "stage3" || normalized === "3") {
    return "更高阶段";
  }
  return "下一阶段";
}

function formatFeedbackTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "刚刚同步";
  }
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `最近更新：${month}-${day} ${hours}:${minutes}`;
}

function pad(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

function resolvePreviewModeLabel(mode: PreviewMode): string {
  if (mode === "stage1") {
    return "第一阶段";
  }
  if (mode === "stage2") {
    return "第二阶段";
  }
  if (mode === "unknown") {
    return "未知阶段";
  }
  if (mode === "countdown") {
    return "倒计时";
  }
  return "真实数据";
}

function getPreviewMode(): PreviewMode {
  const raw = storage.get(PREVIEW_MODE_KEY)?.trim().toLowerCase();
  if (raw === "stage1" || raw === "stage_1") {
    return "stage1";
  }
  if (raw === "stage2" || raw === "stage_2") {
    return "stage2";
  }
  if (raw === "unknown") {
    return "unknown";
  }
  if (raw === "countdown") {
    return "countdown";
  }
  return "real";
}

function setPreviewMode(mode: PreviewMode): void {
  if (mode === "real") {
    storage.remove(PREVIEW_MODE_KEY);
    return;
  }
  storage.set(PREVIEW_MODE_KEY, mode);
}
