import {
  Color,
  Graphics,
  Label,
  Mask,
  Material,
  Node,
  Size,
  Sprite,
  SpriteFrame,
  UITransform,
  Vec4,
} from "cc";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import type { ArtTuningKey } from "./MainArtTuning";
import type { PetBubble } from "./MainLifeFeedback";
import type { MainPetAnimator } from "./MainPetAnimator";
import type { PetVisualState } from "./MainViewModel";

export type MainStageRendererContext = {
  assets: {
    stageSceneBackgroundSpriteFrame: SpriteFrame | null;
    stageCloudSpriteFrame: SpriteFrame | null;
  };
  state: {
    petAnimator: MainPetAnimator;
    showShaderDebugBlock: boolean;
    petBubble: PetBubble | null;
    activeVisualState: PetVisualState;
  };
  tuning: {
    mainStageRadius: number;
    getValue: (key: ArtTuningKey) => number;
  };
  utils: {
    getGraphicsMaskSubComp: (mask: Mask) => Graphics | null;
    getButtonGradientCarrierSpriteFrame: () => SpriteFrame | null;
    createButtonGradientMaterial: (options?: {
      shapeRect?: Vec4;
      topColor?: Color;
      bottomColor?: Color;
      glossColor?: Color;
    }) => Material | undefined;
    resolveSpriteWorldRect: (node: Node, width: number, height: number) => Vec4;
  };
};

type StageContentMetrics = {
  width: number;
  height: number;
};

type FoxPlacement = {
  safeZoneWidth: number;
  safeZoneHeight: number;
  safeZoneY: number;
  foxOffsetX: number;
  foxOffsetY: number;
  foxVisualScale: number;
};

export function renderMainStageBase(
  ctx: MainStageRendererContext,
  stage: Node,
  stageWidth: number,
  stageHeight: number,
  options?: {
    borderThickness?: number;
    radius?: number;
  }
): void {
  const stageBorderThickness = options?.borderThickness ?? 0;
  const metrics: StageContentMetrics = {
    width: Math.max(1, stageWidth - stageBorderThickness * 2),
    height: Math.max(1, stageHeight - stageBorderThickness * 2),
  };
  const contentRadius = Math.max(0, (options?.radius ?? ctx.tuning.mainStageRadius) - stageBorderThickness);
  const clip = createStageClip(ctx, stage, metrics, contentRadius);
  if (!clip) {
    return;
  }

  renderStageBackground(ctx, clip, metrics);
  renderStageClouds(ctx, clip, metrics);
  renderStageGround(ctx, clip, metrics);
  const foxPlacement = renderStageFox(ctx, clip, metrics);
  renderPetLifeOverlay(ctx, clip, foxPlacement);
  renderShaderDebugBlock(ctx, clip, foxPlacement);
  renderStageDecorations(ctx, clip, metrics);
  clip.setSiblingIndex(1);
}

function createStageClip(
  ctx: MainStageRendererContext,
  stage: Node,
  metrics: StageContentMetrics,
  radius: number
): Node | null {
  // 创建一个真正的圆角裁剪盒子，后面的天空、地面都放进这个盒子里。
  const clip = new Node("StageContentClip");
  clip.setParent(stage);
  clip.setPosition(0, 0, 0);

  const clipTransform = clip.getComponent(UITransform) ?? clip.addComponent(UITransform);
  clipTransform.setContentSize(metrics.width, metrics.height);

  const clipMask = clip.addComponent(Mask);
  clipMask.type = Mask.Type.GRAPHICS_STENCIL;
  clipMask.inverted = false;

  const maskGraphics = ctx.utils.getGraphicsMaskSubComp(clipMask);
  if (!maskGraphics) {
    return null;
  }

  maskGraphics.clear();
  maskGraphics.fillColor = Color.WHITE;
  maskGraphics.roundRect(-metrics.width / 2, -metrics.height / 2, metrics.width, metrics.height, radius);
  maskGraphics.fill();
  return clip;
}

