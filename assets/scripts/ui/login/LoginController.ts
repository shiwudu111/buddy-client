import {
  _decorator,
  Button,
  Color,
  Component,
  EditBox,
  find,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Node,
  ResolutionPolicy,
  Sprite,
  UITransform,
  Vec3,
  VerticalTextAlignment,
  view,
} from "cc";
import { authService } from "../../services/AuthService";
import { sceneRouter } from "../../navigation/SceneRouter";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import { loginBackgroundBuilder } from "./LoginBackgroundBuilder";

const { ccclass, property } = _decorator;
const LOGIN_TEST_RESOLUTION_POLICY = ResolutionPolicy.NO_BORDER;

@ccclass("LoginController")
export class LoginController extends Component {
  @property(EditBox)
  usernameInput: EditBox | null = null;

  @property(EditBox)
  passwordInput: EditBox | null = null;

  @property(Node)
  statusLabel: Node | null = null;

  @property(Node)
  loadingNode: Node | null = null;

  private loginButton: Button | null = null;
  private registerButton: Button | null = null;
  private contentLayer: Node | null = null;
  private loginPanel: Node | null = null;
  private logoArea: Node | null = null;
  private inputArea: Node | null = null;
  private buttonRow: Node | null = null;
  private statusArea: Node | null = null;
  private currentStatusMessage = "请输入账号密码";
  private isSubmitting = false;
  private isRestoringResolution = false;
  private originalDesignWidth: number | null = null;
  private originalDesignHeight: number | null = null;
  private originalResolutionPolicy: ResolutionPolicy | number | null = null;

  onLoad(): void {
    this.captureDesignResolution();
    this.updateDesignResolution();
    const canvas = this.findCanvas();
    if (canvas) {
      loginBackgroundBuilder.ensure(canvas);
    }

    this.usernameInput ??=
      this.findNode("UsernameInput")?.getComponent(EditBox) ?? null;
    this.passwordInput ??=
      this.findNode("PasswordInput")?.getComponent(EditBox) ?? null;
    this.statusLabel ??= this.findNode("StatusLabel");
    this.loadingNode ??=
      this.findNode("LoadingNode") ?? this.findNode("LodingNode");

    const loginButtonNode = this.findNode("LoginButton");
    this.loginButton = loginButtonNode?.getComponent(Button) ?? null;
    this.loginButton?.node.off(Button.EventType.CLICK, this.onLoginClick, this);
    this.loginButton?.node.on(Button.EventType.CLICK, this.onLoginClick, this);

    const registerButtonNode =
      this.findNode("RegisterButton") ?? this.createRegisterButton();
    this.registerButton = registerButtonNode?.getComponent(Button) ?? null;
    this.registerButton?.node.off(
      Button.EventType.CLICK,
      this.onRegisterClick,
      this
    );
    this.registerButton?.node.on(
      Button.EventType.CLICK,
      this.onRegisterClick,
      this
    );

    this.configureInputs();
    this.ensureLayoutHierarchy();
    this.applyResponsiveLayout();
    view.on("canvas-resize", this.handleCanvasResize, this);
  }

  onDestroy(): void {
    view.off("canvas-resize", this.handleCanvasResize, this);
    this.restoreDesignResolution();
  }

  async start(): Promise<void> {
    this.setLoading(false);
    this.setStatus("请输入账号密码");

    const user = await authService.bootstrapSession();
    if (user) {
      this.setStatus("检测到已登录状态，正在进入主界面...");
      this.prepareSceneExit();
      sceneRouter.goToMain();
    }
  }

