import {
  Color,
  Graphics,
  Node,
  resources,
  Sprite,
  SpriteFrame,
  UITransform,
  Vec3,
  view,
} from "cc";
import {
  resolveLoginViewportMetrics,
  type LoginViewportMetrics,
} from "./LoginLayoutCalculator";
import { ensureLoginPageHierarchy } from "./LoginSceneStructure";

// 文件整体作用：
// 这是登录页背景层的专用搭建器。
// 它负责把森林背景图、渐变底色、雾感光斑这些“背景气氛层”拼出来。
//
// 一句话版本：
// 这段代码的核心意思就是：把登录页的背景气氛层现场搭出来，包括背景图、渐变、雾气和发光点。
//
// 美术需要关注的重点：
// 1. BackgroundLayer 下的很多节点是运行时生成的，不是场景里手摆的。
// 2. ForestBackground / BgGradient / BottomGlow / AmbientShapes 这些名字不要随便改。
// 3. 如果正式背景图没加载成功，这里会先用代码画一个兜底渐变，不会直接黑屏。
const FOREST_BACKGROUND_PATH = "login/login-forest-bg/spriteFrame";
const DEFAULT_FOREST_WIDTH = 1536;
const DEFAULT_FOREST_HEIGHT = 1024;

type Size = {
  width: number;
  height: number;
};

type BackgroundLayout = {
  width: number;
  height: number;
  x: number;
  y: number;
};

function ensureTransform(node: Node, width: number, height: number): UITransform {
  const transform = node.getComponent(UITransform) ?? node.addComponent(UITransform);
  transform.setContentSize(width, height);
  return transform;
}

function ensureChild(parent: Node, name: string, siblingIndex?: number): Node {
  let child = parent.getChildByName(name);
  if (!child) {
    child = new Node(name);
    child.setParent(parent);
  }

  if (typeof siblingIndex === "number") {
    child.setSiblingIndex(siblingIndex);
  }

  return child;
}

function ensureGraphics(node: Node): Graphics {
  return node.getComponent(Graphics) ?? node.addComponent(Graphics);
}

function drawRect(node: Node, width: number, height: number, color: Color): void {
  ensureTransform(node, width, height);
  const graphics = ensureGraphics(node);
  graphics.clear();
  graphics.fillColor = color;
  graphics.rect(-width / 2, -height / 2, width, height);
  graphics.fill();
}

function drawCircle(node: Node, radius: number, color: Color): void {
  ensureTransform(node, radius * 2 + 8, radius * 2 + 8);
  const graphics = ensureGraphics(node);
  graphics.clear();
  graphics.fillColor = color;
  graphics.circle(0, 0, radius);
  graphics.fill();
}

function lerpColor(from: Color, to: Color, t: number): Color {
  return new Color(
    Math.round(from.r + (to.r - from.r) * t),
    Math.round(from.g + (to.g - from.g) * t),
    Math.round(from.b + (to.b - from.b) * t),
    Math.round(from.a + (to.a - from.a) * t)
  );
}

class LoginBackgroundBuilder {
  // backgroundSpriteFrame：正式背景图资源。
  private backgroundSpriteFrame: SpriteFrame | null = null;
  // isLoadingBackground：防止重复加载背景图。
  private isLoadingBackground = false;
  // activeCanvas：当前登录页所在的 Canvas，用于背景图加载完成后重新刷新。
  private activeCanvas: Node | null = null;

  ensure(canvas: Node): void {
    // 确保登录页背景层完整存在并完成绘制。
    this.activeCanvas = canvas;
    const metrics = this.getLayoutMetrics(canvas);

    const { loginPage, backgroundLayer } = ensureLoginPageHierarchy(canvas);
    loginPage.setPosition(Vec3.ZERO);
    ensureTransform(loginPage, metrics.width, metrics.height);
    backgroundLayer.setPosition(Vec3.ZERO);
    ensureTransform(backgroundLayer, metrics.width, metrics.height);

    this.drawFallbackGradient(backgroundLayer, metrics);
    this.ensureForestBackground(backgroundLayer, metrics);
    this.drawForestOverlays(backgroundLayer, metrics);
    this.drawAmbientShapes(backgroundLayer, metrics);
    this.destroyLegacyFoxNodes(backgroundLayer);
  }