function renderStageBackground(ctx: MainStageRendererContext, clip: Node, metrics: StageContentMetrics): void {
  const { width, height } = metrics;
  if (!ctx.assets.stageSceneBackgroundSpriteFrame) {
    renderFallbackStageBackground(clip, metrics);
    return;
  }

  const backgroundRect = ctx.assets.stageSceneBackgroundSpriteFrame.rect;
  const backgroundSize =
    backgroundRect.width > 0 && backgroundRect.height > 0
      ? new Size(backgroundRect.width, backgroundRect.height)
      : ctx.assets.stageSceneBackgroundSpriteFrame.originalSize;
  const backgroundAspect = backgroundSize.height > 0 ? backgroundSize.width / backgroundSize.height : 1;
  const contentAspect = height > 0 ? width / height : 1;
  const backgroundWidth = backgroundAspect > contentAspect ? height * backgroundAspect : width;
  const backgroundHeight = backgroundAspect > contentAspect ? height : width / backgroundAspect;
  const backgroundScale = ctx.tuning.getValue("stageBackgroundScale");
  const backgroundWidthScale = ctx.tuning.getValue("stageBackgroundWidthScale");
  const backgroundHeightScale = ctx.tuning.getValue("stageBackgroundHeightScale");
  const backgroundOffsetX = width * ctx.tuning.getValue("stageBackgroundOffsetXRatio");
  const backgroundOffsetY = height * ctx.tuning.getValue("stageBackgroundOffsetYRatio");

  RuntimeUI.createSpriteFrame(clip, {
    name: "StageSceneBackground",
    x: Math.round(backgroundOffsetX),
    y: Math.round(backgroundOffsetY),
    width: Math.round(backgroundWidth * backgroundScale * backgroundWidthScale),
    height: Math.round(backgroundHeight * backgroundScale * backgroundHeightScale),
    spriteFrame: ctx.assets.stageSceneBackgroundSpriteFrame,
  });
}

function renderFallbackStageBackground(clip: Node, metrics: StageContentMetrics): void {
  const { width, height } = metrics;
  const horizonY = -height * 0.03;
  const transitionHeight = 4;
  const topY = height / 2;
  const bottomY = -height / 2;
  const skyBottomY = horizonY + transitionHeight / 2;
  const floorTopY = horizonY - transitionHeight / 2;
  const skyHeight = Math.max(0, topY - skyBottomY);
  const floorHeight = Math.max(0, floorTopY - bottomY);

  RuntimeUI.createBox(clip, {
    name: "StageSkyBase",
    x: 0,
    y: skyBottomY + skyHeight / 2,
    width,
    height: skyHeight,
    color: new Color(255, 245, 234, 255),
    radius: 0,
  });

  RuntimeUI.createBox(clip, {
    name: "StageFloorBase",
    x: 0,
    y: bottomY + floorHeight / 2,
    width,
    height: floorHeight,
    color: new Color(246, 228, 193, 255),
    radius: 0,
  });

  const blendSteps = 5;
  const bandHeight = transitionHeight / blendSteps + 1;
  const skyColor = { r: 255, g: 243, b: 231 };
  const floorColor = { r: 246, g: 228, b: 193 };
  for (let index = 0; index < blendSteps; index += 1) {
    const t = blendSteps <= 1 ? 0 : index / (blendSteps - 1);
    const r = Math.round(skyColor.r + (floorColor.r - skyColor.r) * t);
    const g = Math.round(skyColor.g + (floorColor.g - skyColor.g) * t);
    const b = Math.round(skyColor.b + (floorColor.b - skyColor.b) * t);
    RuntimeUI.createBox(clip, {
      name: "StageHorizonBand" + index,
      x: 0,
      y: skyBottomY - bandHeight / 2 - index * (transitionHeight / blendSteps),
      width,
      height: bandHeight,
      color: new Color(r, g, b, 255),
      radius: 0,
    });
  }
}

