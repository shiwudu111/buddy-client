import {
  Button,
  Color,
  EditBox,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Mask,
  Material,
  Node,
  Sprite,
  SpriteFrame,
  ScrollView,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";
import { UiTokens } from "../../theme/UiTokens";

// 文件整体作用：
// 这是项目里“运行时动态拼 UI”的通用工具箱。
// 登录页、主界面、作业中心、宠物成长页里很多盒子、按钮、输入框、滚动区，都会从这里动态创建。
//
// 一句话版本：
// 这段代码的核心意思就是：需要什么按钮、文字、输入框、滚动区，就在运行时现场生成出来，不用提前全部摆在场景里。
//
// 美术需要关注的重点：
// 1. 这里创建出来的节点，很多不会提前出现在场景层级里，而是在运行时临时生成。
// 2. 页面重绘时，这些节点可能被整体删除再重建，所以不要把手工资源直接挂在这些临时节点下面。
// 3. `name` 字段会成为真实节点名，排查动态层级时很重要。
// 4. 这里不负责“点按钮后发生什么”，只负责把按钮、文字、容器画出来。
type SizeLike = {
  width: number;
  height: number;
};

type PositionLike = {
  x: number;
  y: number;
};

type LabelOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    fontSize?: number;
    color?: Color;
    horizontalAlign?: HorizontalTextAlignment;
    verticalAlign?: VerticalTextAlignment;
  };

type BoxOptions = SizeLike &
  PositionLike & {
    name: string;
    color?: Color;
    radius?: number;
  };
type ClipBoxOptions = SizeLike &
  PositionLike & {
    name: string;
    radius?: number;
  };
type RadialGlowOptions = SizeLike &
  PositionLike & {
    name: string;
    color: Color;
    steps?: number;
  };

type SpriteFrameOptions = SizeLike &
  PositionLike & {
    name: string;
    spriteFrame: SpriteFrame;
    color?: Color;
    material?: Material;
    rotation?: number;
    spriteType?: number;
    insetTop?: number;
    insetBottom?: number;
    insetLeft?: number;
    insetRight?: number;
  };

type ButtonOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    color?: Color;
    textColor?: Color;
    fontSize?: number;
    radius?: number;
  };

type EditBoxOptions = SizeLike &
  PositionLike & {
    name: string;
    placeholder: string;
    defaultValue?: string;
    maxLength?: number;
    password?: boolean;
    multiline?: boolean;
    radius?: number;
    backgroundColor?: Color;
    textColor?: Color;
    placeholderColor?: Color;
  };

type ScrollTextOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    fontSize?: number;
    color?: Color;
    backgroundColor?: Color;
    padding?: number;
    radius?: number;
    elastic?: boolean;
    scrollToTopOnCreate?: boolean;
  };

type CardOptions = SizeLike &
  PositionLike & {
    name: string;
    color?: Color;
    innerColor?: Color;
    borderColor?: Color;
    radius?: number;
    innerRadius?: number;
    borderThickness?: number;
    lineWidth?: number;
    style?: "panel" | "shell" | "scene" | "plain";
  };

type GradientButtonOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    color?: Color;
    textColor?: Color;
    fontSize?: number;
    radius?: number;
    disabled?: boolean;
    selected?: boolean;
  };

type ProgressBarOptions = SizeLike &
  PositionLike & {
    name: string;
    percent: number;
    trackColor?: Color;
    fillColor?: Color;
    radius?: number;
    label?: string;
    labelColor?: Color;
    labelFontSize?: number;
  };

type BadgeOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    color?: Color;
    textColor?: Color;
    fontSize?: number;
    radius?: number;
  };

type ActionTileOptions = SizeLike &
  PositionLike & {
    name: string;
    icon: string;
    text: string;
    color?: Color;
    textColor?: Color;
    fontSize?: number;
    iconSize?: number;
    radius?: number;
  };