  private getLayoutMetrics(canvas: Node): LoginViewportMetrics {
    const visibleSize = view.getVisibleSize();
    const canvasTransform = canvas.getComponent(UITransform);
    return resolveLoginViewportMetrics(
      visibleSize,
      canvasTransform?.width,
      canvasTransform?.height
    );
  }

  private drawFallbackGradient(parent: Node, size: Size): void {
    // 正式森林图还没准备好时，先画一层渐变当兜底背景。
    const node = ensureChild(parent, "BgGradient", 0);
    node.setPosition(Vec3.ZERO);
    ensureTransform(node, size.width, size.height);

    const graphics = ensureGraphics(node);
    graphics.clear();

    const top = new Color(17, 41, 59, 255);
    const middle = new Color(16, 63, 73, 255);
    const bottom = new Color(7, 26, 31, 255);
    const steps = 32;
    const stepHeight = size.height / steps;

    for (let index = 0; index < steps; index += 1) {
      const t = index / (steps - 1);
      const color =
        t < 0.48
          ? lerpColor(top, middle, t / 0.48)
          : lerpColor(middle, bottom, (t - 0.48) / 0.52);
      graphics.fillColor = color;
      graphics.rect(
        -size.width / 2,
        size.height / 2 - (index + 1) * stepHeight,
        size.width,
        stepHeight + 1
      );
      graphics.fill();
    }
  }

  private ensureForestBackground(parent: Node, metrics: LoginViewportMetrics): void {
    // 正式森林背景图的容器。
    const node = ensureChild(parent, "ForestBackground", 1);
    const sourceSize = this.getForestSourceSize();
    const layout = this.getForestLayout(metrics, sourceSize.width, sourceSize.height);
    node.setPosition(new Vec3(layout.x, layout.y, 0));
    ensureTransform(node, layout.width, layout.height);

    const sprite = node.getComponent(Sprite) ?? node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.color = new Color(255, 255, 255, 255);

    if (this.backgroundSpriteFrame) {
      sprite.spriteFrame = this.backgroundSpriteFrame;
      return;
    }

    sprite.spriteFrame = null;
    this.loadForestBackground();
  }

  private drawForestOverlays(parent: Node, metrics: LoginViewportMetrics): void {
    // 顶层的雾、底部的发光等氛围层，都在这里统一补。
    const wash = ensureChild(parent, "ForestWash", 2);
    wash.setPosition(Vec3.ZERO);
    drawRect(wash, metrics.width, metrics.height, new Color(5, 16, 21, 84));

    const topMist = ensureChild(parent, "TopMist", 3);
    topMist.setPosition(new Vec3(0, metrics.height * 0.24, 0));
    drawCircle(topMist, metrics.isPortrait ? 250 : 320, new Color(117, 186, 223, 24));

    const focusShade = parent.getChildByName("LoginReadabilityShade");
    if (focusShade) {
      focusShade.removeFromParent();
      focusShade.destroy();
    }

    const bottomGlow = ensureChild(parent, "BottomGlow", 5);
    bottomGlow.setPosition(new Vec3(-metrics.width * 0.16, -metrics.height * 0.36, 0));
    drawCircle(
      bottomGlow,
      metrics.isPortrait ? metrics.width * 0.28 : metrics.height * 0.22,
      new Color(121, 255, 157, 34)
    );
  }

