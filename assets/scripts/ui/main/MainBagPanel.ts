import { Button, Color, HorizontalTextAlignment, Node } from "cc";
import type { PetFoodInventoryItem } from "../../types/api";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

type FoodFormatter = (food: PetFoodInventoryItem) => string;
type FoodAction = (food: PetFoodInventoryItem) => void;

export function renderBagPanelContent(options: {
  panel: Node;
  foods: PetFoodInventoryItem[];
  panelWidth: number;
  panelHeight: number;
  inventoryUseRequestInFlight: boolean;
  formatFoodName: FoodFormatter;
  resolveFoodIcon: FoodFormatter;
  resolveFoodEffectText: FoodFormatter;
  onUseFood: FoodAction;
  onOpenHomework: () => void;
  eventTarget: unknown;
}): void {
  const {
    panel,
    foods,
    panelWidth,
    panelHeight,
    inventoryUseRequestInFlight,
    formatFoodName,
    resolveFoodIcon,
    resolveFoodEffectText,
    onUseFood,
    onOpenHomework,
    eventTarget,
  } = options;

  if (!foods.length) {
    renderFoodShortageGuide({
      parent: panel,
      name: "BagFoodShortage",
      y: -Math.round(panelHeight * 0.08),
      width: panelWidth - 52,
      onOpenHomework,
      eventTarget,
    });
    return;
  }

  const rowTop = Math.round(panelHeight * 0.13);
  const rowGap = Math.max(46, Math.round(panelHeight * 0.22));
  foods.slice(0, 3).forEach((food, index) => {
    const y = rowTop - index * rowGap;
    const isAvailable = food.count > 0 && !inventoryUseRequestInFlight;
    RuntimeUI.createBox(panel, {
      name: `BagFood${index}IconBg`,
      x: -Math.round(panelWidth * 0.36),
      y,
      width: 34,
      height: 34,
      color: new Color(255, 244, 226, 210),
      radius: 17,
    });
    RuntimeUI.createLabel(panel, {
      name: `BagFood${index}Icon`,
      text: resolveFoodIcon(food),
      x: -Math.round(panelWidth * 0.36),
      y,
      width: 30,
      height: 30,
      fontSize: 18,
      color: new Color(126, 68, 32, 226),
    });
    RuntimeUI.createLabel(panel, {
      name: `BagFood${index}Name`,
      text: formatFoodName(food),
      x: -Math.round(panelWidth * 0.17),
      y: y + 12,
      width: Math.round(panelWidth * 0.34),
      height: 24,
      fontSize: Math.max(13, Math.min(18, Math.round(panelWidth * 0.042))),
      color: new Color(126, 68, 32, 228),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createLabel(panel, {
      name: `BagFood${index}Effect`,
      text: resolveFoodEffectText(food),
      x: -Math.round(panelWidth * 0.17),
      y: y - 12,
      width: Math.round(panelWidth * 0.45),
      height: 24,
      fontSize: Math.max(11, Math.min(15, Math.round(panelWidth * 0.034))),
      color: new Color(151, 105, 76, 220),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createLabel(panel, {
      name: `BagFood${index}Count`,
      text: `数量 ${food.count}`,
      x: Math.round(panelWidth * 0.17),
      y: y + 12,
      width: Math.round(panelWidth * 0.18),
      height: 24,
      fontSize: Math.max(13, Math.min(18, Math.round(panelWidth * 0.04))),
      color: new Color(151, 105, 76, 220),
    });
    const useButton = RuntimeUI.createButton(panel, {
      name: `BagFood${index}UseButton`,
      text: food.count <= 0 ? "已用完" : inventoryUseRequestInFlight ? "处理中" : "使用",
      x: Math.round(panelWidth * 0.34),
      y,
      width: Math.round(panelWidth * 0.18),
      height: 30,
      color: isAvailable ? new Color(238, 145, 84, 230) : new Color(190, 178, 164, 160),
      textColor: new Color(255, 255, 255, isAvailable ? 255 : 190),
      fontSize: Math.max(12, Math.min(15, Math.round(panelWidth * 0.036))),
      radius: 15,
    });
    useButton.button.transition = Button.Transition.NONE;
    if (isAvailable) {
      useButton.node.on(Button.EventType.CLICK, () => onUseFood(food), eventTarget);
    }
  });

  if (foods.length > 3) {
    RuntimeUI.createLabel(panel, {
      name: "BagMoreText",
      text: `还有 ${foods.length - 3} 种道具未显示`,
      x: 0,
      y: -Math.round(panelHeight * 0.38),
      width: panelWidth - 60,
      height: 20,
      fontSize: Math.max(11, Math.min(14, Math.round(panelWidth * 0.032))),
      color: new Color(151, 105, 76, 188),
    });
  }

  if (!hasUsableFood(foods)) {
    renderFoodShortageGuide({
      parent: panel,
      name: "BagEmptyUsableFood",
      y: -Math.round(panelHeight * 0.36),
      width: panelWidth - 52,
      compact: true,
      onOpenHomework,
      eventTarget,
    });
  }
}

export function renderFoodSelectionPanel(options: {
  parent: Node;
  stageY: number;
  stageWidth: number;
  stageHeight: number;
  isOpen: boolean;
  foods: PetFoodInventoryItem[];
  feedRequestInFlight: boolean;
  onClose: () => void;
  onSelectFood: FoodAction;
  onOpenHomework: () => void;
  eventTarget: unknown;
}): void {
  const {
    parent,
    stageY,
    stageWidth,
    stageHeight,
    isOpen,
    foods,
    feedRequestInFlight,
    onClose,
    onSelectFood,
    onOpenHomework,
    eventTarget,
  } = options;
  if (!isOpen) {
    return;
  }

  const availableFoods = foods.filter((food) => food.count > 0);
  const panelWidth = Math.max(330, Math.min(500, Math.round(stageWidth * 0.44)));
  const panelHeight = Math.max(230, Math.min(330, Math.round(stageHeight * 0.5)));
  const panel = RuntimeUI.createCard(parent, {
    name: "FoodSelectionPanel",
    x: 0,
    y: Math.round(stageY),
    width: panelWidth,
    height: panelHeight,
    color: new Color(235, 207, 180, 238),
    innerColor: new Color(255, 252, 247, 246),
    radius: 24,
    borderThickness: 2,
    innerRadius: 22,
  });

  RuntimeUI.createLabel(panel, {
    name: "FoodSelectionTitle",
    text: "选择口粮",
    x: 0,
    y: Math.round(panelHeight * 0.36),
    width: panelWidth - 80,
    height: 32,
    fontSize: Math.max(20, Math.min(28, Math.round(panelWidth * 0.06))),
    color: new Color(126, 68, 32, 242),
  });

  const closeButton = RuntimeUI.createButton(panel, {
    name: "FoodSelectionClose",
    text: "关闭",
    x: Math.round(panelWidth * 0.34),
    y: Math.round(panelHeight * 0.36),
    width: 68,
    height: 28,
    color: new Color(110, 74, 51, 130),
    textColor: new Color(255, 255, 255, 255),
    fontSize: 13,
    radius: 14,
  });
  closeButton.button.transition = Button.Transition.NONE;
  closeButton.node.on(Button.EventType.CLICK, onClose, eventTarget);

  if (!availableFoods.length) {
    renderFoodShortageGuide({
      parent: panel,
      name: "FoodSelectionShortage",
      y: -Math.round(panelHeight * 0.06),
      width: panelWidth - 56,
      onOpenHomework,
      eventTarget,
    });
    return;
  }

  const headerY = Math.round(panelHeight * 0.2);
  const headerColor = new Color(151, 105, 76, 210);
  RuntimeUI.createLabel(panel, {
    name: "FoodSelectionTypeHeader",
    text: "food_type",
    x: -Math.round(panelWidth * 0.25),
    y: headerY,
    width: Math.round(panelWidth * 0.28),
    height: 22,
    fontSize: Math.max(11, Math.min(14, Math.round(panelWidth * 0.033))),
    color: headerColor,
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  RuntimeUI.createLabel(panel, {
    name: "FoodSelectionQualityHeader",
    text: "food_quality",
    x: 0,
    y: headerY,
    width: Math.round(panelWidth * 0.28),
    height: 22,
    fontSize: Math.max(11, Math.min(14, Math.round(panelWidth * 0.033))),
    color: headerColor,
  });
  RuntimeUI.createLabel(panel, {
    name: "FoodSelectionCountHeader",
    text: "count",
    x: Math.round(panelWidth * 0.27),
    y: headerY,
    width: Math.round(panelWidth * 0.16),
    height: 22,
    fontSize: Math.max(11, Math.min(14, Math.round(panelWidth * 0.033))),
    color: headerColor,
  });

  const rowTop = Math.round(panelHeight * 0.08);
  const rowGap = Math.max(36, Math.round(panelHeight * 0.16));
  const rowWidth = Math.round(panelWidth * 0.82);
  const rowHeight = Math.max(30, Math.round(rowGap * 0.74));
  availableFoods.slice(0, 5).forEach((food, index) => {
    const y = rowTop - index * rowGap;
    RuntimeUI.createBox(panel, {
      name: `FoodSelectionRowBg${index}`,
      x: 0,
      y,
      width: rowWidth,
      height: rowHeight,
      color: new Color(255, 244, 226, feedRequestInFlight ? 108 : 184),
      radius: Math.round(rowHeight / 2),
    });
    RuntimeUI.createLabel(panel, {
      name: `FoodSelectionType${index}`,
      text: food.food_type,
      x: -Math.round(panelWidth * 0.25),
      y,
      width: Math.round(panelWidth * 0.28),
      height: 24,
      fontSize: Math.max(13, Math.min(17, Math.round(panelWidth * 0.039))),
      color: new Color(126, 68, 32, 230),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createLabel(panel, {
      name: `FoodSelectionQuality${index}`,
      text: food.food_quality,
      x: 0,
      y,
      width: Math.round(panelWidth * 0.28),
      height: 24,
      fontSize: Math.max(13, Math.min(17, Math.round(panelWidth * 0.039))),
      color: new Color(126, 68, 32, 220),
    });
    RuntimeUI.createLabel(panel, {
      name: `FoodSelectionCount${index}`,
      text: String(food.count),
      x: Math.round(panelWidth * 0.27),
      y,
      width: Math.round(panelWidth * 0.16),
      height: 24,
      fontSize: Math.max(13, Math.min(17, Math.round(panelWidth * 0.039))),
      color: new Color(151, 105, 76, 224),
    });

    const rowHitArea = RuntimeUI.createBox(panel, {
      name: `FoodSelectionHit${index}`,
      x: 0,
      y,
      width: rowWidth,
      height: rowHeight,
      color: new Color(255, 255, 255, 0),
      radius: Math.round(rowHeight / 2),
    });
    const rowButton = rowHitArea.addComponent(Button);
    rowButton.transition = Button.Transition.NONE;
    rowHitArea.on(Button.EventType.CLICK, () => onSelectFood(food), eventTarget);
  });

  if (availableFoods.length > 5) {
    RuntimeUI.createLabel(panel, {
      name: "FoodSelectionMore",
      text: `还有 ${availableFoods.length - 5} 种口粮未显示`,
      x: 0,
      y: -Math.round(panelHeight * 0.38),
      width: panelWidth - 60,
      height: 20,
      fontSize: Math.max(11, Math.min(14, Math.round(panelWidth * 0.032))),
      color: new Color(151, 105, 76, 188),
    });
  }
}

function hasUsableFood(foods: PetFoodInventoryItem[]): boolean {
  return foods.some((food) => food.count > 0);
}

function renderFoodShortageGuide(options: {
  parent: Node;
  name: string;
  y: number;
  width: number;
  compact?: boolean;
  onOpenHomework: () => void;
  eventTarget: unknown;
}): void {
  const { parent, name, y, width, compact, onOpenHomework, eventTarget } = options;
  const guideHeight = compact ? 58 : 86;
  RuntimeUI.createCard(parent, {
    name: `${name}Card`,
    x: 0,
    y,
    width,
    height: guideHeight,
    color: new Color(255, 244, 226, 168),
    innerColor: new Color(255, 252, 247, 160),
    radius: 18,
    borderThickness: 2,
    innerRadius: 16,
  });
  RuntimeUI.createLabel(parent, {
    name: `${name}Text`,
    text: "粮食不太够啦，完成一次学习任务可以获得新的口粮。",
    x: -Math.round(width * 0.12),
    y: y + (compact ? 12 : 18),
    width: Math.round(width * 0.68),
    height: compact ? 32 : 44,
    fontSize: Math.max(12, Math.min(16, Math.round(width * 0.038))),
    color: new Color(151, 105, 76, 218),
    horizontalAlign: HorizontalTextAlignment.LEFT,
  });
  const homeworkButton = RuntimeUI.createButton(parent, {
    name: `${name}HomeworkButton`,
    text: "去提交作业",
    x: Math.round(width * 0.3),
    y: y - (compact ? 14 : 18),
    width: Math.max(102, Math.round(width * 0.28)),
    height: 32,
    color: new Color(238, 145, 84, 230),
    textColor: new Color(255, 255, 255, 255),
    fontSize: Math.max(12, Math.min(15, Math.round(width * 0.036))),
    radius: 16,
  });
  homeworkButton.button.transition = Button.Transition.NONE;
  homeworkButton.node.on(Button.EventType.CLICK, onOpenHomework, eventTarget);
}