  async onLoginClick(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const username = this.usernameInput?.string.trim() ?? "";
    const password = this.passwordInput?.string.trim() ?? "";

    if (!username || !password) {
      this.setStatus("请填写账号和密码");
      return;
    }

    this.isSubmitting = true;
    this.setLoading(true);
    this.setStatus("登录中...");

    try {
      const result = await authService.login(username, password);

      if (!result.success || !result.data) {
        this.setStatus(result.message ?? "登录失败");
        return;
      }

      this.setStatus("登录成功，正在进入主界面...");
      this.prepareSceneExit();
      sceneRouter.goToMain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常";
      this.setStatus(message);
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }

  async onRegisterClick(): Promise<void> {
    if (this.isSubmitting) {
      return;
    }

    const username = this.usernameInput?.string.trim() ?? "";
    const password = this.passwordInput?.string.trim() ?? "";

    if (!username || !password) {
      this.setStatus("请先输入要注册的账号和密码");
      return;
    }

    if (username.length < 3 || password.length < 6) {
      this.setStatus("账号至少 3 位，密码至少 6 位");
      return;
    }

    this.isSubmitting = true;
    this.setLoading(true);
    this.setStatus("注册中...");

    try {
      const result = await authService.register(username, password);
      if (!result.success || !result.data) {
        this.setStatus(result.message ?? "注册失败");
        return;
      }

      this.setStatus("注册成功，正在进入主界面...");
      this.prepareSceneExit();
      sceneRouter.goToMain();
    } catch (error) {
      const message = error instanceof Error ? error.message : "网络异常";
      this.setStatus(message);
    } finally {
      this.isSubmitting = false;
      this.setLoading(false);
    }
  }

  onClearClick(): void {
    if (this.usernameInput) {
      this.usernameInput.string = "";
    }

    if (this.passwordInput) {
      this.passwordInput.string = "";
    }

    this.setStatus("请输入账号密码");
  }

  private findNode(name: string): Node | null {
    return this.findNodeRecursive(this.node, name) ?? this.findNodeRecursive(this.findCanvas(), name);
  }

  private findCanvas(): Node | null {
    return this.node.name === "Canvas" ? this.node : find("Canvas");
  }

  private findNodeRecursive(root: Node | null, name: string): Node | null {
    if (!root) {
      return null;
    }

    if (root.name === name) {
      return root;
    }

    for (const child of root.children) {
      const match = this.findNodeRecursive(child, name);
      if (match) {
        return match;
      }
    }

    return null;
  }

  private createRegisterButton(): Node | null {
    const parent = this.loginPanel ?? this.findCanvas() ?? this.node;
    const button = RuntimeUI.createButton(parent, {
      name: "RegisterButton",
      text: "注册并登录",
      x: 0,
      y: -40,
      width: 220,
      height: 56,
      color: new Color(49, 180, 113, 255),
      fontSize: 20,
    });
    return button.node;
  }

  private handleCanvasResize(): void {
    if (this.isRestoringResolution) {
      return;
    }

    this.updateDesignResolution();
    const canvas = this.findCanvas();
    if (canvas) {
      loginBackgroundBuilder.ensure(canvas);
    }
    this.ensureLayoutHierarchy();
    this.applyResponsiveLayout();
  }

  private configureInputs(): void {
    if (this.usernameInput) {
      this.usernameInput.maxLength = 64;
    }

    if (this.passwordInput) {
      this.passwordInput.maxLength = 64;
    }
  }

  private applyResponsiveLayout(): void {
    const metrics = this.getLayoutMetrics();
    const width = metrics.width;
    const height = metrics.height;
    const isPortrait = height > width;
    const contentLayer = this.contentLayer;
    const logoArea = this.logoArea;
    const loginPanel = this.loginPanel;
    const inputArea = this.inputArea;
    const buttonRow = this.buttonRow;
    const statusArea = this.statusArea;
    if (!contentLayer || !loginPanel || !logoArea || !inputArea || !buttonRow || !statusArea) {
      return;
    }

    const contentTransform =
      contentLayer.getComponent(UITransform) ?? contentLayer.addComponent(UITransform);
    contentTransform.setContentSize(width, height);

    const logoWidth = isPortrait ? 400 : 540;
    const logoHeight = isPortrait ? 156 : 176;
    const logoTransform =
      logoArea.getComponent(UITransform) ?? logoArea.addComponent(UITransform);
    logoTransform.setContentSize(logoWidth, logoHeight);

    const panelTransform =
      loginPanel.getComponent(UITransform) ?? loginPanel.addComponent(UITransform);
    const panelWidth = isPortrait ? 420 : 500;
    const panelHeight = isPortrait ? 280 : 290;
    panelTransform.setContentSize(panelWidth, panelHeight);

    const inputAreaTransform =
      inputArea.getComponent(UITransform) ?? inputArea.addComponent(UITransform);
    inputAreaTransform.setContentSize(356, 150);

    const buttonRowTransform =
      buttonRow.getComponent(UITransform) ?? buttonRow.addComponent(UITransform);
    buttonRowTransform.setContentSize(360, 72);

    const statusAreaTransform =
      statusArea.getComponent(UITransform) ?? statusArea.addComponent(UITransform);
    statusAreaTransform.setContentSize(width * 0.62, 76);

    const panelX = isPortrait
      ? metrics.centerX
      : metrics.centerX + metrics.width * 0.16;
    const panelY = isPortrait
      ? metrics.centerY - metrics.height * 0.18
      : metrics.centerY + metrics.height * 0.08;
    loginPanel.setPosition(new Vec3(panelX, panelY, 0));
    logoArea.setPosition(
      new Vec3(
        isPortrait ? 0 : width * 0.01,
        isPortrait ? height * 0.335 : height * 0.385,
        0
      )
    );

    this.decorateLogoArea(logoWidth, logoHeight, isPortrait);
    this.decorateLoginPanel(panelWidth, panelHeight, isPortrait);

    this.styleInputNode(this.usernameInput?.node ?? null, 336, 58);
    this.styleInputNode(this.passwordInput?.node ?? null, 336, 58);
    this.styleButtonNode(this.loginButton?.node ?? null, 156, 54, true, "登录");
    this.styleButtonNode(this.registerButton?.node ?? null, 156, 54, false, "注册");
    this.styleStatusNode(this.statusLabel, width * 0.52, 34);
    this.styleLoadingNode(this.loadingNode, 220, 24);

    this.setNodePosition(inputArea, 0, 36);
    this.setNodePosition(buttonRow, 0, -92);
    this.setNodePosition(this.usernameInput?.node ?? null, 0, 34);
    this.setNodePosition(this.passwordInput?.node ?? null, 0, -40);
    this.setNodePosition(this.loginButton?.node ?? null, -90, 0);
    this.setNodePosition(this.registerButton?.node ?? null, 90, 0);
    const statusY = -height * 0.5 + (isPortrait ? 128 : 78);
    this.setNodePosition(statusArea, 0, statusY);
    this.setNodePosition(this.statusLabel, 0, 0);
    this.setNodePosition(this.loadingNode, 0, -26);
  }

  private setNodePosition(node: Node | null, x: number, y: number): void {
    if (!node) {
      return;
    }

    node.setPosition(new Vec3(x, y, 0));
  }

  private ensureLayoutHierarchy(): void {
    const canvas = this.findCanvas();
    if (!canvas) {
      return;
    }

    this.contentLayer = loginBackgroundBuilder.ensureContentLayer(canvas);
    this.logoArea = this.ensureNamedChild(this.contentLayer, "LogoArea");
    this.loginPanel = this.ensureNamedChild(this.contentLayer, "LoginPanel");
    this.inputArea = this.ensureNamedChild(this.loginPanel, "InputArea");
    this.buttonRow = this.ensureNamedChild(this.loginPanel, "ButtonRow");
    this.statusArea = this.ensureNamedChild(this.contentLayer, "StatusArea");

    const panelTransform =
      this.loginPanel.getComponent(UITransform) ?? this.loginPanel.addComponent(UITransform);
    panelTransform.setContentSize(430, 430);
    this.ensureParent(this.usernameInput?.node ?? null, this.inputArea);
    this.ensureParent(this.passwordInput?.node ?? null, this.inputArea);
    this.ensureParent(this.loginButton?.node ?? null, this.buttonRow);
    this.ensureParent(this.registerButton?.node ?? null, this.buttonRow);
    this.ensureParent(this.statusLabel, this.statusArea);
    this.ensureParent(this.loadingNode, this.statusArea);
  }

  private ensureNamedChild(parent: Node, name: string): Node {
    let child = parent.getChildByName(name);
    if (!child) {
      child = new Node(name);
      child.setParent(parent);
    }
    return child;
  }

  private ensureParent(node: Node | null, parent: Node | null): void {
    if (!node || !parent) {
      return;
    }

    if (node.parent !== parent) {
      node.setParent(parent);
    }
  }

  private decorateLogoArea(width: number, height: number, isPortrait: boolean): void {
    if (!this.logoArea) {
      return;
    }

    const badgeShadow = this.ensureNamedChild(this.logoArea, "MascotBadgeShadow");
    this.drawRoundedBox(
      badgeShadow,
      isPortrait ? 74 : 82,
      isPortrait ? 74 : 82,
      new Color(17, 28, 46, 24),
      null,
      24
    );
    badgeShadow.setPosition(new Vec3(-width * 0.26, -4, 0));

    const badge = this.ensureNamedChild(this.logoArea, "MascotBadge");
    const badgeSize = isPortrait ? 70 : 78;
    this.drawRoundedBox(
      badge,
      badgeSize,
      badgeSize,
      new Color(255, 255, 255, 186),
      new Color(133, 182, 236, 94),
      22
    );
    badge.setPosition(new Vec3(-width * 0.26, 0, 0));

    const iconFace = this.ensureNamedChild(badge, "MascotFace");
    this.drawCircleNode(iconFace, badgeSize * 0.24, new Color(242, 151, 82, 188));
    iconFace.setPosition(new Vec3(0, 0, 0));

    const iconEarLeft = this.ensureNamedChild(badge, "MascotEarLeft");
    this.drawTriangleNode(iconEarLeft, 16, 24, new Color(242, 151, 82, 172));
    iconEarLeft.setPosition(new Vec3(-14, 16, 0));

    const iconEarRight = this.ensureNamedChild(badge, "MascotEarRight");
    this.drawTriangleNode(iconEarRight, 16, 24, new Color(242, 151, 82, 140));
    iconEarRight.setPosition(new Vec3(14, 16, 0));

    const titleNode = this.ensureNamedChild(this.logoArea, "TitleLabel");
    this.configureLabel(
      titleNode,
      "学伴精灵",
      isPortrait ? 35 : 40,
      new Color(248, 250, 255, 255),
      width - 150,
      48,
      HorizontalTextAlignment.LEFT
    );
    titleNode.setPosition(new Vec3(36, 20, 0));
    const titleLabel = titleNode.getComponent(Label);
    if (titleLabel) {
      titleLabel.enableBold = true;
    }

    const subtitleNode = this.ensureNamedChild(this.logoArea, "SubtitleLabel");
    this.configureLabel(
      subtitleNode,
      "陪你完成今天的小任务",
      isPortrait ? 17 : 18,
      new Color(223, 233, 246, 224),
      width - 150,
      30,
      HorizontalTextAlignment.LEFT
    );
    subtitleNode.setPosition(new Vec3(42, -20, 0));
  }

  private decorateLoginPanel(width: number, height: number, isPortrait: boolean): void {
    if (!this.loginPanel) {
      return;
    }

    const shadow = this.ensureNamedChild(this.loginPanel, "PanelShadow");
    this.drawRoundedBox(
      shadow,
      width + 24,
      height + 24,
      new Color(6, 12, 20, 64),
      null,
      36
    );
    shadow.setPosition(new Vec3(0, -10, 0));
    shadow.setSiblingIndex(0);

    const chrome = this.ensureNamedChild(this.loginPanel, "PanelChrome");
    this.drawRoundedBox(
      chrome,
      width,
      height,
      new Color(26, 38, 58, isPortrait ? 194 : 188),
      new Color(152, 197, 245, 74),
      32
    );
    chrome.setPosition(new Vec3(0, 0, 0));
    chrome.setSiblingIndex(1);

    const innerGlow = this.ensureNamedChild(this.loginPanel, "PanelInnerGlow");
    this.drawRoundedBox(
      innerGlow,
      width - 18,
      height - 18,
      new Color(255, 255, 255, 18),
      null,
      28
    );
    innerGlow.setPosition(new Vec3(0, 0, 0));
    innerGlow.setSiblingIndex(2);

    const topSheen = this.ensureNamedChild(this.loginPanel, "PanelTopSheen");
    this.drawRoundedBox(
      topSheen,
      width - 34,
      64,
      new Color(255, 255, 255, 14),
      null,
      24
    );
    topSheen.setPosition(new Vec3(0, height * 0.24, 0));
    topSheen.setSiblingIndex(3);
  }

  private styleInputNode(node: Node | null, width: number, height: number): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);

