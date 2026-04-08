import { Color, Graphics, Node, UITransform, Vec3, view } from "cc";

type Size = {
  width: number;
  height: number;
};

type LayoutMetrics = Size & {
  left: number;
  right: number;
  bottom: number;
  top: number;
  centerX: number;
  centerY: number;
  isPortrait: boolean;
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

function ensureFoxPart(parent: Node, name: string): Node {
  return ensureChild(parent, name);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerpColor(from: Color, to: Color, t: number): Color {
  return new Color(
    Math.round(from.r + (to.r - from.r) * t),
    Math.round(from.g + (to.g - from.g) * t),
    Math.round(from.b + (to.b - from.b) * t),
    Math.round(from.a + (to.a - from.a) * t)
  );
}

function drawCircle(node: Node, radius: number, color: Color): void {
  ensureTransform(node, radius * 2 + 8, radius * 2 + 8);
  const graphics = ensureGraphics(node);
  graphics.clear();
  graphics.fillColor = color;
  graphics.circle(0, 0, radius);
  graphics.fill();
}

function drawRoundedBody(node: Node, width: number, height: number, color: Color): void {
  ensureTransform(node, width + 8, height + 8);
  const graphics = ensureGraphics(node);
  graphics.clear();
  graphics.fillColor = color;
  graphics.roundRect(-width / 2, -height / 2, width, height, Math.min(width, height) * 0.4);
  graphics.fill();
}

function drawEar(node: Node, width: number, height: number, color: Color): void {
  ensureTransform(node, width + 8, height + 8);
  const graphics = ensureGraphics(node);
  graphics.clear();
  graphics.fillColor = color;
  graphics.moveTo(0, height / 2);
  graphics.lineTo(-width / 2, -height / 2);
  graphics.lineTo(width / 2, -height / 2);
  graphics.close();
  graphics.fill();
}

function scaleValue(value: number, scale: number): number {
  return value * scale;
}

function scaledPosition(x: number, y: number, scale: number): Vec3 {
  return new Vec3(scaleValue(x, scale), scaleValue(y, scale), 0);
}

class LoginBackgroundBuilder {
  ensure(canvas: Node): void {
    const metrics = this.getLayoutMetrics(canvas);

    const loginPage = ensureChild(canvas, "LoginPage", 0);
    loginPage.setPosition(Vec3.ZERO);
    ensureTransform(loginPage, metrics.width, metrics.height);

    const backgroundLayer = ensureChild(loginPage, "BackgroundLayer", 0);
    backgroundLayer.setPosition(Vec3.ZERO);
    ensureTransform(backgroundLayer, metrics.width, metrics.height);

    this.drawGradient(backgroundLayer, metrics);
    this.drawAmbientShapes(backgroundLayer, metrics);
    this.drawFoxVisual(backgroundLayer, metrics);
  }

  ensureContentLayer(canvas: Node): Node {
    const metrics = this.getLayoutMetrics(canvas);

    const loginPage = ensureChild(canvas, "LoginPage", 0);
    loginPage.setPosition(Vec3.ZERO);
    ensureTransform(loginPage, metrics.width, metrics.height);

    const contentLayer = ensureChild(loginPage, "ContentLayer", 1);
    contentLayer.setPosition(Vec3.ZERO);
    ensureTransform(contentLayer, metrics.width, metrics.height);
    return contentLayer;
  }

  private getLayoutMetrics(canvas: Node): LayoutMetrics {
    const visibleSize = view.getVisibleSize();
    const canvasTransform = canvas.getComponent(UITransform);
    const width = visibleSize.width || canvasTransform?.width || 1280;
    const height = visibleSize.height || canvasTransform?.height || 720;

    return {
      width,
      height,
      left: -width * 0.5,
      right: width * 0.5,
      bottom: -height * 0.5,
      top: height * 0.5,
      centerX: 0,
      centerY: 0,
      isPortrait: height > width,
    };
  }

  private drawGradient(parent: Node, size: Size): void {
    const node = ensureChild(parent, "BgGradient", 0);
    node.setPosition(Vec3.ZERO);
    ensureTransform(node, size.width, size.height);

    const graphics = ensureGraphics(node);
    graphics.clear();

    const isPortrait = size.height > size.width;
    const top = isPortrait
      ? new Color(168, 197, 228, 255)
      : new Color(154, 186, 222, 255);
    const middle = isPortrait
      ? new Color(102, 136, 180, 255)
      : new Color(86, 123, 170, 255);
    const bottom = isPortrait
      ? new Color(34, 52, 83, 255)
      : new Color(28, 44, 74, 255);
    const steps = 30;
    const stepHeight = size.height / steps;

    for (let index = 0; index < steps; index += 1) {
      const t = index / (steps - 1);
      const color = t < 0.55
        ? lerpColor(top, middle, t / 0.55)
        : lerpColor(middle, bottom, (t - 0.55) / 0.45);
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

  private drawAmbientShapes(parent: Node, metrics: LayoutMetrics): void {
    const size = { width: metrics.width, height: metrics.height };
    const node = ensureChild(parent, "AmbientShapes", 1);
    node.setPosition(Vec3.ZERO);
    ensureTransform(node, size.width, size.height);

    const graphics = ensureGraphics(node);
    graphics.clear();

    const isPortrait = metrics.isPortrait;
    const shapes = isPortrait
      ? [
          {
            x: 0,
            y: metrics.height * 0.18,
            radius: 120,
            color: new Color(255, 255, 255, 30),
          },
          {
            x: -metrics.width * 0.24,
            y: -metrics.height * 0.1,
            radius: 86,
            color: new Color(193, 220, 255, 24),
          },
          {
            x: metrics.width * 0.24,
            y: -metrics.height * 0.18,
            radius: 96,
            color: new Color(255, 255, 255, 20),
          },
        ]
      : [
          {
            x: metrics.left + metrics.width * 0.18,
            y: metrics.height * 0.18,
            radius: 180,
            color: new Color(255, 255, 255, 34),
          },
          {
            x: metrics.left + metrics.width * 0.34,
            y: -metrics.height * 0.2,
            radius: 120,
            color: new Color(245, 250, 255, 28),
          },
          {
            x: metrics.right - metrics.width * 0.22,
            y: -metrics.height * 0.28,
            radius: 150,
            color: new Color(206, 229, 255, 18),
          },
        ];

    shapes.forEach((shape) => {
      graphics.fillColor = shape.color;
      graphics.circle(shape.x, shape.y, shape.radius);
      graphics.fill();
    });
  }

  private drawFoxVisual(parent: Node, metrics: LayoutMetrics): void {
    const portraitNode = ensureChild(parent, "FoxVisualPortrait", 2);
    const landscapeNode = ensureChild(parent, "FoxVisualLandscape", 3);

    this.drawFoxGraphicsVariant(portraitNode, metrics, true);
    this.drawFoxGraphicsVariant(landscapeNode, metrics, false);

    portraitNode.active = metrics.isPortrait;
    landscapeNode.active = !metrics.isPortrait;
  }

  private drawFoxGraphicsVariant(node: Node, metrics: LayoutMetrics, portrait: boolean): void {
    const baseFoxSize = 520;
    const foxLayout = this.getFoxLayout(metrics, portrait);
    const foxSize = foxLayout.size;
    const foxScale = foxSize / baseFoxSize;
    const estimatedHalfWidth = foxSize * 0.4;
    const estimatedHalfHeight = foxSize * 0.42;
    const foxX = clamp(
      foxLayout.x,
      metrics.left + 56 + estimatedHalfWidth,
      metrics.right - 56 - estimatedHalfWidth
    );
    const foxY = clamp(
      foxLayout.y,
      metrics.bottom + 56 + estimatedHalfHeight,
      metrics.top - 56 - estimatedHalfHeight
    );

    node.setPosition(new Vec3(foxX, foxY, 0));
    ensureTransform(node, baseFoxSize, baseFoxSize);
    node.setScale(Vec3.ONE);

    const silhouetteColor = new Color(242, 151, 82, 156);
    const softColor = new Color(255, 192, 128, 86);

    const glow = ensureFoxPart(node, "Glow");
    glow.setPosition(scaledPosition(0, -10, foxScale));
    drawCircle(glow, scaleValue(190, foxScale), softColor);

    const body = ensureFoxPart(node, "Body");
    body.setPosition(scaledPosition(-24, -54, foxScale));
    drawRoundedBody(
      body,
      scaleValue(236, foxScale),
      scaleValue(218, foxScale),
      silhouetteColor
    );

    const tail = ensureFoxPart(node, "Tail");
    tail.setPosition(scaledPosition(104, -88, foxScale));
    drawCircle(
      tail,
      scaleValue(84, foxScale),
      new Color(241, 154, 90, 52)
    );

    const head = ensureFoxPart(node, "Head");
    head.setPosition(scaledPosition(-8, 82, foxScale));
    drawCircle(head, scaleValue(112, foxScale), silhouetteColor);

    const earLeft = ensureFoxPart(node, "EarLeft");
    earLeft.setPosition(scaledPosition(-86, 170, foxScale));
    drawEar(
      earLeft,
      scaleValue(66, foxScale),
      scaleValue(104, foxScale),
      silhouetteColor
    );

    const earRight = ensureFoxPart(node, "EarRight");
    earRight.setPosition(scaledPosition(26, 180, foxScale));
    drawEar(
      earRight,
      scaleValue(60, foxScale),
      scaleValue(96, foxScale),
      new Color(241, 154, 90, 58)
    );

    const chest = ensureFoxPart(node, "Chest");
    chest.setPosition(scaledPosition(2, -24, foxScale));
    drawCircle(
      chest,
      scaleValue(68, foxScale),
      new Color(255, 233, 205, 24)
    );
  }

  private getFoxLayout(
    metrics: LayoutMetrics,
    portrait: boolean
  ): { size: number; x: number; y: number } {
    if (portrait) {
      return {
        size: Math.min(metrics.width * 0.96, 460),
        x: 0,
        y: metrics.height * 0.025,
      };
    }

    return {
      size: Math.min(metrics.height * 0.82, 420),
      x: -metrics.width * 0.14,
      y: metrics.height * 0.06,
    };
  }
}

export const loginBackgroundBuilder = new LoginBackgroundBuilder();