function renderStageClouds(ctx: MainStageRendererContext, clip: Node, metrics: StageContentMetrics): void {
  const cloudY = metrics.height * ctx.tuning.getValue("cloudYRatio");
  const cloudBaseWidth = metrics.width * ctx.tuning.getValue("cloudBaseWidthRatio");
  const cloudColor = new Color(255, 255, 255, 215);
  const leftCloudX = metrics.width * ctx.tuning.getValue("leftCloudXRatio");
  const rightCloudX = metrics.width * ctx.tuning.getValue("rightCloudXRatio");
  const rightCloudYOffset = metrics.height * ctx.tuning.getValue("rightCloudYOffsetRatio");

  createCloudSprite(ctx, clip, {
    name: "StageCloudLeftSdf",
    x: leftCloudX,
    y: cloudY,
    baseWidth: cloudBaseWidth,
    scale: ctx.tuning.getValue("leftCloudScale"),
    color: cloudColor,
  });

  createCloudSprite(ctx, clip, {
    name: "StageCloudRightSdf",
    x: rightCloudX,
    y: cloudY + rightCloudYOffset,
    baseWidth: cloudBaseWidth,
    scale: ctx.tuning.getValue("rightCloudScale"),
    flipX: true,
    color: cloudColor,
  });
}

function renderStageGround(ctx: MainStageRendererContext, clip: Node, metrics: StageContentMetrics): void {
  const stageBaseArcWidth = Math.min(metrics.width * ctx.tuning.getValue("stageBaseArcWidthRatio"), 560);
  const stageBaseArcHeight = Math.max(76, metrics.height * ctx.tuning.getValue("stageBaseArcHeightRatio"));
  const stageBaseArcBottom = Math.max(58, metrics.height * ctx.tuning.getValue("stageBaseArcBottomRatio"));
  const stageBaseArcY = -metrics.height / 2 + stageBaseArcBottom + stageBaseArcHeight / 2;

  RuntimeUI.createRadialGlow(clip, {
    name: "StageBaseArcGlow",
    x: 0,
    y: stageBaseArcY,
    width: Math.round(stageBaseArcWidth),
    height: Math.round(stageBaseArcHeight),
    color: new Color(255, 255, 255, 54),
    steps: 8,
  });

  RuntimeUI.createBox(clip, {
    name: "StageBaseArc",
    x: 0,
    y: stageBaseArcY,
    width: Math.round(stageBaseArcWidth * 0.9),
    height: Math.round(stageBaseArcHeight * 0.72),
    color: new Color(255, 255, 255, 44),
    radius: Math.round(stageBaseArcHeight),
  });

  RuntimeUI.createBox(clip, {
    name: "StageGroundLine",
    x: 0,
    y: metrics.height * ctx.tuning.getValue("stageGroundLineYRatio"),
    width: Math.round(metrics.width * 0.82),
    height: 2,
    color: new Color(213, 171, 118, 166),
    radius: 1,
  });

  RuntimeUI.createLabel(clip, {
    name: "StageSparkles",
    text: "?   ?   ?",
    x: 0,
    y: metrics.height * 0.43,
    width: 180,
    height: 28,
    fontSize: 18,
    color: new Color(244, 183, 79, 210),
  });
}

