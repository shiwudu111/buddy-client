import { ImageAsset, Rect, Size, SpriteFrame, Texture2D, Vec2 } from "cc";

type ShadowSpriteFrameOptions = {
  shellWidth: number;
  shellHeight: number;
  spread: number;
  radius: number;
  sigmaFar: number;
  sigmaNear: number;
  strength: number;
};

type CloudOutlineSpriteFrameOptions = {
  width: number;
  height: number;
  spread: number;
  sigmaFar: number;
  sigmaNear: number;
  strength: number;
  ellipses: Array<{
    centerX: number;
    centerY: number;
    radiusX: number;
    radiusY: number;
  }>;
};

export class MainProceduralTextureFactory {
  private whiteSpriteFrame: SpriteFrame | null = null;

  getWhiteSpriteFrame(): SpriteFrame | null {
    if (this.whiteSpriteFrame) {
      return this.whiteSpriteFrame;
    }
    if (typeof document === "undefined") {
      return null;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 2, 2);

    const texture = new Texture2D();
    texture.image = new ImageAsset(canvas);
    const spriteFrame = new SpriteFrame();
    spriteFrame.reset({
      texture,
      originalSize: new Size(2, 2),
      rect: new Rect(0, 0, 2, 2),
      offset: new Vec2(0, 0),
      isRotate: false,
    });

    this.whiteSpriteFrame = spriteFrame;
    return spriteFrame;
  }

  createCloudOutlineSpriteFrame(options: CloudOutlineSpriteFrameOptions): SpriteFrame | null {
    if (typeof document === "undefined") {
      return null;
    }

    const canvasWidth = Math.max(1, Math.round(options.width + options.spread * 2));
    const canvasHeight = Math.max(1, Math.round(options.height + options.spread * 2));
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const image = context.createImageData(canvasWidth, canvasHeight);
    const data = image.data;
    const sampleScale = 2;
    const offsetX = options.spread + options.width / 2;
    const offsetY = options.spread + options.height / 2;

    for (let y = 0; y < canvasHeight; y += 1) {
      for (let x = 0; x < canvasWidth; x += 1) {
        let alpha = 0;
        for (let sy = 0; sy < sampleScale; sy += 1) {
          for (let sx = 0; sx < sampleScale; sx += 1) {
            const sampleX = x + (sx + 0.5) / sampleScale;
            const sampleY = y + (sy + 0.5) / sampleScale;
            let distance = Number.POSITIVE_INFINITY;

            for (const ellipse of options.ellipses) {
              const ellipseDistance = sampleEllipseDistance(
                sampleX,
                sampleY,
                offsetX + ellipse.centerX,
                offsetY + ellipse.centerY,
                ellipse.radiusX,
                ellipse.radiusY
              );
              distance = Math.min(distance, ellipseDistance);
            }

            if (distance > 0) {
              const far = Math.exp(-(distance * distance) / (2 * options.sigmaFar * options.sigmaFar));
              const near = Math.exp(-(distance * distance) / (2 * options.sigmaNear * options.sigmaNear));
              alpha += Math.min(1, (far * 0.7 + near * 0.3) * options.strength);
            }
          }
        }

        alpha /= sampleScale * sampleScale;
        const index = (y * canvasWidth + x) * 4;
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = Math.round(alpha * 255);
      }
    }

    context.putImageData(image, 0, 0);
    return createSpriteFrameFromCanvas(canvas);
  }

  createLayoutShellShadowSpriteFrame(options: ShadowSpriteFrameOptions): SpriteFrame | null {
    if (typeof document === "undefined") {
      return null;
    }

    const canvasWidth = Math.max(1, Math.round(options.shellWidth + options.spread * 2));
    const canvasHeight = Math.max(1, Math.round(options.shellHeight + options.spread * 2));
    const canvas = document.createElement("canvas");
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const image = context.createImageData(canvasWidth, canvasHeight);
    const data = image.data;
    const rectX = options.spread;
    const rectY = options.spread;
    const sampleScale = 2;

    for (let y = 0; y < canvasHeight; y += 1) {
      for (let x = 0; x < canvasWidth; x += 1) {
        let alpha = 0;
        for (let sy = 0; sy < sampleScale; sy += 1) {
          for (let sx = 0; sx < sampleScale; sx += 1) {
            const distance = sampleRoundedRectDistance(
              x + (sx + 0.5) / sampleScale,
              y + (sy + 0.5) / sampleScale,
              rectX,
              rectY,
              options.shellWidth,
              options.shellHeight,
              options.radius
            );
            if (distance > 0) {
              const far = Math.exp(-(distance * distance) / (2 * options.sigmaFar * options.sigmaFar));
              const near = Math.exp(-(distance * distance) / (2 * options.sigmaNear * options.sigmaNear));
              const ny = (y - canvasHeight / 2) / (canvasHeight / 2);
              const directional = Math.max(0.75, Math.min(1, 0.88 + ny * 0.12));
              alpha += Math.min(1, (far * 0.68 + near * 0.32) * options.strength * directional);
            }
          }
        }
        alpha /= sampleScale * sampleScale;
        const index = (y * canvasWidth + x) * 4;
        data[index] = 255;
        data[index + 1] = 255;
        data[index + 2] = 255;
        data[index + 3] = Math.round(alpha * 255);
      }
    }

    context.putImageData(image, 0, 0);
    return createSpriteFrameFromCanvas(canvas);
  }
}

function createSpriteFrameFromCanvas(canvas: HTMLCanvasElement): SpriteFrame {
  const texture = new Texture2D();
  texture.image = new ImageAsset(canvas);
  const spriteFrame = new SpriteFrame();
  spriteFrame.texture = texture;
  return spriteFrame;
}

function sampleRoundedRectDistance(
  px: number,
  py: number,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): number {
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const halfWidth = Math.max(0, width / 2 - radius);
  const halfHeight = Math.max(0, height / 2 - radius);
  const dx = Math.abs(px - centerX) - halfWidth;
  const dy = Math.abs(py - centerY) - halfHeight;
  const outsideX = Math.max(dx, 0);
  const outsideY = Math.max(dy, 0);
  const outside = Math.hypot(outsideX, outsideY);
  const inside = Math.min(Math.max(dx, dy), 0);
  return outside + inside - radius;
}

function sampleEllipseDistance(
  px: number,
  py: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
): number {
  const safeRadiusX = Math.max(1, radiusX);
  const safeRadiusY = Math.max(1, radiusY);
  const dx = px - centerX;
  const dy = py - centerY;
  const normalized = Math.hypot(dx / safeRadiusX, dy / safeRadiusY);
  return (normalized - 1) * Math.min(safeRadiusX, safeRadiusY);
}