type PillTabItem = {
  name: string;
  text: string;
  icon?: string;
  active?: boolean;
};

type PillTabsOptions = SizeLike &
  PositionLike & {
    name: string;
    tabs: PillTabItem[];
    onSelect?: (index: number) => void;
    activeColor?: Color;
    inactiveColor?: Color;
    activeTextColor?: Color;
    inactiveTextColor?: Color;
    iconColor?: Color;
    fontSize?: number;
    radius?: number;
    padding?: number;
    gap?: number;
  };

type PanelHeaderOptions = SizeLike &
  PositionLike & {
    name: string;
    title: string;
    subtitle?: string;
    icon?: string;
    iconColor?: Color;
    titleColor?: Color;
    subtitleColor?: Color;
    titleFontSize?: number;
    subtitleFontSize?: number;
  };

type SpeechBubbleOptions = SizeLike &
  PositionLike & {
    name: string;
    text: string;
    color?: Color;
    textColor?: Color;
    fontSize?: number;
    radius?: number;
    tailSide?: "left" | "right";
  };

type MiniInputRowOptions = SizeLike &
  PositionLike & {
    name: string;
    placeholder: string;
    buttonText: string;
    defaultValue?: string;
    maxLength?: number;
    onSend?: (value: string) => void;
    backgroundColor?: Color;
    buttonColor?: Color;
    textColor?: Color;
    placeholderColor?: Color;
    radius?: number;
  };

