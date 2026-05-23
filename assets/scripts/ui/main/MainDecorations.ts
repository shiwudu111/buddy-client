import { Color, Node } from "cc";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

export function renderPawTitleDecor(
  parent: Node,
  options: { name: string; x: number; y: number; mirrored: boolean; scale?: number }
): void {
  const direction = options.mirrored ? -1 : 1;
  const scale = options.scale ?? 1;
  const pawColor = new Color(248, 177, 126, 138);
  const dotColor = new Color(248, 177, 126, 120);
  const pad = (suffix: string, x: number, y: number, width: number, height: number, alpha = pawColor.a): void => {
    RuntimeUI.createBox(parent, {
      name: `${options.name}${suffix}`,
      x: Math.round(options.x + x * scale * direction),
      y: Math.round(options.y + y * scale),
      width: Math.max(1, Math.round(width * scale)),
      height: Math.max(1, Math.round(height * scale)),
      color: new Color(pawColor.r, pawColor.g, pawColor.b, alpha),
      radius: Math.round((Math.max(width, height) * scale) / 2),
    });
  };

  RuntimeUI.createBox(parent, {
    name: `${options.name}Dot`,
    x: Math.round(options.x - 24 * scale * direction),
    y: options.y,
    width: Math.max(1, Math.round(4 * scale)),
    height: Math.max(1, Math.round(4 * scale)),
    color: dotColor,
    radius: Math.max(1, Math.round(2 * scale)),
  });
  pad("Main", 0, -3, 13, 11);
  pad("ToeTop", -1, 8, 7, 8);
  pad("ToeLeft", -9, 4, 6, 7);
  pad("ToeRight", 8, 4, 6, 7);
  pad("ToeFar", 14, -1, 5, 6, 104);
}

export function renderDottedDivider(
  parent: Node,
  options: { name: string; y: number; width: number; dotCount?: number }
): void {
  const dotCount = Math.max(8, options.dotCount ?? 22);
  const startX = -options.width / 2;
  const gap = options.width / (dotCount - 1);
  for (let index = 0; index < dotCount; index += 1) {
    RuntimeUI.createBox(parent, {
      name: `${options.name}${index}`,
      x: Math.round(startX + index * gap),
      y: options.y,
      width: 4,
      height: 2,
      color: new Color(241, 194, 147, 112),
      radius: 1,
    });
  }
}

export function renderFlowerCluster(
  parent: Node,
  options: { name: string; x: number; y: number; scale: number }
): void {
  const drawFlower = (name: string, x: number, y: number, scale: number): void => {
    const petalColor = new Color(255, 133, 162, 214);
    const centerColor = new Color(255, 227, 102, 226);
    const petalSize = Math.round(8 * scale);
    const petalOffset = Math.round(6 * scale);
    const petals = [
      { x: 0, y: petalOffset },
      { x: 0, y: -petalOffset },
      { x: -petalOffset, y: 0 },
      { x: petalOffset, y: 0 },
    ];
    petals.forEach((petal, index) => {
      RuntimeUI.createBox(parent, {
        name: `${name}Petal${index}`,
        x: Math.round(x + petal.x),
        y: Math.round(y + petal.y),
        width: petalSize,
        height: petalSize,
        color: petalColor,
        radius: Math.round(petalSize / 2),
      });
    });
    RuntimeUI.createBox(parent, {
      name: `${name}Center`,
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(7 * scale),
      height: Math.round(7 * scale),
      color: centerColor,
      radius: Math.round(4 * scale),
    });
  };

  RuntimeUI.createBox(parent, {
    name: `${options.name}Stem`,
    x: options.x - Math.round(8 * options.scale),
    y: options.y - Math.round(9 * options.scale),
    width: Math.round(4 * options.scale),
    height: Math.round(28 * options.scale),
    color: new Color(126, 199, 116, 178),
    radius: Math.round(2 * options.scale),
  });
  RuntimeUI.createBox(parent, {
    name: `${options.name}Leaf`,
    x: options.x - Math.round(18 * options.scale),
    y: options.y - Math.round(16 * options.scale),
    width: Math.round(18 * options.scale),
    height: Math.round(10 * options.scale),
    color: new Color(126, 199, 116, 178),
    radius: Math.round(8 * options.scale),
  });
  drawFlower(`${options.name}Large`, options.x, options.y, options.scale);
  drawFlower(
    `${options.name}Small`,
    options.x - Math.round(24 * options.scale),
    options.y - Math.round(15 * options.scale),
    options.scale * 0.62
  );
}

