import { EffectAsset, resources, SpriteAtlas, SpriteFrame } from "cc";
import { MainPetAnimator, resolveFoxAtlasFrames } from "./MainPetAnimator";

// 主背景渐变 LUT 资源路径。
// 这张图用来提供壳层和背景的主色阶，不是独立装饰物。
const MAIN_BG_GRADIENT_LUT_PATH = "ui/main/background/main_bg_gradient_lut/spriteFrame";

// 左上柔光资源路径。
// 用于背景里左上角那团偏暖的柔和光晕。
const MAIN_BG_GLOW_TOP_LEFT_PATH = "ui/main/background/main_bg_glow_tl/spriteFrame";

// 右下柔光资源路径。
// 用于背景里右下角那团偏橙的柔和光晕。
const MAIN_BG_GLOW_BOTTOM_RIGHT_PATH = "ui/main/background/main_bg_glow_br/spriteFrame";

// 主舞台白云资源路径。
// 使用现成云朵贴图替换运行时拼形云，并按 stage 尺寸动态缩放。
const MAIN_STAGE_CLOUD_PATH = "ui/main/background/云朵/spriteFrame";

// 主舞台背景资源路径。
// 这张图只铺在中部 Stage 区域，不覆盖顶栏和底栏。
const MAIN_STAGE_SCENE_BACKGROUND_PATH = "ui/main/background/主界面背景/spriteFrame";

// 主舞台角色静态展示资源。
// 当前只作为 Milestone 5 收尾的学生端静态视觉层，不接业务宠物状态。
const MAIN_CHARACTER_RESTING_FOX_PATH = "ui/main/character/九尾狐休息中/spriteFrame";

const MAIN_FOX_IDLE_DEFAULT_ATLAS_PATH = "ui/main/fox/pet_idle";
const MAIN_FOX_IDLE_SHOW_ATLAS_PATH = "ui/main/fox/pet_idle_show";
const MAIN_FOX_IDLE_DEFAULT_PREFIX = "pet_idle_";
const MAIN_FOX_IDLE_SHOW_PREFIX = "pet_idle_show_";

// 径向 LUT 采样效果资源路径。
// 它让柔光贴图更像“散开的光”，而不是普通平面贴图。
const RADIAL_LUT_EFFECT_PATH = "effects/radial-lut";

// 云朵 SDF shader。
// 用来实现“主体实心 + 外轮廓向外羽化”的云彩。
const CLOUD_SOFT_EFFECT_PATH = "effects/cloud-soft";

// 通用按钮纵向渐变 shader。
// 用于导航激活按钮这类“Sprite + 材质 + Label”结构。
const BUTTON_GRADIENT_EFFECT_PATH = "effects/button-gradient";

export class MainAssetStore {
  backgroundGradientSpriteFrame: SpriteFrame | null = null;
  backgroundGlowTopLeftSpriteFrame: SpriteFrame | null = null;
  backgroundGlowBottomRightSpriteFrame: SpriteFrame | null = null;
  stageCloudSpriteFrame: SpriteFrame | null = null;
  stageSceneBackgroundSpriteFrame: SpriteFrame | null = null;
  mainCharacterRestingFoxSpriteFrame: SpriteFrame | null = null;
  radialGlowEffectAsset: EffectAsset | null = null;
  cloudSoftEffectAsset: EffectAsset | null = null;
  buttonGradientEffectAsset: EffectAsset | null = null;

  private mainAssetsLoadRequested = false;
  private buttonGradientEffectLoadRequested = false;
  private disposed = false;

  constructor(private onAssetLoaded: (() => void) | null) {}

  dispose(): void {
    this.disposed = true;
    this.onAssetLoaded = null;
  }