function renderStageFox(ctx: MainStageRendererContext, clip: Node, metrics: StageContentMetrics): FoxPlacement {
  const safeZoneWidth = Math.max(260, Math.min(metrics.width * ctx.tuning.getValue("safeZoneWidthRatio") * 0.86, 360));
  const safeZoneHeight = Math.max(240, Math.min(metrics.height * ctx.tuning.getValue("safeZoneHeightRatio") * 0.82, 340));
  const placement: FoxPlacement = {
    safeZoneWidth,
    safeZoneHeight,
    safeZoneY: metrics.height * ctx.tuning.getValue("safeZoneYRatio"),
    foxOffsetX: Math.round(metrics.width * ctx.tuning.getValue("foxCharacterOffsetXRatio")),
    foxOffsetY: Math.round(metrics.height * ctx.tuning.getValue("foxCharacterOffsetYRatio")),
    foxVisualScale: ctx.tuning.getValue("foxCharacterScale"),
  };

  RuntimeUI.createBox(clip, {
    name: "MainCharacterGroundShadow",
    x: placement.foxOffsetX,
    y: placement.safeZoneY + placement.foxOffsetY - placement.safeZoneHeight * 0.34 * placement.foxVisualScale,
    width: Math.round(
      placement.safeZoneWidth * 0.58 * placement.foxVisualScale * ctx.tuning.getValue("foxShadowWidthScale")
    ),
    height: Math.round(
      placement.safeZoneHeight * 0.1 * placement.foxVisualScale * ctx.tuning.getValue("foxShadowHeightScale")
    ),
    color: new Color(126, 88, 56, Math.round(ctx.tuning.getValue("foxShadowAlpha"))),
    radius: Math.round(placement.safeZoneHeight * 0.05),
  });

  const foxSpriteFrame = ctx.state.petAnimator.getCurrentSpriteFrame();
  if (!foxSpriteFrame) {
    RuntimeUI.createBox(clip, {
      name: "MainCharacterRestingFoxFallback",
      x: placement.foxOffsetX,
      y: placement.safeZoneY + placement.foxOffsetY,
      width: Math.round(placement.safeZoneWidth * 0.55 * placement.foxVisualScale),
      height: Math.round(placement.safeZoneHeight * 0.42 * placement.foxVisualScale),
      color: new Color(255, 255, 255, 48),
      radius: 32,
    });
    return placement;
  }

  const characterOriginalSize = ctx.state.petAnimator.resolveCurrentStableSize(foxSpriteFrame);
  const characterAspect = characterOriginalSize.height > 0 ? characterOriginalSize.width / characterOriginalSize.height : 1;
  const parentScaleX = Math.abs(clip.worldScale.x) || 1;
  const parentScaleY = Math.abs(clip.worldScale.y) || 1;
  const characterMaxScreenWidth =
    placement.safeZoneWidth *
    0.92 *
    placement.foxVisualScale *
    ctx.tuning.getValue("foxSpriteWidthScale") *
    parentScaleX;
  const characterMaxScreenHeight =
    placement.safeZoneHeight *
    0.9 *
    placement.foxVisualScale *
    ctx.tuning.getValue("foxSpriteHeightScale") *
    parentScaleY;
  let characterScreenWidth = characterMaxScreenWidth;
  let characterScreenHeight = characterScreenWidth / characterAspect;
  if (characterScreenHeight > characterMaxScreenHeight) {
    characterScreenHeight = characterMaxScreenHeight;
    characterScreenWidth = characterScreenHeight * characterAspect;
  }

  createFoxSpriteNode(ctx, clip, {
    x: placement.foxOffsetX,
    y: Math.round(placement.safeZoneY + placement.foxOffsetY - placement.safeZoneHeight * 0.02 * placement.foxVisualScale),
    width: Math.round(characterScreenWidth / parentScaleX),
    height: Math.round(characterScreenHeight / parentScaleY),
    sourceSize: characterOriginalSize,
    spriteFrame: foxSpriteFrame,
  });
  return placement;
}

function renderShaderDebugBlock(ctx: MainStageRendererContext, clip: Node, placement: FoxPlacement): void {
  if (!ctx.state.showShaderDebugBlock) {
    return;
  }

  const shaderDebugSize = Math.min(
    128,
    Math.max(92, Math.round(Math.min(placement.safeZoneWidth, placement.safeZoneHeight) * 0.26))
  );
  const shaderDebugY = placement.safeZoneY + 6;
  const shaderDebugRadius = 18;
  const shaderDebugFrame = ctx.utils.getButtonGradientCarrierSpriteFrame();
  const shaderDebugNode = RuntimeUI.createRoundedClip(clip, {
    name: "PetSafeZoneShaderDebug",
    x: 0,
    y: Math.round(shaderDebugY),
    width: shaderDebugSize,
    height: shaderDebugSize,
    radius: shaderDebugRadius,
  });

  if (shaderDebugFrame) {
    const shaderDebugSprite = RuntimeUI.createSpriteFrame(shaderDebugNode, {
      name: "PetSafeZoneShaderDebugFill",
      x: 0,
      y: 0,
      width: shaderDebugSize,
      height: shaderDebugSize,
      spriteFrame: shaderDebugFrame,
    });
    const shaderDebugMaterial = ctx.utils.createButtonGradientMaterial({
      shapeRect: ctx.utils.resolveSpriteWorldRect(shaderDebugSprite.node, shaderDebugSize, shaderDebugSize),
    });
    if (shaderDebugMaterial) {
      shaderDebugSprite.sprite.customMaterial = shaderDebugMaterial;
      shaderDebugSprite.sprite.setMaterial(shaderDebugMaterial, 0);
    }
  } else {
    RuntimeUI.createBox(shaderDebugNode, {
      name: "PetSafeZoneShaderDebugFallback",
      x: 0,
      y: 0,
      width: shaderDebugSize,
      height: shaderDebugSize,
      color: new Color(255, 0, 255, 255),
      radius: shaderDebugRadius,
    });
  }

  RuntimeUI.createCard(clip, {
    name: "PetSafeZoneShaderDebugOutline",
    x: 0,
    y: Math.round(shaderDebugY),
    width: shaderDebugSize,
    height: shaderDebugSize,
    style: "shell",
    borderColor: new Color(235, 207, 180, 214),
    radius: shaderDebugRadius,
    lineWidth: 1,
  });
  RuntimeUI.createLabel(clip, {
    name: "PetSafeZoneShaderDebugLabel",
    text: shaderDebugFrame ? "SHADER MATERIAL" : "SHADER FALLBACK",
    x: 0,
    y: Math.round(shaderDebugY - shaderDebugSize / 2 - 18),
    width: 132,
    height: 18,
    fontSize: 11,
    color: new Color(126, 93, 69, 188),
  });
}