function setNodeFrame(node: Node, x: number, y: number, width: number, height: number): UITransform {
  node.setPosition(new Vec3(x, y, 0));
  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

function drawRect(node: Node, width: number, height: number, color: Color, radius = 12): void {
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.fillColor = color;
  graphics.roundRect(-width / 2, -height / 2, width, height, radius);
  graphics.fill();
}

function drawFrameOutline(
  node: Node,
  width: number,
  height: number,
  color: Color,
  radius = 12,
  lineWidth = 6
): void {
  const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
  graphics.clear();
  graphics.lineWidth = lineWidth;
  graphics.strokeColor = color;
  graphics.roundRect(
    -width / 2 + lineWidth / 2,
    -height / 2 + lineWidth / 2,
    Math.max(0, width - lineWidth),
    Math.max(0, height - lineWidth),
    Math.max(0, radius - lineWidth / 2)
  );
  graphics.stroke();
}

function getGraphicsMaskSubComp(mask: Mask): Graphics | null {
  const subComp = mask.subComp;
  return subComp instanceof Graphics ? subComp : null;
}

export const RuntimeUI = {
  clear(node: Node): void {
    node.destroyAllChildren();
  },

  createBox(parent: Node, options: BoxOptions): Node {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);
    drawRect(
      node,
      options.width,
      options.height,
      options.color ?? new Color(38, 47, 63, 255),
      options.radius ?? 12
    );
    return node;
  },
  createRoundedClip(parent: Node, options: ClipBoxOptions): Node {
	  const node = new Node(options.name);
	  node.setParent(parent);

	  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
	  node.setPosition(new Vec3(options.x, options.y, 0));
	  transform.setContentSize(options.width, options.height);

	  const mask = node.addComponent(Mask);
	  mask.type = Mask.Type.GRAPHICS_STENCIL;
	  mask.inverted = false;

	  const graphics = getGraphicsMaskSubComp(mask);
	  if (!graphics) {
		return node;
	  }

	  graphics.clear();
	  graphics.fillColor = Color.WHITE;
	  graphics.roundRect(
		-options.width / 2,
		-options.height / 2,
		options.width,
		options.height,
		options.radius ?? 0
	  );
	  graphics.fill();

	  return node;
  },
  createSpriteFrame(parent: Node, options: SpriteFrameOptions): {
    node: Node;
    sprite: Sprite;
  } {
    const node = new Node(options.name);
    node.setParent(parent);
    const sprite = node.addComponent(Sprite);
    sprite.spriteFrame = options.spriteFrame;
    sprite.type = options.spriteType ?? Sprite.Type.SIMPLE;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    if (options.material) {
      sprite.customMaterial = options.material;
      sprite.setMaterial(options.material, 0);
    }
    if (options.color) {
      sprite.color = options.color;
    }
    if (typeof options.insetTop === "number") {
      sprite.spriteFrame.insetTop = options.insetTop;
    }
    if (typeof options.insetBottom === "number") {
      sprite.spriteFrame.insetBottom = options.insetBottom;
    }
    if (typeof options.insetLeft === "number") {
      sprite.spriteFrame.insetLeft = options.insetLeft;
    }
    if (typeof options.insetRight === "number") {
      sprite.spriteFrame.insetRight = options.insetRight;
    }
    setNodeFrame(node, options.x, options.y, options.width, options.height);
    if (typeof options.rotation === "number") {
      node.angle = options.rotation;
    }
    return { node, sprite };
  },

  createRadialGlow(parent: Node, options: RadialGlowOptions): Node {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    const steps = Math.max(3, options.steps ?? 10);
    for (let index = steps; index >= 1; index -= 1) {
      const progress = index / steps;
      const centerStrength = steps === 1 ? 1 : 1 - (index - 1) / (steps - 1);
      const alpha = Math.round(options.color.a * Math.max(0.08, centerStrength * centerStrength));
      this.createBox(node, {
        name: `${options.name}Step${index}`,
        x: 0,
        y: 0,
        width: options.width * progress,
        height: options.height * progress,
        color: new Color(options.color.r, options.color.g, options.color.b, alpha),
        radius: Math.max(options.width, options.height),
      });
    }

    return node;
  },

  createCard(parent: Node, options: CardOptions): Node {
    const style = options.style ?? "panel";
    if (style === "shell") {
      const node = new Node(options.name);
      node.setParent(parent);
      setNodeFrame(node, options.x, options.y, options.width, options.height);
      const lineWidth =
        options.lineWidth ??
        options.borderThickness ??
        Math.max(5, Math.min(9, Math.round(Math.min(options.width, options.height) * 0.0075)));
      drawFrameOutline(
        node,
        options.width,
        options.height,
        options.borderColor ?? new Color(255, 255, 255, 170),
        options.radius ?? UiTokens.radii.cardXL,
        lineWidth
      );
      return node;
    }

    const node = this.createBox(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color ?? UiTokens.colors.panel,
      radius: options.radius ?? UiTokens.radii.cardXL,
    });
    if (style === "plain" || style === "scene") {
      return node;
    }

    this.createBox(node, {
      name: `${options.name}Border`,
      x: 0,
      y: 0,
      width: Math.max(0, options.width - (options.borderThickness ?? 6) * 2),
      height: Math.max(0, options.height - (options.borderThickness ?? 6) * 2),
      color: options.innerColor ?? UiTokens.colors.panelInner,
      radius:
        options.innerRadius ??
        Math.max(0, (options.radius ?? UiTokens.radii.cardXL) - (options.borderThickness ?? 6)),
    });
    return node;
  },

  createLabel(parent: Node, options: LabelOptions): Label {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    const label = node.addComponent(Label);
    label.string = options.text;
    label.fontSize = options.fontSize ?? 24;
    label.lineHeight = (options.fontSize ?? 24) + 8;
    label.color = options.color ?? new Color(245, 247, 250, 255);
    label.horizontalAlign = options.horizontalAlign ?? HorizontalTextAlignment.CENTER;
    label.verticalAlign = options.verticalAlign ?? VerticalTextAlignment.CENTER;
    label.overflow = 1;
    label.enableWrapText = true;
    return label;
  },

  createButton(parent: Node, options: ButtonOptions): {
    node: Node;
    button: Button;
    label: Label;
  } {
    const node = this.createBox(parent, {
      ...options,
      color: options.color ?? new Color(76, 128, 255, 255),
    });

    const button = node.addComponent(Button);
    button.transition = 0;

    const label = this.createLabel(node, {
      name: `${options.name}Label`,
      text: options.text,
      x: 0,
      y: 0,
      width: options.width - 24,
      height: options.height - 12,
      fontSize: options.fontSize ?? 22,
      color: options.textColor ?? new Color(255, 255, 255, 255),
    });

    return { node, button, label };
  },

  createGradientButton(parent: Node, options: GradientButtonOptions): {
    node: Node;
    button: Button;
    label: Label;
  } {
    const node = this.createCard(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.disabled
        ? new Color(224, 227, 232, 255)
        : options.selected
          ? options.color ?? UiTokens.colors.brand
          : options.color ?? UiTokens.colors.blue,
      innerColor: options.disabled
        ? new Color(236, 238, 242, 255)
        : new Color(255, 255, 255, 70),
      borderColor: options.disabled
        ? new Color(211, 214, 219, 255)
        : options.selected
          ? new Color(255, 220, 179, 180)
          : new Color(255, 255, 255, 110),
      radius: options.radius ?? UiTokens.radii.pill,
      innerRadius: Math.max(0, (options.radius ?? UiTokens.radii.pill) - 4),
    });
    const button = node.addComponent(Button);
    button.transition = 0;
    if (options.disabled) {
      button.interactable = false;
    }
    const label = this.createLabel(node, {
      name: `${options.name}Label`,
      text: options.text,
      x: 0,
      y: 0,
      width: options.width - 24,
      height: options.height - 10,
      fontSize: options.fontSize ?? UiTokens.fontSizes.button,
      color: options.textColor ?? UiTokens.colors.textLight,
    });
    return { node, button, label };
  },

  createProgressBar(parent: Node, options: ProgressBarOptions): {
    node: Node;
    track: Node;
    fill: Node;
    label?: Label;
  } {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    const track = this.createBox(node, {
      name: `${options.name}Track`,
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
      color: options.trackColor ?? new Color(242, 226, 211, 255),
      radius: options.radius ?? 999,
    });
    const fillWidth = Math.max(
      0,
      Math.min(options.width, (options.width * Math.max(0, Math.min(100, options.percent))) / 100)
    );
    const fill = this.createBox(node, {
      name: `${options.name}Fill`,
      x: -options.width / 2 + fillWidth / 2,
      y: 0,
      width: fillWidth,
      height: options.height,
      color: options.fillColor ?? UiTokens.colors.xp,
      radius: options.radius ?? 999,
    });
    const label = options.label
      ? this.createLabel(node, {
          name: `${options.name}Label`,
          text: options.label,
          x: 0,
          y: 0,
          width: options.width,
          height: Math.max(18, options.height + 18),
          fontSize: options.labelFontSize ?? UiTokens.fontSizes.small,
          color: options.labelColor ?? UiTokens.colors.textSecondary,
        })
      : undefined;
    return { node, track, fill, label };
  },

  createBadge(parent: Node, options: BadgeOptions): Node {
    const node = this.createCard(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color ?? UiTokens.colors.brand,
      innerColor: new Color(255, 255, 255, 35),
      borderColor: new Color(255, 255, 255, 120),
      radius: options.radius ?? UiTokens.radii.pill,
      innerRadius: Math.max(0, (options.radius ?? UiTokens.radii.pill) - 4),
    });
    this.createLabel(node, {
      name: `${options.name}Text`,
      text: options.text,
      x: 0,
      y: 0,
      width: options.width - 10,
      height: options.height - 6,
      fontSize: options.fontSize ?? UiTokens.fontSizes.small,
      color: options.textColor ?? UiTokens.colors.textLight,
    });
    return node;
  },

  createActionTile(parent: Node, options: ActionTileOptions): Node {
    const node = this.createCard(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color ?? UiTokens.colors.panel,
      radius: options.radius ?? UiTokens.radii.actionTile,
    });
    this.createBox(node, {
      name: `${options.name}IconWrap`,
      x: 0,
      y: 18,
      width: 42,
      height: 42,
      color: options.color ?? UiTokens.colors.brand,
      radius: 15,
    });
    this.createLabel(node, {
      name: `${options.name}Icon`,
      text: options.icon,
      x: 0,
      y: 18,
      width: 28,
      height: 28,
      fontSize: options.iconSize ?? 22,
      color: UiTokens.colors.textLight,
    });
    this.createLabel(node, {
      name: `${options.name}Text`,
      text: options.text,
      x: 0,
      y: -24,
      width: options.width - 10,
      height: 24,
      fontSize: options.fontSize ?? 15,
      color: options.textColor ?? UiTokens.colors.textPrimary,
    });
    return node;
  },

  createPillTabs(parent: Node, options: PillTabsOptions): Node {
    const node = this.createCard(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: new Color(255, 255, 255, 116),
      innerColor: new Color(255, 255, 255, 154),
      borderColor: new Color(242, 221, 200, 255),
      radius: options.radius ?? UiTokens.radii.pill,
    });
    const padding = options.padding ?? 8;
    const gap = options.gap ?? 10;
    const tabWidth = Math.max(
      78,
      (options.width - padding * 2 - gap * (options.tabs.length - 1)) / options.tabs.length
    );
    const tabHeight = Math.max(36, options.height - padding * 2);
    options.tabs.forEach((tab, index) => {
      const x = -options.width / 2 + padding + tabWidth / 2 + index * (tabWidth + gap);
      const tabNode = this.createGradientButton(node, {
        name: `${options.name}${tab.name}`,
        text: tab.icon ? `${tab.icon} ${tab.text}` : tab.text,
        x,
        y: 0,
        width: tabWidth,
        height: tabHeight,
        color: tab.active ? options.activeColor ?? UiTokens.colors.brand : options.inactiveColor ?? new Color(247, 238, 227, 255),
        textColor: tab.active ? options.activeTextColor ?? UiTokens.colors.textLight : options.inactiveTextColor ?? UiTokens.colors.textPrimary,
        fontSize: options.fontSize ?? UiTokens.fontSizes.body,
        radius: options.radius ?? UiTokens.radii.pill,
        selected: Boolean(tab.active),
      });
      tabNode.button.node.on(Button.EventType.CLICK, () => options.onSelect?.(index));
    });
    return node;
  },

  createPanelHeader(parent: Node, options: PanelHeaderOptions): Node {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    if (options.icon) {
      this.createBadge(node, {
        name: `${options.name}Icon`,
        text: options.icon,
        x: -options.width / 2 + 22,
        y: 0,
        width: 42,
        height: 42,
        color: options.iconColor ?? new Color(247, 155, 52, 36),
        textColor: options.iconColor ?? UiTokens.colors.brand,
      });
    }

    this.createLabel(node, {
      name: `${options.name}Title`,
      text: options.title,
      x: options.icon ? -18 : 0,
      y: options.subtitle ? 8 : 0,
      width: options.width - (options.icon ? 80 : 20),
      height: 28,
      fontSize: options.titleFontSize ?? UiTokens.fontSizes.h2,
      color: options.titleColor ?? UiTokens.colors.textPrimary,
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    if (options.subtitle) {
      this.createLabel(node, {
        name: `${options.name}Subtitle`,
        text: options.subtitle,
        x: options.icon ? -18 : 0,
        y: -14,
        width: options.width - (options.icon ? 80 : 20),
        height: 18,
        fontSize: options.subtitleFontSize ?? UiTokens.fontSizes.small,
        color: options.subtitleColor ?? UiTokens.colors.textSecondary,
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
    }

    return node;
  },

  createSpeechBubble(parent: Node, options: SpeechBubbleOptions): Node {
    const node = this.createCard(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.color ?? UiTokens.colors.blue,
      innerColor: new Color(255, 255, 255, 24),
      borderColor: new Color(255, 255, 255, 110),
      radius: options.radius ?? 22,
    });
    const tailOffset = options.tailSide === "left" ? -options.width / 2 + 26 : options.width / 2 - 26;
    this.createBox(node, {
      name: `${options.name}Tail`,
      x: tailOffset,
      y: -options.height / 2 + 6,
      width: 22,
      height: 14,
      color: options.color ?? UiTokens.colors.blue,
      radius: 7,
    });
    this.createLabel(node, {
      name: `${options.name}Text`,
      text: options.text,
      x: 0,
      y: 0,
      width: options.width - 24,
      height: options.height - 16,
      fontSize: options.fontSize ?? UiTokens.fontSizes.body,
      color: options.textColor ?? UiTokens.colors.textLight,
    });
    return node;
  },

  createMiniInputRow(parent: Node, options: MiniInputRowOptions): {
    node: Node;
    editBox: EditBox;
    sendButton: Button;
    sendButtonNode: Node;
    textLabel: Label;
    placeholderLabel: Label;
  } {
    const node = this.createCard(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: options.backgroundColor ?? UiTokens.colors.panel,
      innerColor: new Color(255, 255, 255, 80),
      borderColor: UiTokens.colors.borderSoft,
      radius: options.radius ?? UiTokens.radii.input,
    });
    const inputWidth = Math.max(120, options.width - 120);
    const edit = this.createEditBox(node, {
      name: `${options.name}Input`,
      placeholder: options.placeholder,
      defaultValue: options.defaultValue,
      maxLength: options.maxLength ?? 40,
      multiline: false,
      x: -options.width / 2 + 12,
      y: 0,
      width: inputWidth,
      height: Math.max(32, options.height - 16),
      radius: 16,
      backgroundColor: new Color(255, 252, 247, 255),
      textColor: options.textColor ?? UiTokens.colors.textPrimary,
      placeholderColor: options.placeholderColor ?? UiTokens.colors.textSecondary,
    });
    const sendButtonNode = this.createGradientButton(node, {
      name: `${options.name}Send`,
      text: options.buttonText,
      x: options.width / 2 - 54,
      y: 0,
      width: 92,
      height: Math.max(34, options.height - 16),
      color: options.buttonColor ?? UiTokens.colors.mint,
      textColor: UiTokens.colors.textLight,
      fontSize: UiTokens.fontSizes.button,
      radius: 16,
      selected: true,
    }).node;
    const sendButton = sendButtonNode.getComponent(Button)!;
    if (options.onSend) {
      sendButtonNode.on(Button.EventType.CLICK, () => options.onSend?.(edit.editBox.string));
    }
    return {
      node,
      editBox: edit.editBox,
      sendButton,
      sendButtonNode,
      textLabel: edit.textLabel,
      placeholderLabel: edit.placeholderLabel,
    };
  },

  createEditBox(parent: Node, options: EditBoxOptions): {
    node: Node;
    editBox: EditBox;
    textLabel: Label;
    placeholderLabel: Label;
  } {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    this.createBox(node, {
      ...options,
      name: `${options.name}Background`,
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
      color: options.backgroundColor ?? new Color(20, 26, 37, 255),
      radius: options.radius,
    });

    const inputNode = new Node(`${options.name}Input`);
    inputNode.setParent(node);
    setNodeFrame(inputNode, 0, 0, options.width, options.height);

    const editBox = inputNode.addComponent(EditBox);
    inputNode.destroyAllChildren();

    const textLabel = this.createLabel(inputNode, {
      name: `${options.name}Text`,
      text: options.defaultValue ?? "",
      x: 0,
      y: 0,
      width: options.width - 28,
      height: options.height - 14,
      fontSize: 20,
      color: options.textColor ?? new Color(255, 255, 255, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    const placeholderLabel = this.createLabel(inputNode, {
      name: `${options.name}Placeholder`,
      text: options.placeholder,
      x: 0,
      y: 0,
      width: options.width - 28,
      height: options.height - 14,
      fontSize: 20,
      color: options.placeholderColor ?? new Color(153, 166, 184, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    placeholderLabel.node.active = !options.defaultValue;

    editBox.string = options.defaultValue ?? "";
    editBox.maxLength = options.maxLength ?? 120;
    editBox.placeholder = options.placeholder;
    editBox.textLabel = textLabel;
    editBox.placeholderLabel = placeholderLabel;
    const editBoxAny = editBox as any;
    editBoxAny.textLabel = textLabel;
    editBoxAny.placeholderLabel = placeholderLabel;
    editBoxAny._textLabel = textLabel;
    editBoxAny._placeholderLabel = placeholderLabel;
    if (options.multiline) {
      editBoxAny.inputMode = EditBox.InputMode.ANY;
      textLabel.enableWrapText = true;
      placeholderLabel.enableWrapText = true;
      textLabel.verticalAlign = VerticalTextAlignment.TOP;
      placeholderLabel.verticalAlign = VerticalTextAlignment.TOP;
    }
    if (options.password) {
      editBoxAny.inputFlag = 0;
    }

    return { node, editBox, textLabel, placeholderLabel };
  },

  createScrollText(parent: Node, options: ScrollTextOptions): {
    node: Node;
    scrollView: ScrollView;
    content: Node;
    label: Label;
  } {
    const node = new Node(options.name);
    node.setParent(parent);
    setNodeFrame(node, options.x, options.y, options.width, options.height);

    const background = this.createBox(node, {
      name: `${options.name}Background`,
      x: 0,
      y: 0,
      width: options.width,
      height: options.height,
      color: options.backgroundColor ?? new Color(23, 29, 40, 255),
      radius: options.radius,
    });
    background.setSiblingIndex(0);

    node.addComponent(Mask);
    const scrollView = node.addComponent(ScrollView);
    scrollView.horizontal = false;
    scrollView.vertical = true;
    scrollView.inertia = true;
    scrollView.brake = 0.35;
    scrollView.elastic = options.elastic ?? true;

    const padding = options.padding ?? 16;
    const innerWidth = options.width - padding * 2;
    const label = this.createLabel(node, {
      name: `${options.name}Label`,
      text: options.text,
      x: 0,
      y: 0,
      width: innerWidth,
      height: options.height - padding * 2,
      fontSize: options.fontSize ?? 18,
      color: options.color ?? new Color(219, 226, 236, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
      verticalAlign: VerticalTextAlignment.TOP,
    });
    label.overflow = Label.Overflow.RESIZE_HEIGHT;

    const labelTransform = label.node.getComponent(UITransform)!;
    const content = new Node(`${options.name}Content`);
    content.setParent(node);
    const contentTransform = content.addComponent(UITransform);
    const contentHeight = Math.max(options.height, labelTransform.height + padding * 2);
    contentTransform.setContentSize(innerWidth, contentHeight);
    label.node.setParent(content);
    label.node.setPosition(
      new Vec3(0, contentHeight / 2 - padding - labelTransform.height / 2, 0)
    );
    content.setPosition(Vec3.ZERO);

    scrollView.content = content;
    // 内容要等到这一帧布局都稳定后，再把视图拉回顶部。
    // 这样进入页面时，用户会先看到最上面的文字，而不是中间一段。
    if (options.scrollToTopOnCreate ?? true) {
      scrollView.scheduleOnce(() => {
        if (scrollView.node.isValid) {
          scrollView.scrollToTop(0);
        }
      }, 0);
    }

    return { node, scrollView, content, label };
  },
};