  ensureMainAssetsLoaded(petAnimator: MainPetAnimator): void {
    if (this.disposed) {
      return;
    }
    if (this.mainAssetsLoadRequested) {
      return;
    }
    this.mainAssetsLoadRequested = true;

    this.loadSpriteFrame(MAIN_BG_GRADIENT_LUT_PATH, "background gradient LUT", (spriteFrame) => {
      this.backgroundGradientSpriteFrame = spriteFrame;
    });
    this.loadSpriteFrame(MAIN_BG_GLOW_TOP_LEFT_PATH, "top-left background glow", (spriteFrame) => {
      this.backgroundGlowTopLeftSpriteFrame = spriteFrame;
    });
    this.loadSpriteFrame(MAIN_BG_GLOW_BOTTOM_RIGHT_PATH, "bottom-right background glow", (spriteFrame) => {
      this.backgroundGlowBottomRightSpriteFrame = spriteFrame;
    });
    this.loadSpriteFrame(MAIN_STAGE_CLOUD_PATH, "stage cloud sprite", (spriteFrame) => {
      this.stageCloudSpriteFrame = spriteFrame;
    });
    this.loadSpriteFrame(MAIN_STAGE_SCENE_BACKGROUND_PATH, "stage scene background sprite", (spriteFrame) => {
      this.stageSceneBackgroundSpriteFrame = spriteFrame;
    });
    this.loadSpriteFrame(MAIN_CHARACTER_RESTING_FOX_PATH, "resting fox sprite", (spriteFrame) => {
      this.mainCharacterRestingFoxSpriteFrame = spriteFrame;
      petAnimator.setFallbackSpriteFrame(spriteFrame);
    });
    this.loadFoxAtlas(MAIN_FOX_IDLE_DEFAULT_ATLAS_PATH, "fox idle default atlas", (atlas) => {
      petAnimator.setIdleFrames("idle", resolveFoxAtlasFrames(atlas, MAIN_FOX_IDLE_DEFAULT_PREFIX));
    });
    this.loadFoxAtlas(MAIN_FOX_IDLE_SHOW_ATLAS_PATH, "fox idle show atlas", (atlas) => {
      petAnimator.setIdleFrames("idleShow", resolveFoxAtlasFrames(atlas, MAIN_FOX_IDLE_SHOW_PREFIX));
    });
    this.loadEffect(CLOUD_SOFT_EFFECT_PATH, "cloud soft effect", (effectAsset) => {
      this.cloudSoftEffectAsset = effectAsset;
    });
    this.loadEffect(RADIAL_LUT_EFFECT_PATH, "radial LUT effect", (effectAsset) => {
      this.radialGlowEffectAsset = effectAsset;
    });
  }

  ensureButtonGradientEffectLoaded(): void {
    if (this.disposed) {
      return;
    }
    if (this.buttonGradientEffectAsset || this.buttonGradientEffectLoadRequested) {
      return;
    }
    this.buttonGradientEffectLoadRequested = true;
    this.loadEffect(BUTTON_GRADIENT_EFFECT_PATH, "button gradient effect", (effectAsset) => {
      this.buttonGradientEffectAsset = effectAsset;
    }, () => {
      this.buttonGradientEffectLoadRequested = false;
    });
  }

  private loadSpriteFrame(
    path: string,
    label: string,
    apply: (spriteFrame: SpriteFrame) => void
  ): void {
    resources.load(path, SpriteFrame, (error, spriteFrame) => {
      if (this.disposed) {
        return;
      }
      if (error || !spriteFrame) {
        console.warn(`[MainAssetStore] failed to load ${label}`, error);
        return;
      }
      apply(spriteFrame);
      this.onAssetLoaded?.();
    });
  }

  private loadFoxAtlas(path: string, label: string, apply: (atlas: SpriteAtlas) => void): void {
    resources.load(path, SpriteAtlas, (error, atlas) => {
      if (this.disposed) {
        return;
      }
      if (error || !atlas) {
        console.warn(`[MainAssetStore] failed to load ${label}`, error);
        return;
      }
      apply(atlas);
      this.onAssetLoaded?.();
    });
  }

  private loadEffect(
    path: string,
    label: string,
    apply: (effectAsset: EffectAsset) => void,
    onFailure?: () => void
  ): void {
    resources.load(path, EffectAsset, (error, effectAsset) => {
      if (this.disposed) {
        return;
      }
      if (error || !effectAsset) {
        console.warn(`[MainAssetStore] failed to load ${label}`, error);
        onFailure?.();
        return;
      }
      apply(effectAsset);
      this.onAssetLoaded?.();
    });
  }
}
