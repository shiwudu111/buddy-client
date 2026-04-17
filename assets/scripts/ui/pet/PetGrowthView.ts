import { Button, Color, Node } from "cc";
import { storage } from "../../core/storage";
import type { PetStatus } from "../../types/api";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

// 文件整体作用：
// 这是“宠物成长”页签的界面绘制函数。
// 左边展示当前成长状态，右边展示进化预览和刷新按钮。
//
// 一句话版本：
// 这段代码的核心意思就是：把宠物成长页签画出来，同时展示当前成长状态、进化提示和刷新入口。
//
// 美术需要关注的重点：
// 1. PetGrowthCard / PetEvolutionPreviewCard 都是动态生成的卡片。
// 2. 本地模拟样本按钮只用于测试不同分支，不会改真实后端数据。
// 3. 刷新按钮会重新拉宠物状态，但如果后端数据没变，画面看起来可能几乎不变。
export type PetGrowthViewActions = {
  // onRefresh：点击“刷新状态”后的回调。
  // onBackToOverview：点击“返回总览”后的回调。
  // onPreviewModeChange：切换本地模拟样本后的回调。
  onRefresh: () => void | Promise<void>;
  onBackToOverview: () => void;
  onPreviewModeChange: () => void;
};

export type PetGrowthViewState = {
  pet: PetStatus | null;
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
  // 这个页面的核心目标很简单：左边解释“现在长成什么样”，右边解释“下一步还能怎么进化”。
  // previewMode 只是本地调试样本开关，不会改后端，也不会污染真实宠物数据。
  const pet = state.pet;
  const previewMode = getPreviewMode();
  const displayPet = resolvePreviewPet(pet, previewMode);

  const growthCard = RuntimeUI.createBox(root, {
    name: "PetGrowthCard",
    x: -265,
    y: -10,
    width: 520,
    height: 420,
    color: PANEL_COLOR,
  });
  const previewCard = RuntimeUI.createBox(root, {
    name: "PetEvolutionPreviewCard",
    x: 285,
    y: -10,
    width: 510,
    height: 420,
    color: PANEL_COLOR,
  });

  RuntimeUI.createLabel(growthCard, {
    name: "GrowthTitle",
    text: "宠物成长 / 进化",
    x: 0,
    y: 170,
    width: 380,
    height: 36,
    fontSize: 24,
  });

  RuntimeUI.createLabel(growthCard, {
    name: "GrowthSubtitle",
    text: displayPet
      ? "当前成长信息与进化提示会随宠物状态同步刷新。"
      : "当前未检测到宠物数据，请先完成首次创建。",
    x: 0,
    y: 132,
    width: 420,
    height: 36,
    fontSize: 16,
    color: SUBTEXT_COLOR,
  });

  if (displayPet) {
    const stage = resolveStageLabel(displayPet.stage);
    const evolveHint = resolveEvolveHint(displayPet.next_evolve_days);
    const evolveColor = isEvolutionReady(displayPet.next_evolve_days) ? READY_COLOR : WAIT_COLOR;

    RuntimeUI.createLabel(growthCard, {
      name: "GrowthStage",
      text: `成长阶段：${stage}`,
      x: 0,
      y: 70,
      width: 360,
      height: 30,
      fontSize: 22,
    });
    RuntimeUI.createLabel(growthCard, {
      name: "GrowthLevel",
      text: `等级：Lv.${displayPet.level}`,
      x: 0,
      y: 30,
      width: 360,
      height: 30,
      fontSize: 22,
    });
    RuntimeUI.createLabel(growthCard, {
      name: "GrowthExp",
      text: `经验值：${displayPet.experience}`,
      x: 0,
      y: -10,
      width: 360,
      height: 30,
      fontSize: 20,
    });
    RuntimeUI.createLabel(growthCard, {
      name: "GrowthStatus",
      text: `饥饿 ${displayPet.hunger}%  |  心情 ${displayPet.mood}%  |  状态 ${
        displayPet.status === false ? "异常" : "正常"
      }`,
      x: 0,
      y: -50,
      width: 420,
      height: 30,
      fontSize: 18,
      color: SUBTEXT_COLOR,
    });
    RuntimeUI.createLabel(growthCard, {
      name: "GrowthHint",
      text: evolveHint,
      x: 0,
      y: -96,
      width: 420,
      height: 34,
      fontSize: 18,
      color: evolveColor,
    });
    RuntimeUI.createLabel(growthCard, {
      name: "GrowthNote",
      text: "当前 MVP 仅展示前两个进化阶段，暂不引入复杂动画和多分支演出。",
      x: 0,
      y: -138,
      width: 430,
      height: 44,
      fontSize: 15,
      color: SUBTEXT_COLOR,
    });
  } else {
    RuntimeUI.createLabel(growthCard, {
      name: "GrowthEmpty",
      text: "暂无宠物成长数据",
      x: 0,
      y: 40,
      width: 320,
      height: 32,
      fontSize: 22,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(growthCard, {
      name: "GrowthEmptyHint",
      text: "完成首次创建宠物后，这里会显示成长与进化信息。",
      x: 0,
      y: -5,
      width: 380,
      height: 44,
      fontSize: 17,
      color: SUBTEXT_COLOR,
    });
  }

  RuntimeUI.createLabel(previewCard, {
    name: "PreviewTitle",
    text: "进化预览",
    x: 0,
    y: 170,
    width: 300,
    height: 36,
    fontSize: 24,
  });

    RuntimeUI.createLabel(previewCard, {
      name: "PreviewStage",
      text: `当前阶段：${resolveStageLabel(displayPet.stage)}`,
      x: 0,
      y: 120,
      width: 380,
    height: 28,
    fontSize: 18,
  });

    RuntimeUI.createLabel(previewCard, {
      name: "PreviewNextStage",
      text: `下一阶段：${resolveNextStageLabel(displayPet.stage)}`,
      x: 0,
      y: 70,
      width: 380,
    height: 28,
    fontSize: 18,
  });

    RuntimeUI.createLabel(previewCard, {
      name: "PreviewCondition",
      text: resolvePreviewConditionText(displayPet.next_evolve_days),
      x: 0,
      y: 10,
      width: 390,
    height: 68,
    fontSize: 17,
    color: SUBTEXT_COLOR,
  });

    RuntimeUI.createLabel(previewCard, {
      name: "PreviewSummary",
      text: displayPet
      ? "这里先提供明确的成长状态说明，后续接真正的进化接口时，可直接复用这块入口。"
      : "当前没有宠物时，不展示进化按钮，只保留说明信息。",
      x: 0,
    y: -72,
    width: 400,
    height: 78,
    fontSize: 16,
    color: SUBTEXT_COLOR,
  });

  if (displayPet && isEvolutionReady(displayPet.next_evolve_days)) {
    const evolveBadge = RuntimeUI.createBox(previewCard, {
      name: "PreviewReadyBadge",
      x: 0,
      y: -145,
      width: 220,
      height: 48,
      color: READY_COLOR,
    });
    RuntimeUI.createLabel(evolveBadge, {
      name: "PreviewReadyText",
      text: "进化条件已满足",
      x: 0,
      y: 0,
      width: 190,
      height: 28,
      fontSize: 18,
    });
  } else {
    const waitBadge = RuntimeUI.createBox(previewCard, {
      name: "PreviewWaitBadge",
      x: 0,
      y: -145,
      width: 240,
      height: 48,
      color: WAIT_COLOR,
    });
    RuntimeUI.createLabel(waitBadge, {
      name: "PreviewWaitText",
      text: "进化条件未满足",
      x: 0,
      y: 0,
      width: 200,
      height: 28,
      fontSize: 18,
    });
  }

  const refreshButton = RuntimeUI.createButton(previewCard, {
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

  const backButton = RuntimeUI.createButton(previewCard, {
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

  renderPreviewModeControls(growthCard, previewMode, actions, context);
}

function renderPreviewModeControls(
  growthCard: Node,
  currentMode: PreviewMode,
  actions: PetGrowthViewActions,
  context?: object
): void {
  // 这组按钮只给本地验收用，方便快速切换不同数据分支。
  // 真实环境里只要保留“真实”模式即可，其它模式不会影响正式逻辑。
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

  const buttonWidth = 72;
  const buttonHeight = 26;
  const buttonY = -206;
  const buttonColor = new Color(62, 72, 96, 255);
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
      y: buttonY,
      width: buttonWidth,
      height: buttonHeight,
      color: currentMode === mode ? READY_COLOR : buttonColor,
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

function resolveStageLabel(stage?: string | null): string {
  // 后端传的是机器可读的 stage，这里统一翻成更容易理解的中文。
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
  // “下一阶段”只是说明卡，不代表当前就真的发生了进化。
  const normalized = stage?.trim().toLowerCase();
  if (normalized === "stage_1" || normalized === "stage1" || normalized === "1") {
    return "第二阶段";
  }

  if (normalized === "stage_2" || normalized === "stage2" || normalized === "2") {
    return "更高阶段（MVP 冻结）";
  }

  return "第一阶段";
}

function resolveEvolveHint(nextEvolveDays?: number | null): string {
  // next_evolve_days 来自后端：有值就显示倒计时，没有值就显示通用说明。
  if (typeof nextEvolveDays !== "number") {
    return "进化提示：等级 + 资源达标后开放进化入口。";
  }

  if (nextEvolveDays <= 0) {
    return "进化提示：当前条件已满足，可接入正式进化操作。";
  }

  return `进化提示：距离下一次进化还有 ${nextEvolveDays} 天。`;
}

function resolvePreviewConditionText(nextEvolveDays?: number | null): string {
  // 这一行是给测试和美术看的“当前进化条件到了哪一步”。
  if (typeof nextEvolveDays !== "number") {
    return "条件：等级 + 资源达到基线后，才会进入进化待命状态。";
  }

  if (nextEvolveDays <= 0) {
    return "进化条件已满足";
  }

  return `进化倒计时：${nextEvolveDays} 天`;
}

function isEvolutionReady(nextEvolveDays?: number | null): boolean {
  // 天数小于等于 0，表示已经可以进入“条件满足”的展示态。
  return typeof nextEvolveDays === "number" && nextEvolveDays <= 0;
}

function getPreviewMode(): PreviewMode {
  // 本地调试模式存进 storage，刷新页面后会自动保留，便于反复验收。
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
  // 这里只改当前客户端的展示模式，不写后端。
  storage.set(PREVIEW_MODE_KEY, mode);
}

function resolvePreviewModeLabel(mode: PreviewMode): string {
  // 给调试按钮配一个更直白的说明，避免只看到内部 key。
  switch (mode) {
    case "stage1":
      return "stage_1 / 3天";
    case "stage2":
      return "stage_2 / 0天";
    case "unknown":
      return "未知 stage / 无天数";
    case "countdown":
      return "stage_1 / 5天";
    default:
      return "真实数据";
  }
}

function resolvePreviewPet(pet: PetStatus | null, mode: PreviewMode): PetStatus | null {
  // real 模式直接用真实宠物；其它模式只是在前端“临时换一份样本”。
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