function renderStageDecorations(ctx: MainStageRendererContext, clip: Node, metrics: StageContentMetrics): void {
  const grassY = metrics.height * ctx.tuning.getValue("grassYRatio");
  const grassTufts = [
    { x: -metrics.width * 0.44, width: 28, height: 18, color: new Color(114, 211, 154, 228) },
    { x: -metrics.width * 0.34, width: 24, height: 16, color: new Color(140, 221, 173, 224) },
    { x: metrics.width * 0.26, width: 30, height: 18, color: new Color(167, 230, 190, 220) },
    { x: metrics.width * 0.41, width: 30, height: 20, color: new Color(111, 202, 149, 228) },
  ];
  for (const tuft of grassTufts) {
    RuntimeUI.createBox(clip, {
      name: "GrassTuft" + Math.round(tuft.x),
      x: tuft.x,
      y: grassY,
      width: tuft.width,
      height: tuft.height,
      color: tuft.color,
      radius: Math.max(tuft.width, tuft.height),
    });
  }

  createStageMarker(clip, "StageMarkerLeft", -metrics.width * 0.31, -metrics.height * 0.285, 1);
  createStageMarker(clip, "StageMarkerRight", metrics.width * 0.39, -metrics.height * 0.278, 0.85);
}

function createStageMarker(parent: Node, name: string, x: number, y: number, scale: number): void {
  const marker = new Node(name);
  marker.setParent(parent);
  marker.setPosition(x, y, 0);
  marker.setScale(scale, scale, 1);
  const markerTransform = marker.getComponent(UITransform) ?? marker.addComponent(UITransform);
  markerTransform.setContentSize(32, 32);

  const petals = [
    { x: 0, y: 9 },
    { x: 0, y: -9 },
    { x: -9, y: 0 },
    { x: 9, y: 0 },
  ];
  for (const petal of petals) {
    RuntimeUI.createBox(marker, {
      name: name + "Petal" + petal.x + "_" + petal.y,
      x: petal.x,
      y: petal.y,
      width: 10,
      height: 10,
      color: new Color(255, 255, 255, 246),
      radius: 5,
    });
  }

  RuntimeUI.createBox(marker, {
    name: name + "CenterOuter",
    x: 0,
    y: 0,
    width: 18,
    height: 18,
    color: new Color(255, 255, 255, 246),
    radius: 9,
  });
  RuntimeUI.createBox(marker, {
    name: name + "CenterInner",
    x: 0,
    y: 0,
    width: 8,
    height: 8,
    color: new Color(247, 184, 200, 255),
    radius: 4,
  });
}

