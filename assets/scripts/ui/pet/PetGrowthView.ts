import { Button, Color, Node } from "cc";
import { storage } from "../../core/storage";
import type { PetEvolutionPayload, PetStatus } from "../../types/api";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

// 文件整体作用：
// 这是“宠物成长”页签的绘制文件。
// 左边展示当前宠物成长状态，右边展示进化信息和刷新入口。
//
// 一句话版本：
// 这段代码的核心意思就是：把“宠物成长页”画出来，让用户看见当前成长情况、下一步进化条件，以及本地测试时常用的模拟样本。
//
// 美术需要关注的重点：
// 1. 这里的卡片、标题、按钮都是运行时动态生成的，不是预先摆在场景里的固定节点。
// 2. 右侧“进化信息”区域，正式环境会优先显示后端真实数据；如果后端没返回，就会降级成前端推导说明。
// 3. 底部“本地模拟样本”只用于验收和调试，不会修改真实宠物数据。

export type PetGrowthViewActions = {
  onRefresh: () => void | Promise<void>;
  onBackToOverview: () => void;
  onPreviewModeChange: () => void;
};

export type PetGrowthViewState = {
  pet: PetStatus | null;
  evolution: PetEvolutionPayload | null;
  evolutionError?: string;
};

const PANEL_COLOR = new Color(28, 35, 48, 255);
const SUBTEXT_COLOR = new Color(190, 200, 216, 255);
const PRIMARY_ACTION_COLOR = new Color(76, 128, 255, 255);
const SECONDARY_ACTION_COLOR = new Color(93, 102, 122, 255);
const READY_COLOR = new Color(121, 225, 167, 255);
const WAIT_COLOR = new Color(255, 194, 107, 255);
const PREVIEW_MODE_KEY = "buddy.dev.petGrowthPreviewMode";

type PreviewMode = "real" | "stage1" | "stage2" | "unknown" | "countdown";

export function renderPetGrowthView(
  root: Node,
  state: PetGrowthViewState,
  actions: PetGrowthViewActions,
  context?: object
): void {
  const previewMode = getPreviewMode();
  const displayPet = resolvePreviewPet(state.pet, previewMode);
  const displayEvolution = resolveDisplayEvolution(displayPet, state.evolution, previewMode);

  const growthCard = RuntimeUI.createBox(root, {
    name: "PetGrowthCard",
    x: -265,
    y: -10,
    width: 520,
    height: 420,
    color: PANEL_COLOR,
  });

  const evolutionCard = RuntimeUI.createBox(root, {
    name: "PetEvolutionCard",
    x: 285,
    y: -10,
    width: 510,
    height: 420,
    color: PANEL_COLOR,
  });

  renderGrowthSummary(growthCard, displayPet);
  renderEvolutionSummary(evolutionCard, displayPet, displayEvolution, state.evolutionError, previewMode);
  renderFooterActions(evolutionCard, actions, context);
  renderPreviewModeControls(growthCard, previewMode, actions, context);
}

