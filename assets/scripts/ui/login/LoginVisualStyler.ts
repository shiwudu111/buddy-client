import {
  Color,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  Sprite,
  SpriteFrame,
  UITransform,
  Vec3,
  VerticalTextAlignment,
} from "cc";
import { findNodeInTree } from "./LoginSceneStructure";
import { LOGIN_THEME, themeColor } from "./LoginViewConfig";

// 文件整体作用：
// 这是登录页的“运行时样式师”。
// 它不决定按钮在哪，也不决定点按钮后做什么，只负责把按钮、输入框、面板、logo 画得像设计稿。
//
// 一句话版本：
// 这段代码的核心意思就是：专门负责把登录页的按钮、输入框、卡片和 logo 画成现在这套视觉风格。
//
// 美术需要关注的重点：
// 1. 这里创建的 ChromeShadow / ChromeBackground / PanelShadow 等节点，都是样式层，不是业务层。
// 2. 如果你在场景里手工做了静态样式，可能会被这里覆盖；SceneStyled 是其中一个接管标记。
// 3. 文案颜色、按钮层次、账号条高光、卡片阴影，都主要看这里。
type LogoImageLayout = {
  maxWidthFactor: number;
  maxHeightFactor: number;
  y: number;
};

type LogoDecorationOptions = {
  width: number;
  height: number;
  isPortrait: boolean;
  logoSpriteFrame: SpriteFrame | null;
  logoImageLayout: LogoImageLayout;
};

// 这些节点名用于跳过“真正的业务文案节点”查找，
// 避免把按钮自身的阴影/底板/高光误判成文本节点。
const BUTTON_CHROME_NODE_NAMES = new Set([
  "ChromeShadow",
  "ChromeBackground",
  "ChromeGloss",
]);

// 运行时样式系统自己创建的子节点名。
// shouldKeepSceneStyle() 会用它判断当前节点是不是“纯运行时样式节点”。
// 后续如果你新增了新的运行时装饰节点，但没有加到这里，
// 逻辑会误以为这是场景手工样式，从而跳过代码绘制。
const RUNTIME_MANAGED_STYLE_NODE_NAMES = new Set([
  "TEXT_LABEL",
  "PLACEHOLDER_LABEL",
  "ChromeShadow",
  "ChromeBackground",
  "ChromeHighlight",
  "ChromeGloss",
  "StatusText",
  "LoadingText",
  "ButtonLabel",
  "BrandLogo",
  "MascotBadgeShadow",
  "MascotBadge",
  "MascotFace",
  "MascotEarLeft",
  "MascotEarRight",
  "TitleLabel",
  "SubtitleLabel",
  "PanelShadow",
  "PanelChrome",
  "PanelInnerGlow",
  "PanelTopSheen",
  "EntryShadow",
  "EntryFadeLeft",
  "EntryFadeRight",
  "EntryBar",
  "EntrySheen",
  "EntryDot",
  "EntryLabel",
  "EntryAction",
]);

function ensureNamedChild(parent: Node, name: string): Node {
  let child = parent.getChildByName(name);
  if (!child) {
    child = new Node(name);
    child.setParent(parent);
  }
  return child;
}

function removeNode(node: Node | null | undefined): void {
  if (!node) {
    return;
  }

  node.removeFromParent();
  node.destroy();
}

class LoginVisualStyler {
  // Login 页 logo 区的唯一入口。
  // 有正式 logo 资源时走图片；没有时走代码绘制的占位 logo。
  decorateLogoArea(logoArea: Node, options: LogoDecorationOptions): void {
    if (options.logoSpriteFrame) {
      this.renderImageLogo(logoArea, options);
      return;
    }

    removeNode(logoArea.getChildByName("BrandLogo"));
    this.renderPlaceholderLogo(logoArea, options.width, options.height, options.isPortrait);
  }