function createFoxSpriteNode(
  ctx: MainStageRendererContext,
  parent: Node,
  options: {
    x: number;
    y: number;
    width: number;
    height: number;
    sourceSize: Size;
    spriteFrame: SpriteFrame;
  }
): void {
  const node = new Node("MainCharacterFoxSprite");
  node.setParent(parent);
  const transform = node.addComponent(UITransform);
  transform.setContentSize(options.width, options.height);
  node.setPosition(options.x, options.y, 0);

  const spriteNode = new Node("MainCharacterFoxSpriteFrame");
  spriteNode.setParent(node);
  const sprite = spriteNode.addComponent(Sprite);
  sprite.spriteFrame = options.spriteFrame;
  sprite.type = Sprite.Type.SIMPLE;
  sprite.trim = false;
  sprite.sizeMode = Sprite.SizeMode.CUSTOM;
  ctx.state.petAnimator.bindSprite(sprite);

  const spriteTransform = spriteNode.getComponent(UITransform);
  if (spriteTransform) {
    spriteTransform.setContentSize(options.sourceSize.width, options.sourceSize.height);
  }
  spriteNode.setScale(
    options.sourceSize.width > 0 ? options.width / options.sourceSize.width : 1,
    options.sourceSize.height > 0 ? options.height / options.sourceSize.height : 1,
    1
  );
}

function createCloudSprite(
  ctx: MainStageRendererContext,
  parent: Node,
  options: {
    name: string;
    x: number;
    y: number;
    baseWidth: number;
    scale: number;
    flipX?: boolean;
    color: Color;
  }
): void {
  if (!ctx.assets.stageCloudSpriteFrame) {
    return;
  }

  const cloudAspect = 606 / 346;
  const spriteWidth = Math.max(1, Math.round(options.baseWidth * options.scale));
  const spriteHeight = Math.max(1, Math.round(spriteWidth / cloudAspect));
  const shadow = RuntimeUI.createSpriteFrame(parent, {
    name: options.name + "Shadow",
    x: options.x,
    y: options.y - Math.round(spriteHeight * 0.02),
    width: Math.round(spriteWidth * 1.06),
    height: Math.round(spriteHeight * 1.08),
    spriteFrame: ctx.assets.stageCloudSpriteFrame,
    color: new Color(255, 255, 255, 92),
  });
  shadow.node.setSiblingIndex(0);

  const cloudGroup = new Node(options.name);
  cloudGroup.setParent(parent);
  cloudGroup.setPosition(options.x, options.y, 0);
  const cloudGroupTransform = cloudGroup.getComponent(UITransform) ?? cloudGroup.addComponent(UITransform);
  cloudGroupTransform.setContentSize(spriteWidth, spriteHeight);

  RuntimeUI.createSpriteFrame(cloudGroup, {
    name: options.name + "Outer",
    x: 0,
    y: 0,
    width: spriteWidth,
    height: spriteHeight,
    spriteFrame: ctx.assets.stageCloudSpriteFrame,
    color: new Color(options.color.r, options.color.g, options.color.b, 180),
  });

  const innerMaskNode = new Node(options.name + "InnerMask");
  innerMaskNode.setParent(cloudGroup);
  innerMaskNode.setPosition(0, 0, 0);
  const innerMaskWidth = Math.round(spriteWidth * 0.88);
  const innerMaskHeight = Math.round(spriteHeight * 0.88);
  const innerMaskTransform = innerMaskNode.getComponent(UITransform) ?? innerMaskNode.addComponent(UITransform);
  innerMaskTransform.setContentSize(innerMaskWidth, innerMaskHeight);

  const innerMask = innerMaskNode.addComponent(Mask);
  innerMask.type = Mask.Type.GRAPHICS_STENCIL;
  innerMask.inverted = false;
  const innerMaskGraphics = ctx.utils.getGraphicsMaskSubComp(innerMask);
  if (!innerMaskGraphics) {
    return;
  }

  const innerMaskRadius = Math.min(innerMaskWidth, innerMaskHeight);
  innerMaskGraphics.clear();
  innerMaskGraphics.fillColor = Color.WHITE;
  innerMaskGraphics.ellipse(-innerMaskWidth * 0.18, 0, innerMaskWidth * 0.28, innerMaskHeight * 0.26);
  innerMaskGraphics.ellipse(innerMaskWidth * 0.2, innerMaskHeight * 0.02, innerMaskWidth * 0.32, innerMaskHeight * 0.28);
  innerMaskGraphics.ellipse(0, -innerMaskHeight * 0.08, innerMaskWidth * 0.22, innerMaskHeight * 0.2);
  innerMaskGraphics.circle(0, -innerMaskHeight * 0.02, innerMaskRadius * 0.12);
  innerMaskGraphics.fill();

  RuntimeUI.createSpriteFrame(innerMaskNode, {
    name: options.name + "Inner",
    x: 0,
    y: 0,
    width: spriteWidth,
    height: spriteHeight,
    spriteFrame: ctx.assets.stageCloudSpriteFrame,
    color: new Color(options.color.r, options.color.g, options.color.b, 238),
  });

  if (options.flipX) {
    shadow.node.setScale(-1, 1, 1);
    cloudGroup.setScale(-1, 1, 1);
  }
}