    const shadow = this.ensureNamedChild(node, "ChromeShadow");
    this.drawRoundedBox(
      shadow,
      width + 6,
      height + 6,
      new Color(12, 20, 34, 34),
      null,
      21
    );
    shadow.setPosition(new Vec3(0, -2, 0));
    shadow.setSiblingIndex(0);

    const chrome = this.ensureNamedChild(node, "ChromeBackground");
    this.drawRoundedBox(
      chrome,
      width,
      height,
      new Color(248, 250, 255, 236),
      new Color(152, 182, 223, 132),
      20
    );
    chrome.setPosition(new Vec3(0, 0, 0));
    chrome.setSiblingIndex(1);

    const highlight = this.ensureNamedChild(node, "ChromeHighlight");
    this.drawRoundedBox(
      highlight,
      width - 22,
      18,
      new Color(255, 255, 255, 46),
      null,
      10
    );
    highlight.setPosition(new Vec3(0, height * 0.19, 0));
    highlight.setSiblingIndex(2);

    this.styleEditBoxText(node, width, height);
  }

  private styleButtonNode(
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

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);

    const shadow = this.ensureNamedChild(node, "ChromeShadow");
    this.drawRoundedBox(
      shadow,
      width + 8,
      height + 8,
      primary ? new Color(12, 35, 24, 48) : new Color(19, 32, 51, 28),
      null,
      24
    );
    shadow.setPosition(new Vec3(0, -3, 0));
    shadow.setSiblingIndex(0);

    const chrome = this.ensureNamedChild(node, "ChromeBackground");
    this.drawRoundedBox(
      chrome,
      width,
      height,
      primary ? new Color(72, 202, 134, 255) : new Color(251, 252, 255, 236),
      primary ? new Color(176, 242, 202, 74) : new Color(115, 170, 226, 94),
      22
    );
    chrome.setPosition(new Vec3(0, 0, 0));
    chrome.setSiblingIndex(1);

    const gloss = this.ensureNamedChild(node, "ChromeGloss");
    this.drawRoundedBox(
      gloss,
      width - 20,
      primary ? 18 : 16,
      primary ? new Color(255, 255, 255, 28) : new Color(255, 255, 255, 40),
      null,
      10
    );
    gloss.setPosition(new Vec3(0, height * 0.18, 0));
    gloss.setSiblingIndex(2);

    const label = node.getComponentInChildren(Label);
    if (label) {
      label.string = text;
      label.fontSize = 24;
      label.lineHeight = 30;
      label.color = primary
        ? new Color(255, 255, 255, 255)
        : new Color(57, 107, 170, 255);
      label.enableBold = true;
    }
  }

  private styleEditBoxText(node: Node, width: number, height: number): void {
    const textLabelNode = this.findNodeRecursive(node, "TEXT_LABEL");
    const placeholderNode = this.findNodeRecursive(node, "PLACEHOLDER_LABEL");

    if (textLabelNode) {
      const label = textLabelNode.getComponent(Label) ?? textLabelNode.addComponent(Label);
      label.fontSize = 22;
      label.lineHeight = 30;
      label.color = new Color(61, 82, 112, 255);
      label.horizontalAlign = HorizontalTextAlignment.LEFT;
      label.verticalAlign = VerticalTextAlignment.CENTER;
    }

    if (placeholderNode) {
      const label =
        placeholderNode.getComponent(Label) ?? placeholderNode.addComponent(Label);
      label.fontSize = 21;
      label.lineHeight = 28;
      label.color = new Color(144, 159, 185, 210);
      label.horizontalAlign = HorizontalTextAlignment.LEFT;
      label.verticalAlign = VerticalTextAlignment.CENTER;
    }
  }

  private styleStatusNode(node: Node | null, width: number, height: number): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);
    const editBox = node.getComponent(EditBox);
    if (editBox) {
      editBox.enabled = false;
    }

    const statusText = this.ensureNamedChild(node, "StatusText");
    this.configureLabel(
      statusText,
      this.currentStatusMessage,
      18,
      this.getStatusColor(this.currentStatusMessage),
      width,
      height,
      HorizontalTextAlignment.CENTER
    );
    statusText.setPosition(new Vec3(0, 0, 0));
  }

  private styleLoadingNode(node: Node | null, width: number, height: number): void {
    if (!node) {
      return;
    }

    const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    transform.setContentSize(width, height);

    if (this.shouldKeepSceneStyle(node)) {
      return;
    }

    this.hideNodeRenderables(node);
    const editBox = node.getComponent(EditBox);
    if (editBox) {
      editBox.enabled = false;
    }

    const loadingText = this.ensureNamedChild(node, "LoadingText");
    this.configureLabel(
      loadingText,
      "正在登录，请稍候...",
      16,
      new Color(221, 229, 239, 190),
      width,
      height,
      HorizontalTextAlignment.CENTER
    );
    loadingText.setPosition(new Vec3(0, 0, 0));
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

  private shouldKeepSceneStyle(node: Node): boolean {
    if (node.getChildByName("SceneStyled")) {
      return true;
    }

    const runtimeManagedNames = new Set([
      "TEXT_LABEL",
      "PLACEHOLDER_LABEL",
      "ChromeShadow",
      "ChromeBackground",
      "ChromeHighlight",
      "ChromeGloss",
      "StatusText",
      "LoadingText",
    ]);

    return node.children.some((child) => !runtimeManagedNames.has(child.name));
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
    label.string = text;
    label.fontSize = fontSize;
    label.lineHeight = fontSize + 8;
    label.color = color;
    label.horizontalAlign = align;
    label.verticalAlign = VerticalTextAlignment.CENTER;
    label.enableWrapText = false;
  }

  private getLayoutMetrics(): {
    width: number;
    height: number;
    centerX: number;
    centerY: number;
  } {
    const visibleSize = view.getVisibleSize();
    const canvas = this.findCanvas();
    const transform = canvas?.getComponent(UITransform);
    const width = visibleSize.width || transform?.width || 1280;
    const height = visibleSize.height || transform?.height || 720;

    return {
      width,
      height,
      centerX: 0,
      centerY: 0,
    };
  }

  private updateDesignResolution(): void {
    const frameSize = view.getFrameSize();
    const isPortrait = frameSize.height > frameSize.width;
    const width = isPortrait ? 720 : 1280;
    const height = isPortrait ? 1280 : 720;
    view.setDesignResolutionSize(width, height, LOGIN_TEST_RESOLUTION_POLICY);
  }

  private captureDesignResolution(): void {
    if (this.originalDesignWidth !== null && this.originalDesignHeight !== null) {
      return;
    }

    const size = view.getDesignResolutionSize();
    this.originalDesignWidth = size.width;
    this.originalDesignHeight = size.height;
    this.originalResolutionPolicy = view.getResolutionPolicy();
  }

  private restoreDesignResolution(): void {
    if (
      this.originalDesignWidth === null ||
      this.originalDesignHeight === null ||
      this.originalResolutionPolicy === null
    ) {
      return;
    }

    view.setDesignResolutionSize(
      this.originalDesignWidth,
      this.originalDesignHeight,
      this.originalResolutionPolicy
    );
  }

  private prepareSceneExit(): void {
    this.isRestoringResolution = true;
    view.off("canvas-resize", this.handleCanvasResize, this);
    this.restoreDesignResolution();
  }

  private setStatus(message: string): void {
    this.currentStatusMessage = message;

    if (!this.statusLabel) {
      return;
    }

    const statusText = this.findNodeRecursive(this.statusLabel, "StatusText");
    const statusTextLabel = statusText?.getComponent(Label) ?? null;
    if (statusTextLabel) {
      statusTextLabel.string = message;
      statusTextLabel.color = message.includes("鎴愬姛")
        ? new Color(86, 205, 134, 255)
        : message.includes("澶辫触") || message.includes("璇?")
        ? new Color(255, 125, 125, 255)
        : new Color(235, 239, 244, 255);
      return;
    }

    const label = this.statusLabel.getComponent(Label);
    if (label) {
      label.string = message;
      label.color = message.includes("成功")
        ? new Color(86, 205, 134, 255)
        : message.includes("失败") || message.includes("请")
        ? new Color(255, 125, 125, 255)
        : new Color(235, 239, 244, 255);
      return;
    }

    const editBox = this.statusLabel.getComponent(EditBox);
    if (editBox) {
      editBox.string = message;
      return;
    }

    const childLabel = this.statusLabel.getComponentInChildren(Label);
    if (childLabel) {
      childLabel.string = message;
    }
  }

  private getStatusColor(message: string): Color {
    if (message.includes("成功")) {
      return new Color(86, 205, 134, 255);
    }

    if (
      message.includes("失败") ||
      message.includes("错误") ||
      message.includes("异常")
    ) {
      return new Color(255, 125, 125, 255);
    }

    return new Color(235, 239, 244, 255);
  }

  private setLoading(loading: boolean): void {
    if (this.loadingNode) {
      this.loadingNode.active = loading;
    }

    if (this.loginButton) {
      this.loginButton.interactable = !loading;
    }

    if (this.registerButton) {
      this.registerButton.interactable = !loading;
    }
  }
}