function renderGrowthSummary(card: Node, pet: PetStatus | null): void {
  RuntimeUI.createLabel(card, {
    name: "GrowthTitle",
    text: "宠物成长",
    x: 0,
    y: 170,
    width: 380,
    height: 36,
    fontSize: 24,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthSubtitle",
    text: pet
      ? "这里看成长阶段、经验值和进化提示。"
      : "先创建宠物，再来看成长信息。",
    x: 0,
    y: 132,
    width: 420,
    height: 40,
    fontSize: 16,
    color: SUBTEXT_COLOR,
  });

  if (!pet) {
    RuntimeUI.createLabel(card, {
      name: "GrowthEmpty",
      text: "暂无宠物成长数据",
      x: 0,
      y: 30,
      width: 320,
      height: 32,
      fontSize: 22,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(card, {
      name: "GrowthEmptyHint",
      text: "先完成首次创建宠物，再回来查看成长和进化信息。",
      x: 0,
      y: -18,
      width: 380,
      height: 44,
      fontSize: 17,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  RuntimeUI.createLabel(card, {
    name: "GrowthStage",
    text: `成长阶段：${resolveStageLabel(pet.stage)}`,
    x: 0,
    y: 76,
    width: 360,
    height: 30,
    fontSize: 22,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthLevel",
    text: `等级：Lv.${pet.level}`,
    x: 0,
    y: 36,
    width: 360,
    height: 30,
    fontSize: 22,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthExperience",
    text: `经验值：${pet.experience}`,
    x: 0,
    y: -4,
    width: 360,
    height: 30,
    fontSize: 20,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthStatus",
    text: `饥饿 ${pet.hunger}%  |  心情 ${pet.mood}%  |  状态 ${pet.status === false ? "异常" : "正常"}`,
    x: 0,
    y: -44,
    width: 420,
    height: 30,
    fontSize: 18,
    color: SUBTEXT_COLOR,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthHint",
    text: resolveEvolveHint(pet.next_evolve_days),
    x: 0,
    y: -94,
    width: 420,
    height: 34,
    fontSize: 18,
    color: isEvolutionReady(pet.next_evolve_days) ? READY_COLOR : WAIT_COLOR,
  });

  RuntimeUI.createLabel(card, {
    name: "GrowthNote",
    text: "当前只看状态和提示，不做复杂动画。",
    x: 0,
    y: -140,
    width: 430,
    height: 48,
    fontSize: 15,
    color: SUBTEXT_COLOR,
  });
}

function renderEvolutionSummary(
  card: Node,
  pet: PetStatus | null,
  evolution: PetEvolutionPayload | null,
  evolutionError: string | undefined,
  previewMode: PreviewMode
): void {
  const isSyntheticMode = previewMode !== "real";
  const isSyntheticFallback = previewMode === "real" && !evolution && !!pet;
  const shouldLabelSynthetic = isSyntheticMode || isSyntheticFallback;
  RuntimeUI.createLabel(card, {
    name: "EvolutionTitle",
    text: shouldLabelSynthetic ? "进化信息（前端推导）" : evolution ? "进化信息（后端真实）" : "进化预览",
    x: 0,
    y: 170,
    width: 300,
    height: 36,
    fontSize: 24,
  });

  if (!pet) {
    RuntimeUI.createLabel(card, {
      name: "EvolutionEmpty",
      text: "当前没有可用的进化信息",
      x: 0,
      y: 32,
      width: 320,
      height: 32,
      fontSize: 22,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(card, {
      name: "EvolutionEmptyHint",
      text: "先创建宠物，再通过刷新状态查看后端返回的进化数据。",
      x: 0,
      y: -24,
      width: 380,
      height: 44,
      fontSize: 16,
      color: SUBTEXT_COLOR,
    });
    return;
  }

  RuntimeUI.createLabel(card, {
    name: "EvolutionSource",
    text: shouldLabelSynthetic ? "来源：前端根据宠物状态推导" : "来源：后端接口返回的真实数据",
    x: 0,
    y: 148,
    width: 360,
    height: 22,
    fontSize: 14,
    color: SUBTEXT_COLOR,
  });

  if (!evolution) {
    RuntimeUI.createLabel(card, {
      name: "EvolutionMissing",
      text: evolutionError || "当前还没有进化数据，请先点击刷新状态。",
      x: 0,
      y: 20,
      width: 400,
      height: 80,
      fontSize: 18,
      color: WAIT_COLOR,
    });
    return;
  }

  RuntimeUI.createLabel(card, {
    name: "EvolutionCurrent",
    text: `当前阶段：${evolution.current_visual}`,
    x: 0,
    y: 120,
    width: 380,
    height: 28,
    fontSize: 18,
  });

  RuntimeUI.createLabel(card, {
    name: "EvolutionNext",
    text: `下一阶段：${evolution.next_visual}`,
    x: 0,
    y: 82,
    width: 380,
    height: 28,
    fontSize: 18,
  });

  RuntimeUI.createLabel(card, {
    name: "EvolutionRequirements",
    text: `进化条件：等级达到 Lv.${evolution.requirements.level}，成长值达到 ${evolution.requirements.growth}`,
    x: 0,
    y: 26,
    width: 390,
    height: 56,
    fontSize: 17,
    color: SUBTEXT_COLOR,
  });

  RuntimeUI.createLabel(card, {
    name: "EvolutionSummary",
    text: resolveEvolutionSummaryText(previewMode, evolutionError, shouldLabelSynthetic),
    x: 0,
    y: -54,
    width: 400,
    height: 72,
    fontSize: 16,
    color: SUBTEXT_COLOR,
  });

  const badgeColor = evolution.days_until_evolution <= 0 ? READY_COLOR : WAIT_COLOR;
  const badge = RuntimeUI.createBox(card, {
    name: "EvolutionBadge",
    x: 0,
    y: -138,
    width: 250,
    height: 48,
    color: badgeColor,
  });

  RuntimeUI.createLabel(badge, {
    name: "EvolutionBadgeText",
    text:
      evolution.days_until_evolution <= 0
        ? "进化条件已满足"
        : `进化倒计时：${evolution.days_until_evolution} 天`,
    x: 0,
    y: 0,
    width: 220,
    height: 28,
    fontSize: 18,
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
    y: -195,
    width: 160,
    height: 52,
    color: PRIMARY_ACTION_COLOR,
    fontSize: 18,
  });
  refreshButton.button.node.on(Button.EventType.CLICK, () => void actions.onRefresh(), context);

  const backButton = RuntimeUI.createButton(card, {
    name: "BackGrowthButton",
    text: "返回总览",
    x: 100,
    y: -195,
    width: 160,
    height: 52,
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
    text: "本地模拟样本",
    x: 0,
    y: -168,
    width: 220,
    height: 22,
    fontSize: 16,
    color: SUBTEXT_COLOR,
  });

  RuntimeUI.createLabel(growthCard, {
    name: "PreviewModeState",
    text: `当前：${resolvePreviewModeLabel(currentMode)}`,
    x: 0,
    y: -188,
    width: 260,
    height: 22,
    fontSize: 14,
    color: WAIT_COLOR,
  });

  const modes: Array<{ mode: PreviewMode; label: string; x: number }> = [
    { mode: "real", label: "真实", x: -160 },
    { mode: "stage1", label: "1阶", x: -80 },
    { mode: "stage2", label: "2阶", x: 0 },
    { mode: "unknown", label: "未知", x: 80 },
    { mode: "countdown", label: "倒计时", x: 160 },
  ];

  modes.forEach(({ mode, label, x }) => {
    const button = RuntimeUI.createButton(growthCard, {
      name: `PreviewMode${mode}Button`,
      text: label,
      x,
      y: -206,
      width: 72,
      height: 26,
      color: currentMode === mode ? READY_COLOR : new Color(62, 72, 96, 255),
      fontSize: 14,
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

function resolveDisplayEvolution(
  pet: PetStatus | null,
  evolution: PetEvolutionPayload | null,
  mode: PreviewMode
): PetEvolutionPayload | null {
  if (mode === "real") {
    return evolution ?? synthesizeEvolutionFromPet(pet);
  }

  return synthesizeEvolutionFromPet(resolvePreviewPet(pet, mode));
}

function synthesizeEvolutionFromPet(pet: PetStatus | null): PetEvolutionPayload | null {
  if (!pet) {
    return null;
  }

  const currentStage = resolveStageIndex(pet.stage);
  const nextStage = Math.min(currentStage + 1, 4);
  const currentVisual = resolveStageLabel(pet.stage);
  const nextVisual = resolveNextStageLabel(pet.stage);

  return {
    current_stage: currentStage,
    current_visual: currentVisual,
    next_stage: nextStage,
    next_visual: nextVisual,
    requirements: {
      level: Math.max(2, pet.level + 1),
      growth: currentStage * 50,
    },
    days_until_evolution: typeof pet.next_evolve_days === "number" ? pet.next_evolve_days : 3,
  };
}

function resolveStageIndex(stage?: string | null): number {
  const normalized = stage?.trim().toLowerCase();
  if (normalized === "stage_2" || normalized === "stage2" || normalized === "2") {
    return 2;
  }
  if (normalized === "stage_3" || normalized === "stage3" || normalized === "3") {
    return 3;
  }
  if (normalized === "stage_4" || normalized === "stage4" || normalized === "4") {
    return 4;
  }
  return 1;
}

function resolveStageLabel(stage?: string | null): string {
  const normalized = stage?.trim().toLowerCase();
  if (!normalized) {
    return "成长期";
  }
  if (normalized === "stage_1" || normalized === "stage1" || normalized === "1") {
    return "第一阶段";
  }
  if (normalized === "stage_2" || normalized === "stage2" || normalized === "2") {
    return "第二阶段";
  }
  return stage ?? "成长期";
}

function resolveNextStageLabel(stage?: string | null): string {
  const normalized = stage?.trim().toLowerCase();
  if (normalized === "stage_1" || normalized === "stage1" || normalized === "1") {
    return "第二阶段";
  }
  if (normalized === "stage_2" || normalized === "stage2" || normalized === "2") {
    return "更高阶段（MVP 未开放）";
  }
  return "第一阶段";
}

function resolveEvolveHint(nextEvolveDays?: number | null): string {
  if (typeof nextEvolveDays !== "number") {
    return "进化提示：等级 + 资源达标后开放进化入口。";
  }
  if (nextEvolveDays <= 0) {
    return "进化提示：当前条件已满足，可进入正式进化流程。";
  }
  return `进化提示：距离下一次进化还有 ${nextEvolveDays} 天。`;
}

function isEvolutionReady(nextEvolveDays?: number | null): boolean {
  return typeof nextEvolveDays === "number" && nextEvolveDays <= 0;
}

function resolveEvolutionSummaryText(
  previewMode: PreviewMode,
  evolutionError?: string,
  syntheticMode = false
): string {
  if (previewMode !== "real") {
    return "这是本地模拟样本，只用于看文案。";
  }
  if (syntheticMode) {
    return "这是前端推导的进化预览，不是真实数据。";
  }
  if (evolutionError) {
    return `真实接口未拿到，先用前端推导兜底。${evolutionError}`;
  }
  return "这里显示的是后端真实进化信息。";
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
  storage.set(PREVIEW_MODE_KEY, mode);
}

function resolvePreviewModeLabel(mode: PreviewMode): string {
  switch (mode) {
    case "stage1":
      return "1阶 / 3天";
    case "stage2":
      return "2阶 / 已满足";
    case "unknown":
      return "未知 / 无日期";
    case "countdown":
      return "倒计时 / 5天";
    default:
      return "真实数据";
  }
}

function resolvePreviewPet(pet: PetStatus | null, mode: PreviewMode): PetStatus | null {
  if (mode === "real") {
    return pet;
  }

  const base: PetStatus = pet ?? {
    pet_id: "debug-pet-growth",
    name: "Buddy",
    level: 1,
    hunger: 100,
    mood: 100,
    experience: 0,
    status: true,
    stage: "stage_1",
    next_evolve_days: 3,
  };

  switch (mode) {
    case "stage1":
      return {
        ...base,
        stage: "stage_1",
        next_evolve_days: 3,
      };
    case "stage2":
      return {
        ...base,
        stage: "stage_2",
        next_evolve_days: 0,
      };
    case "unknown":
      return {
        ...base,
        stage: "mystery_stage",
        next_evolve_days: undefined,
      };
    case "countdown":
      return {
        ...base,
        stage: "stage_1",
        next_evolve_days: 5,
      };
    default:
      return base;
  }
}