  // 登录卡片的外观由 4 层构成：
  // 1. PanelShadow: 卡片外阴影，决定厚度感
  // 2. PanelChrome: 主体底板，决定卡片真实尺寸
  // 3. PanelInnerGlow: 内层提亮，避免卡片太“闷”
  // 4. PanelTopSheen: 顶部浅高光，增加一点空气感
  //
  // 后期调参建议：
  // - 想让卡片更“厚”：增大 shadow 尺寸或下移量
  // - 想让卡片更“轻”：降低 shadow alpha / innerGlow alpha
  // - 想让卡片更“柔”：增大 rounded radius
  decorateLoginPanel(loginPanel: Node, width: number, height: number, isPortrait: boolean): void {
    const shadow = ensureNamedChild(loginPanel, "PanelShadow");
    this.drawRoundedBox(
      shadow,
      width + 24,
      height + 24,
      themeColor(LOGIN_THEME.panel.shadow),
      null,
      36
    );
    shadow.setPosition(new Vec3(0, -10, 0));
    shadow.setSiblingIndex(0);

    const chrome = ensureNamedChild(loginPanel, "PanelChrome");
    this.drawRoundedBox(
      chrome,
      width,
      height,
      themeColor(isPortrait ? LOGIN_THEME.panel.fillPortrait : LOGIN_THEME.panel.fillLandscape),
      themeColor(LOGIN_THEME.panel.stroke),
      32
    );
    chrome.setPosition(new Vec3(0, 0, 0));
    chrome.setSiblingIndex(1);

    const innerGlow = ensureNamedChild(loginPanel, "PanelInnerGlow");
    this.drawRoundedBox(
      innerGlow,
      width - 18,
      height - 18,
      themeColor(LOGIN_THEME.panel.innerGlow),
      null,
      28
    );
    innerGlow.setPosition(new Vec3(0, 0, 0));
    innerGlow.setSiblingIndex(2);

    const topSheen = ensureNamedChild(loginPanel, "PanelTopSheen");
    this.drawRoundedBox(
      topSheen,
      width - 34,
      64,
      themeColor(LOGIN_THEME.panel.topSheen),
      null,
      24
    );
    topSheen.setPosition(new Vec3(0, height * 0.24, 0));
    topSheen.setSiblingIndex(3);
  }

