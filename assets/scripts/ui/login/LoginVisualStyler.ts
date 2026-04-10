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

const BUTTON_CHROME_NODE_NAMES = new Set([
  "ChromeShadow",
  "ChromeBackground",
  "ChromeGloss",
]);

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
  decorateLogoArea(logoArea: Node, options: LogoDecorationOptions): void {
    if (options.logoSpriteFrame) {
      this.renderImageLogo(logoArea, options);
      return;
    }

    removeNode(logoArea.getChildByName("BrandLogo"));
    this.renderPlaceholderLogo(logoArea, options.width, options.height, options.isPortrait);
  }

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

  styleStatusNode(
    node: Node | null,
    width: number,
    height: number,
    message: string,
    color: Color
  ): void {
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
      titleLabel.enableBold = true;
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

  private syncButtonLabel(
    node: Node,
    width: number,
    height: number,
    primary: boolean,
    text: string
  ): void {
    const labelNode = this.findButtonLabelNode(node) ?? ensureNamedChild(node, "ButtonLabel");
    this.configureLabel(
      labelNode,
      text,
      24,
      themeColor(primary ? LOGIN_THEME.button.textPrimary : LOGIN_THEME.button.textSecondary),
      width - 20,
      height,
      HorizontalTextAlignment.CENTER
    );

    const label = labelNode.getComponent(Label);
    if (label) {
      label.enableBold = true;
    }

    labelNode.setPosition(Vec3.ZERO);
    labelNode.setSiblingIndex(node.children.length - 1);
  }

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

  private shouldKeepSceneStyle(node: Node): boolean {
    if (node.getChildByName("SceneStyled")) {
      return true;
    }

    return node.children.some(
      (child) => !RUNTIME_MANAGED_STYLE_NODE_NAMES.has(child.name)
    );
  }

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

  private drawCircleNode(node: Node, radius: number, color: Color): void {
    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(radius * 2 + 8, radius * 2 + 8);

    const graphics = node.getComponent(Graphics) ?? node.addComponent(Graphics);
    graphics.clear();
    graphics.fillColor = color;
    graphics.circle(0, 0, radius);
    graphics.fill();
  }

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