  private drawAmbientShapes(parent: Node, metrics: LoginViewportMetrics): void {
    // 背景里那些柔和的光团和气氛块，由这里动态画出。
    const node = ensureChild(parent, "AmbientShapes", 6);
    node.setPosition(Vec3.ZERO);
    ensureTransform(node, metrics.width, metrics.height);

    const graphics = ensureGraphics(node);
    graphics.clear();

    const glows = metrics.isPortrait
      ? [
          {
            x: -metrics.width * 0.22,
            y: -metrics.height * 0.08,
            radius: metrics.width * 0.15,
            color: new Color(162, 255, 145, 24),
          },
          {
            x: metrics.width * 0.24,
            y: metrics.height * 0.24,
            radius: metrics.width * 0.12,
            color: new Color(111, 232, 255, 20),
          },
          {
            x: 0,
            y: -metrics.height * 0.3,
            radius: metrics.width * 0.18,
            color: new Color(255, 241, 162, 18),
          },
        ]
      : [
          {
            x: metrics.left + metrics.width * 0.18,
            y: metrics.bottom + metrics.height * 0.16,
            radius: metrics.height * 0.18,
            color: new Color(145, 255, 162, 24),
          },
          {
            x: metrics.right - metrics.width * 0.16,
            y: metrics.top - metrics.height * 0.2,
            radius: metrics.height * 0.16,
            color: new Color(102, 219, 255, 22),
          },
          {
            x: metrics.centerX - metrics.width * 0.03,
            y: metrics.bottom + metrics.height * 0.12,
            radius: metrics.height * 0.14,
            color: new Color(255, 236, 170, 16),
          },
        ];

    glows.forEach((glow) => {
      graphics.fillColor = glow.color;
      graphics.circle(glow.x, glow.y, glow.radius);
      graphics.fill();
    });
  }

  private getForestLayout(
    metrics: LoginViewportMetrics,
    sourceWidth: number,
    sourceHeight: number
  ): BackgroundLayout {
    if (metrics.isPortrait) {
      const height = metrics.height;
      const width = (sourceWidth / sourceHeight) * height;

      return {
        width,
        height,
        x: 0,
        y: 0,
      };
    }

    const fitScale = Math.min(
      1,
      Math.min(metrics.width / sourceWidth, metrics.height / sourceHeight)
    );
    const width = sourceWidth * fitScale;
    const height = sourceHeight * fitScale;

    return {
      width,
      height,
      x: 0,
      y: 0,
    };
  }

  private getForestSourceSize(): { width: number; height: number } {
    if (!this.backgroundSpriteFrame) {
      return {
        width: DEFAULT_FOREST_WIDTH,
        height: DEFAULT_FOREST_HEIGHT,
      };
    }

    const rect = this.backgroundSpriteFrame.rect;
    if (rect.width > 0 && rect.height > 0) {
      return {
        width: rect.width,
        height: rect.height,
      };
    }

    return {
      width: DEFAULT_FOREST_WIDTH,
      height: DEFAULT_FOREST_HEIGHT,
    };
  }

  private loadForestBackground(): void {
    // 异步加载正式背景资源。
    if (this.isLoadingBackground || this.backgroundSpriteFrame) {
      return;
    }

    this.isLoadingBackground = true;
    resources.load(FOREST_BACKGROUND_PATH, SpriteFrame, (error, spriteFrame) => {
      this.isLoadingBackground = false;
      if (error || !spriteFrame) {
        console.warn("[LoginBackgroundBuilder] Failed to load forest background", error);
        return;
      }

      this.backgroundSpriteFrame = spriteFrame;
      if (this.activeCanvas?.isValid) {
        this.ensure(this.activeCanvas);
      }
    });
  }

  private destroyLegacyFoxNodes(parent: Node): void {
    // 清理历史版本遗留的狐狸节点，避免旧资源还挂在背景层里。
    ["FoxVisualPortrait", "FoxVisualLandscape"].forEach((name) => {
      const child = parent.getChildByName(name);
      if (!child) {
        return;
      }

      child.removeFromParent();
      child.destroy();
    });
  }
}

export const loginBackgroundBuilder = new LoginBackgroundBuilder();