export function renderCompanionCloudIcon(
  parent: Node,
  options: { name: string; x: number; y: number; size: number }
): void {
  const haloSize = Math.round(options.size * 1.18);
  RuntimeUI.createBox(parent, {
    name: `${options.name}Halo`,
    x: options.x,
    y: options.y,
    width: haloSize,
    height: haloSize,
    color: new Color(255, 224, 164, 124),
    radius: Math.round(haloSize / 2),
  });

  const cloudColor = new Color(255, 252, 241, 248);
  const shadowColor = new Color(239, 156, 92, 62);
  const parts = [
    { suffix: "BaseShadow", x: 0, y: -0.14, w: 0.84, h: 0.38, color: shadowColor },
    { suffix: "LeftShadow", x: -0.23, y: 0.02, w: 0.4, h: 0.4, color: shadowColor },
    { suffix: "TopShadow", x: 0.02, y: 0.12, w: 0.46, h: 0.46, color: shadowColor },
    { suffix: "RightShadow", x: 0.25, y: -0.02, w: 0.38, h: 0.38, color: shadowColor },
    { suffix: "Base", x: 0, y: -0.1, w: 0.84, h: 0.38, color: cloudColor },
    { suffix: "Left", x: -0.23, y: 0.06, w: 0.4, h: 0.4, color: cloudColor },
    { suffix: "Top", x: 0.02, y: 0.16, w: 0.46, h: 0.46, color: cloudColor },
    { suffix: "Right", x: 0.25, y: 0.02, w: 0.38, h: 0.38, color: cloudColor },
  ];
  parts.forEach((part) => {
    RuntimeUI.createBox(parent, {
      name: `${options.name}${part.suffix}`,
      x: Math.round(options.x + options.size * part.x),
      y: Math.round(options.y + options.size * part.y),
      width: Math.round(options.size * part.w),
      height: Math.round(options.size * part.h),
      color: part.color,
      radius: Math.round(options.size * 0.22),
    });
  });
  RuntimeUI.createLabel(parent, {
    name: `${options.name}Face`,
    text: "⌣",
    x: options.x,
    y: Math.round(options.y - options.size * 0.03),
    width: Math.round(options.size * 0.5),
    height: Math.round(options.size * 0.28),
    fontSize: Math.max(10, Math.round(options.size * 0.22)),
    color: new Color(212, 117, 74, 170),
  });
  RuntimeUI.createBox(parent, {
    name: `${options.name}Star`,
    x: Math.round(options.x - options.size * 0.42),
    y: Math.round(options.y + options.size * 0.22),
    width: Math.round(options.size * 0.12),
    height: Math.round(options.size * 0.12),
    color: new Color(255, 255, 255, 176),
    radius: Math.round(options.size * 0.06),
  });
}

export function renderCloudBadge(
  parent: Node,
  options: { name: string; x: number; y: number; size: number; text: string }
): void {
  const shadowColor = new Color(201, 116, 47, 44);
  const outlineColor = new Color(248, 158, 74, 224);
  const petalColor = new Color(255, 250, 231, 252);
  const highlightColor = new Color(255, 255, 255, 92);
  const radius = Math.round(options.size * 0.45);
  const offsets = [
    { x: 0, y: 0, scale: 0.9 },
    { x: -0.23, y: 0.15, scale: 0.64 },
    { x: 0.23, y: 0.15, scale: 0.64 },
    { x: -0.18, y: -0.17, scale: 0.62 },
    { x: 0.18, y: -0.17, scale: 0.62 },
  ];
  offsets.forEach((offset, index) => {
    const petalX = Math.round(options.x + options.size * offset.x);
    const petalY = Math.round(options.y + options.size * offset.y);
    const petalSize = Math.round(options.size * offset.scale);
    RuntimeUI.createBox(parent, {
      name: `${options.name}PetalShadow${index}`,
      x: petalX,
      y: petalY - Math.round(options.size * 0.035),
      width: petalSize,
      height: petalSize,
      color: shadowColor,
      radius,
    });
    RuntimeUI.createBox(parent, {
      name: `${options.name}PetalOutline${index}`,
      x: petalX,
      y: petalY,
      width: petalSize,
      height: petalSize,
      color: outlineColor,
      radius,
    });
    RuntimeUI.createBox(parent, {
      name: `${options.name}Petal${index}`,
      x: petalX,
      y: petalY,
      width: Math.max(1, petalSize - 4),
      height: Math.max(1, petalSize - 4),
      color: petalColor,
      radius,
    });
  });
  RuntimeUI.createBox(parent, {
    name: `${options.name}TopGloss`,
    x: Math.round(options.x - options.size * 0.08),
    y: Math.round(options.y + options.size * 0.18),
    width: Math.round(options.size * 0.46),
    height: Math.round(options.size * 0.18),
    color: highlightColor,
    radius: Math.round(options.size * 0.09),
  });
  RuntimeUI.createLabel(parent, {
    name: `${options.name}Text`,
    text: options.text,
    x: options.x,
    y: options.y - Math.round(options.size * 0.01),
    width: Math.round(options.size * 0.9),
    height: Math.round(options.size * 0.34),
    fontSize: Math.max(15, Math.round(options.size * 0.28)),
    color: new Color(126, 68, 32, 232),
  });
}