function renderPetLifeOverlay(ctx: MainStageRendererContext, clip: Node, options: FoxPlacement): void {
  const petCenterX = options.foxOffsetX;
  const petCenterY = Math.round(options.safeZoneY + options.foxOffsetY);
  const visualCopy = resolveVisualStateCopy(ctx.state.activeVisualState);
  if (visualCopy) {
    RuntimeUI.createCard(clip, {
      name: "PetLifeVisualStatePill",
      x: petCenterX + Math.round(options.safeZoneWidth * 0.31),
      y: petCenterY + Math.round(options.safeZoneHeight * 0.18 * options.foxVisualScale),
      width: 84,
      height: 34,
      color: new Color(255, 245, 221, 214),
      innerColor: new Color(255, 255, 255, 96),
      borderColor: new Color(242, 203, 154, 190),
      radius: 17,
      innerRadius: 13,
      borderThickness: 2,
    });
    RuntimeUI.createLabel(clip, {
      name: "PetLifeVisualStateText",
      text: visualCopy,
      x: petCenterX + Math.round(options.safeZoneWidth * 0.31),
      y: petCenterY + Math.round(options.safeZoneHeight * 0.18 * options.foxVisualScale),
      width: 72,
      height: 24,
      fontSize: 16,
      color: new Color(126, 68, 32, 232),
    });
  }

  if (!ctx.state.petBubble) {
    return;
  }

  const bubbleWidth = Math.max(210, Math.min(320, Math.round(options.safeZoneWidth * 0.78)));
  const bubbleHeight = 68;
  const bubbleX = Math.round(petCenterX + options.safeZoneWidth * 0.34);
  const bubbleY = Math.round(petCenterY + options.safeZoneHeight * 0.58);
  RuntimeUI.createCard(clip, {
    name: "PetLifeBubble",
    x: bubbleX,
    y: bubbleY,
    width: bubbleWidth,
    height: bubbleHeight,
    color: new Color(238, 180, 112, 218),
    innerColor: new Color(255, 249, 237, 240),
    borderColor: new Color(255, 226, 190, 220),
    radius: 22,
    innerRadius: 18,
    borderThickness: 2,
  });
  RuntimeUI.createBox(clip, {
    name: "PetLifeBubbleTail",
    x: bubbleX - Math.round(bubbleWidth * 0.38),
    y: bubbleY - Math.round(bubbleHeight * 0.44),
    width: 24,
    height: 14,
    color: new Color(238, 180, 112, 218),
    radius: 7,
  });

  const bubbleLabel = RuntimeUI.createLabel(clip, {
    name: "PetLifeBubbleText",
    text: ctx.state.petBubble.text,
    x: bubbleX,
    y: bubbleY,
    width: bubbleWidth - 34,
    height: bubbleHeight - 18,
    fontSize: 18,
    color: new Color(116, 72, 43, 240),
  });
  bubbleLabel.lineHeight = 24;
  bubbleLabel.enableWrapText = true;
  bubbleLabel.overflow = Label.Overflow.CLAMP;
}

function resolveVisualStateCopy(activeVisualState: PetVisualState): string | null {
  switch (activeVisualState) {
    case "eating":
      return "好吃";
    case "playing":
      return "☆ 玩耍";
    case "sleeping":
      return "Zz";
    case "listening":
      return "♪";
    case "soothed":
      return "♡";
    case "serverDerived":
    default:
      return null;
  }
}