  // 输入框的代码样式只负责底板，不负责具体输入逻辑。
  // 这里的 width/height 来自布局层，所以你想改视觉尺寸时：
  // - “只改造型比例”可以调这里
  // - “连同占位和交互热区一起改”应该优先改 LoginLayoutCalculator / LoginViewConfig
  styleInputNode(node: Node | null, width: number, height: number): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);

    const shadow = ensureNamedChild(node, "ChromeShadow");
    this.drawRoundedBox(
      shadow,
      width + 6,
      height + 6,
      themeColor(LOGIN_THEME.input.shadow),
      null,
      21
    );
    shadow.setPosition(new Vec3(0, -2, 0));
    shadow.setSiblingIndex(0);

    const chrome = ensureNamedChild(node, "ChromeBackground");
    this.drawRoundedBox(
      chrome,
      width,
      height,
      themeColor(LOGIN_THEME.input.fill),
      themeColor(LOGIN_THEME.input.stroke),
      20
    );
    chrome.setPosition(new Vec3(0, 0, 0));
    chrome.setSiblingIndex(1);

    const highlight = ensureNamedChild(node, "ChromeHighlight");
    this.drawRoundedBox(
      highlight,
      width - 22,
      18,
      themeColor(LOGIN_THEME.input.highlight),
      null,
      10
    );
    highlight.setPosition(new Vec3(0, height * 0.19, 0));
    highlight.setSiblingIndex(2);

    this.styleEditBoxText(node);
  }

  // 通用按钮样式器。
  // primary=true 用于主按钮，primary=false 用于次级按钮。
  // 这套按钮目前由 3 层组成：阴影、主体、顶部高光。
  //
  // 后期调参建议：
  // - 宽高由布局层控制
  // - 按钮“存在感”主要看 fill/stroke/shadow 的颜色和透明度
  // - 如果你觉得文字太大/太小，优先看 syncButtonLabel()
  styleButtonNode(
    node: Node | null,
    width: number,
    height: number,
    primary: boolean,
    text: string
  ): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);
    this.syncButtonLabel(node, width, height, primary, text);

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);

    const shadow = ensureNamedChild(node, "ChromeShadow");
    this.drawRoundedBox(
      shadow,
      width + 8,
      height + 8,
      themeColor(primary ? LOGIN_THEME.button.shadowPrimary : LOGIN_THEME.button.shadowSecondary),
      null,
      24
    );
    shadow.setPosition(new Vec3(0, -3, 0));
    shadow.setSiblingIndex(0);

    const chrome = ensureNamedChild(node, "ChromeBackground");
    this.drawRoundedBox(
      chrome,
      width,
      height,
      themeColor(primary ? LOGIN_THEME.button.fillPrimary : LOGIN_THEME.button.fillSecondary),
      themeColor(primary ? LOGIN_THEME.button.strokePrimary : LOGIN_THEME.button.strokeSecondary),
      22
    );
    chrome.setPosition(new Vec3(0, 0, 0));
    chrome.setSiblingIndex(1);

    const gloss = ensureNamedChild(node, "ChromeGloss");
    this.drawRoundedBox(
      gloss,
      width - 20,
      primary ? 18 : 16,
      themeColor(primary ? LOGIN_THEME.button.glossPrimary : LOGIN_THEME.button.glossSecondary),
      null,
      10
    );
    gloss.setPosition(new Vec3(0, height * 0.18, 0));
    gloss.setSiblingIndex(2);

  }

  // 品牌入口的账号条样式器。
  //
  // 这个区域现在是“中间主体 + 两侧渐隐 + 左侧状态点 + 两段文字”的结构：
  // - EntryShadow: 整条的外阴影，负责把账号条从背景里托出来
  // - EntryFadeLeft / EntryFadeRight: 两侧羽化区，模拟参考图的渐隐效果
  // - EntryBar: 中间真正可见的深色主体
  // - EntrySheen: 顶部轻微发亮，避免主体太死黑
  // - EntryDot: 左侧在线点
  // - EntryLabel: 账号文案
  // - EntryAction: 右侧“点击切换”
  //
  // 后期最常调的几个数字：
  // - width - 104: 阴影长度。数值越小，阴影越长
  // - width - 148: 中间主体长度。数值越小，主体越长
  // - width * 0.31: 左右渐隐整体离中心多远
  // - 220: 账号文案可用宽度，长账号显示不下时优先改这里
  // - 80: 右侧动作文案宽度，想让“点击切换”更稳可再加大
  styleAccountEntryNode(node: Node | null, width: number, height: number, text: string): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    this.hideNodeRenderables(node);
    this.disableLegacyLabels(node, ["EntryLabel", "EntryAction"]);

    const shadow = ensureNamedChild(node, "EntryShadow");
    this.drawRectBox(shadow, width - 104, height + 10, new Color(6, 14, 24, 26), null);
    shadow.setPosition(new Vec3(0, -1, 0));
    shadow.setSiblingIndex(0);

    // 两侧羽化不直接画 alpha 渐变贴图，
    // 而是用几层不同宽度/透明度的矩形叠出来。
    // 好处是参数都在代码里，后期可直接调。
    const fadeLeft = ensureNamedChild(node, "EntryFadeLeft");
    this.renderAccountEntryFade(fadeLeft, "left", height);
    fadeLeft.setPosition(new Vec3(-width * 0.31, 0, 0));
    fadeLeft.setSiblingIndex(1);

    const fadeRight = ensureNamedChild(node, "EntryFadeRight");
    this.renderAccountEntryFade(fadeRight, "right", height);
    fadeRight.setPosition(new Vec3(width * 0.31, 0, 0));
    fadeRight.setSiblingIndex(2);

    const bar = ensureNamedChild(node, "EntryBar");
    this.drawRectBox(bar, width - 148, height - 8, new Color(16, 22, 31, 108), null);
    bar.setPosition(Vec3.ZERO);
    bar.setSiblingIndex(3);

    const sheen = ensureNamedChild(node, "EntrySheen");
    this.drawRectBox(sheen, width - 220, 10, new Color(255, 255, 255, 12), null);
    sheen.setPosition(new Vec3(0, height * 0.18, 0));
    sheen.setSiblingIndex(4);

    const dot = ensureNamedChild(node, "EntryDot");
    this.drawCircleNode(dot, 6, new Color(95, 231, 92, 255));
    dot.setPosition(new Vec3(-width * 0.34, 0, 0));
    dot.setSiblingIndex(5);

    const title = ensureNamedChild(node, "EntryLabel");
    this.configureLabel(
      title,
      text,
      18,
      new Color(238, 244, 252, 235),
      220,
      height,
      HorizontalTextAlignment.LEFT
    );
    const titleLabel = title.getComponent(Label);
    if (titleLabel) {
      // 账号条宽度固定，但账号名长度不可控，
      // 所以这里用 SHRINK 而不是 WRAP，避免它挤压右侧“点击切换”。
      titleLabel.overflow = Label.Overflow.SHRINK;
    }
    title.setPosition(new Vec3(-10, 0, 0));
    title.setSiblingIndex(6);

    const action = ensureNamedChild(node, "EntryAction");
    this.configureLabel(
      action,
      "点击切换",
      13,
      new Color(238, 244, 252, 158),
      80,
      height,
      HorizontalTextAlignment.RIGHT
    );
    action.setPosition(new Vec3(width * 0.31, 0, 0));
    action.setSiblingIndex(7);
  }

  // 状态提示只负责显示“当前状态文案 + 颜色”，
  // 不负责布局位置。位置和尺寸在布局层控制。
  styleStatusNode(
    node: Node | null,
    width: number,
    height: number,
    message: string,
    color: Color
  ): void {
    // 给状态提示区写文案并上色。
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);
    this.disableLegacyLabels(node, ["StatusText"]);

    const statusText = ensureNamedChild(node, "StatusText");
    this.configureLabel(
      statusText,
      message,
      18,
      color,
      width,
      height,
      HorizontalTextAlignment.CENTER
    );
    statusText.setPosition(Vec3.ZERO);
  }

  // Loading 文案目前是极简方案，只保留一行文字。
  // 如果后面要改成点点动画或 spinner，这里是替换入口。
  styleLoadingNode(node: Node | null, width: number, height: number): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);
    this.disableLegacyLabels(node, ["LoadingText"]);

    const loadingText = ensureNamedChild(node, "LoadingText");
    this.configureLabel(
      loadingText,
      "正在登录，请稍候...",
      16,
      themeColor(LOGIN_THEME.loading.text),
      width,
      height,
      HorizontalTextAlignment.CENTER
    );
    loadingText.setPosition(Vec3.ZERO);
  }

  // 当正式 logo 资源还没加载成功时，使用代码画一个可兜底的临时 logo。
  // 这里所有数字基本都是视觉比例参数，不影响布局热区。
  private renderPlaceholderLogo(
    logoArea: Node,
    width: number,
    height: number,
    isPortrait: boolean
  ): void {
    const badgeShadow = ensureNamedChild(logoArea, "MascotBadgeShadow");
    this.drawRoundedBox(
      badgeShadow,
      isPortrait ? 74 : 82,
      isPortrait ? 74 : 82,
      themeColor(LOGIN_THEME.logo.badgeShadow),
      null,
      24
    );
    badgeShadow.setPosition(new Vec3(-width * 0.26, -4, 0));

    const badge = ensureNamedChild(logoArea, "MascotBadge");
    const badgeSize = isPortrait ? 70 : 78;
    this.drawRoundedBox(
      badge,
      badgeSize,
      badgeSize,
      themeColor(LOGIN_THEME.logo.badgeFill),
      themeColor(LOGIN_THEME.logo.badgeStroke),
      22
    );
    badge.setPosition(new Vec3(-width * 0.26, 0, 0));

    const iconFace = ensureNamedChild(badge, "MascotFace");
    this.drawCircleNode(iconFace, badgeSize * 0.24, themeColor(LOGIN_THEME.logo.iconFace));
    iconFace.setPosition(Vec3.ZERO);

    const iconEarLeft = ensureNamedChild(badge, "MascotEarLeft");
    this.drawTriangleNode(iconEarLeft, 16, 24, themeColor(LOGIN_THEME.logo.iconEarLeft));
    iconEarLeft.setPosition(new Vec3(-14, 16, 0));

    const iconEarRight = ensureNamedChild(badge, "MascotEarRight");
    this.drawTriangleNode(iconEarRight, 16, 24, themeColor(LOGIN_THEME.logo.iconEarRight));
    iconEarRight.setPosition(new Vec3(14, 16, 0));

    const titleNode = ensureNamedChild(logoArea, "TitleLabel");
    this.configureLabel(
      titleNode,
      "学伴精灵",
      isPortrait ? 35 : 40,
      themeColor(LOGIN_THEME.logo.title),
      width - 150,
      48,
      HorizontalTextAlignment.LEFT
    );
    titleNode.setPosition(new Vec3(36, 20, 0));
    const titleLabel = titleNode.getComponent(Label);
    if (titleLabel) {
      (titleLabel as unknown as { enableBold?: boolean }).enableBold = true;
    }

    const subtitleNode = ensureNamedChild(logoArea, "SubtitleLabel");
    this.configureLabel(
      subtitleNode,
      "陪你完成今天的小任务",
      isPortrait ? 17 : 18,
      themeColor(LOGIN_THEME.logo.subtitle),
      width - 150,
      30,
      HorizontalTextAlignment.LEFT
    );
    subtitleNode.setPosition(new Vec3(42, -20, 0));
  }

  // 正式 logo 使用 SpriteFrame，按可用区域等比缩放。
  // maxWidthFactor / maxHeightFactor 来自 LoginViewConfig，
  // 适合在那里统一控制横竖屏占比。
  private renderImageLogo(logoArea: Node, options: LogoDecorationOptions): void {
    ["MascotBadgeShadow", "MascotBadge", "TitleLabel", "SubtitleLabel"].forEach((name) =>
      removeNode(logoArea.getChildByName(name))
    );

    const logoNode = ensureNamedChild(logoArea, "BrandLogo");
    const sprite = logoNode.getComponent(Sprite) ?? logoNode.addComponent(Sprite);
    sprite.spriteFrame = options.logoSpriteFrame;
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;

    const maxWidth = options.width * options.logoImageLayout.maxWidthFactor;
    const maxHeight = options.height * options.logoImageLayout.maxHeightFactor;
    const sourceRect = options.logoSpriteFrame!.rect;
    const fitScale = Math.min(maxWidth / sourceRect.width, maxHeight / sourceRect.height);
    const logoWidth = sourceRect.width * fitScale;
    const logoHeight = sourceRect.height * fitScale;

    const transform = logoNode.getComponent(UITransform) ?? logoNode.addComponent(UITransform);
    transform.setContentSize(logoWidth, logoHeight);
    logoNode.setPosition(new Vec3(0, options.logoImageLayout.y, 0));
  }

  // 统一设置 EditBox 内部的真实文字和 placeholder 样式。
  // 如果后期你觉得输入字太大/太灰/离左边太近，优先看这里。
  private styleEditBoxText(node: Node): void {
    const textLabelNode = findNodeInTree(node, "TEXT_LABEL");
    const placeholderNode = findNodeInTree(node, "PLACEHOLDER_LABEL");

    if (textLabelNode) {
      const label = textLabelNode.getComponent(Label) ?? textLabelNode.addComponent(Label);
      label.fontSize = 22;
      label.lineHeight = 30;
      label.color = themeColor(LOGIN_THEME.input.text);
      label.horizontalAlign = HorizontalTextAlignment.LEFT;
      label.verticalAlign = VerticalTextAlignment.CENTER;
    }

    if (placeholderNode) {
      const label =
        placeholderNode.getComponent(Label) ?? placeholderNode.addComponent(Label);
      label.fontSize = 21;
      label.lineHeight = 28;
      label.color = themeColor(LOGIN_THEME.input.placeholder);
      label.horizontalAlign = HorizontalTextAlignment.LEFT;
      label.verticalAlign = VerticalTextAlignment.CENTER;
    }
  }

  // 查找按钮真正应该显示的文案节点。
  // 这里会主动跳过阴影/底板/高光层，避免把 chrome 节点误当成按钮文字。
  private findButtonLabelNode(root: Node): Node | null {
    const visit = (node: Node): Node | null => {
      if (!BUTTON_CHROME_NODE_NAMES.has(node.name) && node.getComponent(Label)) {
        return node;
      }

      for (const child of node.children) {
        const match = visit(child);
        if (match) {
          return match;
        }
      }

      return null;
    };

    for (const child of root.children) {
      const match = visit(child);
      if (match) {
        return match;
      }
    }

    return null;
  }

  // 统一同步按钮文案。
  // 这里主要控制：
  // - 字号：宽度较小时自动缩到 20
  // - 颜色：主/次按钮不同
  // - 对齐：始终居中
  private syncButtonLabel(
    node: Node,
    width: number,
    height: number,
    primary: boolean,
    text: string
  ): void {
    const fontSize = width < 132 ? 20 : 24;
    const labelNode = this.findButtonLabelNode(node) ?? ensureNamedChild(node, "ButtonLabel");
    this.configureLabel(
      labelNode,
      text,
      fontSize,
      themeColor(primary ? LOGIN_THEME.button.textPrimary : LOGIN_THEME.button.textSecondary),
      width - 20,
      height,
      HorizontalTextAlignment.CENTER
    );

    const label = labelNode.getComponent(Label);
    if (label) {
      (label as unknown as { enableBold?: boolean }).enableBold = true;
    }

    labelNode.setPosition(Vec3.ZERO);
    labelNode.setSiblingIndex(node.children.length - 1);
  }

  // 关闭场景里可能自带的 Sprite / Graphics。
  // 这样可以避免“场景已有底板 + 代码又画一层底板”的重影问题。
  private hideNodeRenderables(node: Node): void {
    const sprite = node.getComponent(Sprite);
    if (sprite) {
      sprite.enabled = false;
    }

    const graphics = node.getComponent(Graphics);
    if (graphics) {
      graphics.clear();
      graphics.enabled = false;
    }
  }

  // 禁用历史遗留 Label，保留当前样式器需要接管的少量节点。
  // 典型用途：账号条原本可能挂了旧 ButtonLabel，这里会把它静默关掉。
  private disableLegacyLabels(node: Node, keepNames: string[]): void {
    const keepSet = new Set(keepNames);
    const visit = (current: Node): void => {
      if (!keepSet.has(current.name)) {
        const label = current.getComponent(Label);
        if (label) {
          label.enabled = false;
        }
      }

      for (const child of current.children) {
        visit(child);
      }
    };

    visit(node);
  }

  // 如果场景里已经做了明确的静态样式接管，就不要再用代码重画。
  //
  // 目前两种情况会返回 true：
  // 1. 节点下存在 SceneStyled 子节点，表示手工声明“此节点已由场景接管”
  // 2. 节点下存在不属于运行时样式系统的子节点，表示场景里已经做了自己的结构
  private shouldKeepSceneStyle(node: Node): boolean {
    // 如果某个节点被标记成“场景手工接管样式”，这里就不再重画。
    if (node.getChildByName("SceneStyled")) {
      return true;
    }

    return node.children.some(
      (child) => !RUNTIME_MANAGED_STYLE_NODE_NAMES.has(child.name)
    );
  }

  // 画圆角矩形底板的通用 helper。
  // 用在登录卡片、输入框、按钮等需要“软边”视觉的区域。
  //
  // 调参经验：
  // - radius 越大越柔和
  // - strokeColor 设 null 就是纯填充块
  private drawRoundedBox(
    node: Node,
    width: number,
    height: number,
    fillColor: Color,
    strokeColor: Color | null,
    radius: number
  ): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fillColor;
    graphics.roundRect(-width / 2, -height / 2, width, height, radius);
    graphics.fill();

    if (strokeColor) {
      graphics.strokeColor = strokeColor;
      graphics.lineWidth = 2;
      graphics.roundRect(-width / 2, -height / 2, width, height, radius);
      graphics.stroke();
    }
  }

  // 账号条两侧的“渐隐”不是 shader，而是 3 层矩形叠加：
  // - Outer: 最宽、最淡，负责把边缘拖开
  // - Middle: 中间过渡
  // - Inner: 最靠近主体、最实
  //
  // 想让羽化更明显：
  // - 增大各层 width
  // - 拉开 offsetX
  // - 提高 alpha
  //
  // 想让羽化更克制：
  // - 反向调整即可
  private renderAccountEntryFade(
    container: Node,
    direction: "left" | "right",
    height: number
  ): void {
    const transform = container.getComponent(UITransform) ?? container.addComponent(UITransform);
    transform.setContentSize(92, height);

    const directionSign = direction === "left" ? -1 : 1;
    const layers = [
      { name: "Outer", width: 88, alpha: 12, offsetX: -18 },
      { name: "Middle", width: 62, alpha: 24, offsetX: -6 },
      { name: "Inner", width: 38, alpha: 38, offsetX: 8 },
    ] as const;

    layers.forEach((layer, index) => {
      const node = ensureNamedChild(container, layer.name);
      this.drawRectBox(
        node,
        layer.width,
        height - 10,
        new Color(16, 22, 31, layer.alpha),
        null
      );
      node.setPosition(new Vec3(directionSign * layer.offsetX, 0, 0));
      node.setSiblingIndex(index);
    });
  }

  // 直边矩形 helper。
  // 目前主要给账号条这类“不要圆角”的元素使用。
  private drawRectBox(
    node: Node,
    width: number,
    height: number,
    fillColor: Color,
    strokeColor: Color | null
  ): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = fillColor;
    graphics.rect(-width / 2, -height / 2, width, height);
    graphics.fill();

    if (strokeColor) {
      graphics.strokeColor = strokeColor;
      graphics.lineWidth = 2;
      graphics.rect(-width / 2, -height / 2, width, height);
      graphics.stroke();
    }
  }

  // 画圆点，当前用于账号条左侧的绿色在线点和占位 logo 中的脸部元素。
  private drawCircleNode(node: Node, radius: number, color: Color): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(radius * 2 + 8, radius * 2 + 8);

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = color;
    graphics.circle(0, 0, radius);
    graphics.fill();
  }

  // 画三角形，当前只用于占位 logo 的耳朵。
  private drawTriangleNode(node: Node, width: number, height: number, color: Color): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width + 8, height + 8);

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = color;
    graphics.moveTo(0, height / 2);
    graphics.lineTo(-width / 2, -height / 2);
    graphics.lineTo(width / 2, -height / 2);
    graphics.close();
    graphics.fill();
  }

  // Label 的统一配置入口。
  // 后期如果你想整体改文案的 lineHeight / 是否允许换行 / 对齐规则，
  // 可以先从这里看起。
  private configureLabel(
    node: Node,
    text: string,
    fontSize: number,
    color: Color,
    width: number,
    height: number,
    align: HorizontalTextAlignment
  ): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    const label = node.getComponent(Label) ?? node.addComponent(Label);
    label.enabled = true;
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.color = color;
    label.horizontalAlign = align;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.enableWrapText = false;
  }
}

export const loginVisualStyler = new LoginVisualStyler();
