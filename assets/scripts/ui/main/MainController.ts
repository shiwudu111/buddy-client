import {
  _decorator,
  Button,
  Color,
  EffectAsset,
  Graphics,
  HorizontalTextAlignment,
  ImageAsset,
  Mask,
  Material,
  Node,
  Rect,
  resources,
  Size,
  Sprite,
  SpriteFrame,
  Texture2D,
  UITransform,
  Vec2,
  Vec3,
  Vec4,
  view,
} from "cc";
import { appState } from "../../app/AppState";
import { sceneRouter } from "../../navigation/SceneRouter";
import { authService } from "../../services/AuthService";
import { ScreenController } from "../common/base/ScreenController";
import { RuntimeUI } from "../common/runtime/RuntimeUI";

const { ccclass } = _decorator;

// 视口尺寸兜底值。
// 当运行时暂时拿不到真实画布尺寸时，先用这个值避免布局计算失真。
const FALLBACK_VIEWPORT = { width: 1024, height: 768 };

// 视口宽高比的分段参考点。
// 用来根据当前屏幕比例，决定壳层和主舞台更偏横向还是更偏竖向。
const BREAKPOINTS = [0.86, 1, 4 / 3, 16 / 9];

// 右上角调试入口按钮的文案。
// 这个按钮主要用于打开测试面板或参考页。
const REFERENCE_BUTTON_LABEL = "REF";

// 主背景渐变 LUT 资源路径。
// 这张图用来提供壳层和背景的主色阶，不是独立装饰物。
const MAIN_BG_GRADIENT_LUT_PATH = "ui/main/background/main_bg_gradient_lut/spriteFrame";

// 左源路径。上柔光资
// 用于背景里左上角那团偏暖的柔和光晕。
const MAIN_BG_GLOW_TOP_LEFT_PATH = "ui/main/background/main_bg_glow_tl/spriteFrame";

// 右下柔光资源路径。
// 用于背景里右下角那团偏橙的柔和光晕。
const MAIN_BG_GLOW_BOTTOM_RIGHT_PATH = "ui/main/background/main_bg_glow_br/spriteFrame";

// 主舞台白云资源路径。
// 使用现成云朵贴图替换运行时拼形云，并按 stage 尺寸动态缩放。
const MAIN_STAGE_CLOUD_PATH = "ui/main/background/云朵/spriteFrame";

// 径向 LUT 采样效果资源路径。
// 它让柔光贴图更像“散开的光”，而不是普通平面贴图。
const RADIAL_LUT_EFFECT_PATH = "effects/radial-lut";
// 云朵 SDF shader。
// 用来实现“主体实心 + 外轮廓向外羽化”的云彩。
const CLOUD_SOFT_EFFECT_PATH = "effects/cloud-soft";
// 通用按钮纵向渐变 shader。
// 用于导航激活按钮这类“Sprite + 材质 + Label”结构。
const BUTTON_GRADIENT_EFFECT_PATH = "effects/button-gradient";
// 调试入口的小按钮尺寸。
// 右上角那个小圆点测试入口就靠它控制大小。
const DEBUG_ENTRY_SIZE = 18;

// 调试面板的宽度。
// 这个宽度决定弹窗能不能把几个开关完整放下。
const DEBUG_PANEL_WIDTH = 260;

// 调试面板的高度。
// 这个高度控制弹窗整体的纵向占位。
const DEBUG_PANEL_HEIGHT = 484;

// 调试面板中每个切换按钮的宽度。
// 对应“渐变底色 / 左上柔光 / 右下柔光”等开关。
const DEBUG_TOGGLE_WIDTH = 196;

// 调试面板中每个切换按钮的高度。
// 这个值主要影响按钮的可点面积和文字舒适度。
const DEBUG_TOGGLE_HEIGHT = 34;

// 调试面板中按钮之间的垂直间距。
// 控制开关之间的呼吸感。
const DEBUG_TOGGLE_GAP = 8;

// 美术调参页的窗口名。
// 固定名字可以避免每次点击都弹出一堆重复窗口。
const ART_DEBUG_WINDOW_NAME = "BuddyMainArtDebug";

// 美术调参本地缓存 key。
// 用来让人工调过的参数在刷新后还能保留。
const ART_TUNING_STORAGE_KEY = "buddy-client.main.art-tuning.v1";

// 壳层参考宽度。
// 用来作为壳层整体缩放的基准，不是固定像素母版。
const APP_SHELL_REFERENCE_WIDTH = 1280;

// 壳层外轮廓的圆角语义。
// 这个值决定壳层整体是“硬一点”还是“奶油一点”。
const APP_SHELL_RADIUS = 38;

// 壳层外框和屏幕边缘之间的基础留白。
// 越大越松，越小越紧，能直接影响壳层呼吸感。
const APP_SHELL_PADDING = 18;

// 美术可调参数清单
// - APP_SHELL_PADDING：壳层和内部内容之间的总留白，越大越“透气”，越小越“紧凑”。
// - SHELL_FRAME_PADDING：ShellFrame 相对壳层的内缩，主要影响第一道内框的呼吸感。
// - MAIN_VIEWPORT_PADDING：MainViewport 相对 ShellFrame 的内缩，主要影响视口和主舞台的分层感。
// - MAIN_VIEWPORT_RADIUS：主视口圆角，决定内部内容的“柔和”程度。
// - MAIN_STAGE_RADIUS：主舞台圆角，决定主舞台底板的气质，通常与主视口保持相近但略小。
// 这些参数共同决定“4:3 壳体里再套一层内容框”的感觉，设计同学可以先动它们。

// ShellFrame 相对壳层的内缩。
// 它主要控制主内容第一道内框和外壳之间的距离。
const SHELL_FRAME_PADDING = 22;

// MainViewport 相对 ShellFrame 的内缩。
// 它主要控制主视口和舞台底板之间的留白。
const MAIN_VIEWPORT_PADDING = 16;

// 主舞台圆角相关参数。
// 这里不是为了像素死对齐，而是保留“柔和、奶油感、卡片式”的视觉语义。

// 主视口圆角。
// 这个圆角偏大，让中间承载区看起来更像一张软卡片。
const MAIN_VIEWPORT_RADIUS = 32;

// 主舞台本体圆角。
// 一般会略小于主视口，避免视觉上层次太糊。
const MAIN_STAGE_RADIUS = 28;

// 竖屏时视口比例判断线。
// 低于这个值时，布局会更偏向“竖向收紧”的壳体策略。
const PORTRAIT_VIEWPORT_ASPECT = 0.86;

// 竖屏时壳层比例的起始值。
// 它定义了很窄屏幕下壳层更收的那一端。
const PORTRAIT_SHELL_ASPECT = 0.5;

// 壳层阴影的主色。
// 这里只控制阴影色相，不控制强弱，强弱由透明度和贴图生成逻辑决定。
const SHELL_SHADOW_COLOR = new Color(187, 129, 62, 255);

// 壳层渐变遮罩的 overscan 宽度。
// 这部分是为了防止圆角边缘出现黑线或贴图取样空洞。
const SHELL_SURFACE_GRADIENT_OVERSCAN = 4;

// 动作卡宽高调参的钝化倍率。
// 调参页仍以 1 为默认中心，但实际尺寸只吃一小部分偏移，避免 0.1 的变化过猛。
const BOTTOM_DOCK_TILE_SIZE_TUNING_DAMPING = 0.3;

type MainLayout = {
  viewportWidth: number;
  viewportHeight: number;
  shellWidth: number;
  shellHeight: number;
  buttonSize: number;
  buttonX: number;
  buttonY: number;
};

type ArtTuningState = {
  appShellPadding: number;
  shellFramePadding: number;
  mainViewportRadius: number;
  mainViewportAlpha: number;
  mainViewportShadowAlpha: number;
  mainViewportShadowSpreadRatio: number;
  mainViewportOffsetXRatio: number;
  mainViewportOffsetYRatio: number;
  mainViewportWidthScale: number;
  mainViewportHeightScale: number;
  topBarHeightRatio: number;
  topBarShellAlpha: number;
  topBarInnerAlpha: number;
  topBarBorderWidth: number;
  topBarBorderAlpha: number;
  topBarShadowAlpha: number;
  topBarShadowSpreadRatio: number;
  topBarBrandMarkHeightRatio: number;
  topBarBrandTextGap: number;
  topBarBrandTitleY: number;
  topBarBrandTitleFontScale: number;
  topBarBrandSubtitleY: number;
  topBarBrandSubtitleFontScale: number;
  topBarNavWidthRatio: number;
  topBarStatusWidthRatio: number;
  topBarNavGlossWidthRatio: number;
  topBarNavGlossHeightRatio: number;
  topBarNavGlossOffsetYRatio: number;
  topBarNavGlossAlpha: number;
  topBarBrandGlossWidthRatio: number;
  topBarBrandGlossHeightRatio: number;
  topBarBrandGlossOffsetYRatio: number;
  topBarBrandGlossAlpha: number;
  topBarNavTopColorR: number;
  topBarNavTopColorG: number;
  topBarNavTopColorB: number;
  topBarNavBottomColorR: number;
  topBarNavBottomColorG: number;
  topBarNavBottomColorB: number;
  topBarNavMaterialGlossAlpha: number;
  bottomDockHeightRatio: number;
  bottomDockShellAlpha: number;
  bottomDockInnerAlpha: number;
  bottomDockGradientTopAlpha: number;
  bottomDockGradientBottomAlpha: number;
  bottomDockTileGapRatio: number;
  bottomDockIconWidth: number;
  bottomDockIconHeight: number;
  bottomDockIconRadiusRatio: number;
  bottomDockIconBorderWidth: number;
  bottomDockIconBorderAlpha: number;
  bottomDockIconOffsetX: number;
  bottomDockIconOffsetY: number;
  bottomDockIconGlossWidthRatio: number;
  bottomDockIconGlossHeightRatio: number;
  bottomDockIconGlossOffsetYRatio: number;
  bottomDockGlyphAlpha: number;
  bottomDockFeedGlyphSizeScale: number;
  bottomDockFeedGlyphOffsetX: number;
  bottomDockFeedGlyphOffsetY: number;
  bottomDockPlayGlyphSizeScale: number;
  bottomDockPlayGlyphOffsetX: number;
  bottomDockPlayGlyphOffsetY: number;
  bottomDockBathGlyphSizeScale: number;
  bottomDockBathGlyphOffsetX: number;
  bottomDockBathGlyphOffsetY: number;
  bottomDockSleepGlyphSizeScale: number;
  bottomDockSleepGlyphOffsetX: number;
  bottomDockSleepGlyphOffsetY: number;
  bottomDockMusicGlyphSizeScale: number;
  bottomDockMusicGlyphOffsetX: number;
  bottomDockMusicGlyphOffsetY: number;
  bottomDockCareGlyphSizeScale: number;
  bottomDockCareGlyphOffsetX: number;
  bottomDockCareGlyphOffsetY: number;
  bottomDockTileGroupWidthScale: number;
  bottomDockTileWidthScale: number;
  bottomDockTileHeightScale: number;
  bottomDockTileBorderWidth: number;
  bottomDockTileBorderAlpha: number;
  bottomDockTileInnerAlpha: number;
  bottomDockTextOffsetX: number;
  bottomDockTextOffsetY: number;
  bottomDockTextAlpha: number;
  bottomDockTextFontSize: number;
  bottomDockTextColorR: number;
  bottomDockTextColorG: number;
  bottomDockTextColorB: number;
  bottomDockBorderWidth: number;
  bottomDockBorderAlpha: number;
  bottomDockShadowAlpha: number;
  bottomDockShadowSpreadRatio: number;
  topBarOffsetXRatio: number;
  topBarOffsetYRatio: number;
  topBarWidthScale: number;
  topBarHeightScale: number;
  leftCardOffsetXRatio: number;
  leftCardOffsetYRatio: number;
  leftCardWidthScale: number;
  leftCardHeightScale: number;
  rightCardOffsetXRatio: number;
  rightCardOffsetYRatio: number;
  rightCardWidthScale: number;
  rightCardHeightScale: number;
  bottomDockOffsetXRatio: number;
  bottomDockOffsetYRatio: number;
  bottomDockWidthScale: number;
  bottomDockHeightScale: number;
  cloudYRatio: number;
  cloudBaseWidthRatio: number;
  leftCloudXRatio: number;
  rightCloudXRatio: number;
  leftCloudScale: number;
  rightCloudScale: number;
  rightCloudYOffsetRatio: number;
  stageBaseArcWidthRatio: number;
  stageBaseArcHeightRatio: number;
  stageBaseArcBottomRatio: number;
  stageGroundLineYRatio: number;
  safeZoneWidthRatio: number;
  safeZoneHeightRatio: number;
  safeZoneYRatio: number;
  grassYRatio: number;
};

type ArtTuningKey = keyof ArtTuningState;

type ArtTuningField = {
  key: ArtTuningKey;
  section: string;
  label: string;
  description: string;
  min: number;
  max: number;
  step: number;
};

type ArtDebugBridge = {
  getSnapshot: () => { state: ArtTuningState; fields: ArtTuningField[] };
  setValue: (key: string, value: number) => void;
  reset: () => void;
  openReferencePage: () => void;
};

type TopBarNavTab = "petHome" | "bag" | "journal";

type ArtDebugHostWindow = Window &
  typeof globalThis & {
    __BUDDY_CLIENT_ART_DEBUG__?: ArtDebugBridge;
  };

const ART_TUNING_DEFAULTS: ArtTuningState = {
  appShellPadding: APP_SHELL_PADDING,
  shellFramePadding: SHELL_FRAME_PADDING,
  mainViewportRadius: MAIN_VIEWPORT_RADIUS,
  mainViewportAlpha: 255,
  mainViewportShadowAlpha: 56,
  mainViewportShadowSpreadRatio: 0.03,
  mainViewportOffsetXRatio: 0,
  mainViewportOffsetYRatio: 0,
  mainViewportWidthScale: 1,
  mainViewportHeightScale: 1,
  topBarHeightRatio: 0.112,
  topBarShellAlpha: 244,
  topBarInnerAlpha: 142,
  topBarBorderWidth: 3.5,
  topBarBorderAlpha: 255,
  topBarShadowAlpha: 58,
  topBarShadowSpreadRatio: 0.18,
  topBarBrandMarkHeightRatio: 0.64,
  topBarBrandTextGap: 14,
  topBarBrandTitleY: 13,
  topBarBrandTitleFontScale: 0.335,
  topBarBrandSubtitleY: -16,
  topBarBrandSubtitleFontScale: 0.15,
  topBarNavWidthRatio: 0.325,
  topBarStatusWidthRatio: 0.118,
  topBarNavGlossWidthRatio: 0.76,
  topBarNavGlossHeightRatio: 0.34,
  topBarNavGlossOffsetYRatio: 0.16,
  topBarNavGlossAlpha: 52,
  topBarBrandGlossWidthRatio: 0.72,
  topBarBrandGlossHeightRatio: 0.3,
  topBarBrandGlossOffsetYRatio: 0.12,
  topBarBrandGlossAlpha: 46,
  topBarNavTopColorR: 237,
  topBarNavTopColorG: 194,
  topBarNavTopColorB: 58,
  topBarNavBottomColorR: 245,
  topBarNavBottomColorG: 160,
  topBarNavBottomColorB: 72,
  topBarNavMaterialGlossAlpha: 56,
  bottomDockHeightRatio: 0.172,
  bottomDockShellAlpha: 255,
  bottomDockInnerAlpha: 218,
  bottomDockGradientTopAlpha: 26,
  bottomDockGradientBottomAlpha: 18,
  bottomDockTileGapRatio: 0.011,
  bottomDockIconWidth: 62,
  bottomDockIconHeight: 52,
  bottomDockIconRadiusRatio: 0.42,
  bottomDockIconBorderWidth: 1,
  bottomDockIconBorderAlpha: 210,
  bottomDockIconOffsetX: 0,
  bottomDockIconOffsetY: 0,
  bottomDockIconGlossWidthRatio: 0.7,
  bottomDockIconGlossHeightRatio: 0.28,
  bottomDockIconGlossOffsetYRatio: 0.13,
  bottomDockGlyphAlpha: 255,
  bottomDockFeedGlyphSizeScale: 1,
  bottomDockFeedGlyphOffsetX: 0,
  bottomDockFeedGlyphOffsetY: 0,
  bottomDockPlayGlyphSizeScale: 1,
  bottomDockPlayGlyphOffsetX: 0,
  bottomDockPlayGlyphOffsetY: 0,
  bottomDockBathGlyphSizeScale: 1,
  bottomDockBathGlyphOffsetX: 0,
  bottomDockBathGlyphOffsetY: 0,
  bottomDockSleepGlyphSizeScale: 1,
  bottomDockSleepGlyphOffsetX: 0,
  bottomDockSleepGlyphOffsetY: 0,
  bottomDockMusicGlyphSizeScale: 1,
  bottomDockMusicGlyphOffsetX: 0,
  bottomDockMusicGlyphOffsetY: 0,
  bottomDockCareGlyphSizeScale: 1,
  bottomDockCareGlyphOffsetX: 0,
  bottomDockCareGlyphOffsetY: 0,
  bottomDockTileGroupWidthScale: 1,
  bottomDockTileWidthScale: 1,
  bottomDockTileHeightScale: 1,
  bottomDockTileBorderWidth: 2,
  bottomDockTileBorderAlpha: 218,
  bottomDockTileInnerAlpha: 255,
  bottomDockTextOffsetX: 0,
  bottomDockTextOffsetY: 0,
  bottomDockTextAlpha: 255,
  bottomDockTextFontSize: 18,
  bottomDockTextColorR: 110,
  bottomDockTextColorG: 74,
  bottomDockTextColorB: 51,
  bottomDockBorderWidth: 2,
  bottomDockBorderAlpha: 255,
  bottomDockShadowAlpha: 50,
  bottomDockShadowSpreadRatio: 0.18,
  topBarOffsetXRatio: 0,
  topBarOffsetYRatio: 0,
  topBarWidthScale: 1,
  topBarHeightScale: 0.94,
  leftCardOffsetXRatio: 0,
  leftCardOffsetYRatio: 0,
  leftCardWidthScale: 1,
  leftCardHeightScale: 1,
  rightCardOffsetXRatio: 0,
  rightCardOffsetYRatio: 0,
  rightCardWidthScale: 1,
  rightCardHeightScale: 1,
  bottomDockOffsetXRatio: 0,
  bottomDockOffsetYRatio: 0,
  bottomDockWidthScale: 1,
  bottomDockHeightScale: 1,
  cloudYRatio: 0.33,
  cloudBaseWidthRatio: 0.28,
  leftCloudXRatio: -0.25,
  rightCloudXRatio: 0.25,
  leftCloudScale: 0.92,
  rightCloudScale: 1.08,
  rightCloudYOffsetRatio: 0.02,
  stageBaseArcWidthRatio: 0.56,
  stageBaseArcHeightRatio: 0.145,
  stageBaseArcBottomRatio: 0.165,
  stageGroundLineYRatio: -0.145,
  safeZoneWidthRatio: 0.4,
  safeZoneHeightRatio: 0.585,
  safeZoneYRatio: 0.018,
  grassYRatio: -0.305,
};

const ART_TUNING_FIELDS: ArtTuningField[] = [
  {
    key: "appShellPadding",
    section: "壳层",
    label: "壳层内缩",
    description: "控制壳层到第一层内框的整体留白。",
    min: 8,
    max: 32,
    step: 1,
  },
  {
    key: "shellFramePadding",
    section: "壳层",
    label: "视口内缩",
    description: "控制 ShellFrame 到 MainViewport 的距离。",
    min: 12,
    max: 36,
    step: 1,
  },
  {
    key: "mainViewportRadius",
    section: "壳层",
    label: "主视口圆角",
    description: "控制 MainViewport 的柔和程度。",
    min: 22,
    max: 42,
    step: 1,
  },
  {
    key: "mainViewportAlpha",
    section: "主视口",
    label: "主视口透明度",
    description: "控制 MainViewport 本体的整体透明度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "mainViewportShadowAlpha",
    section: "主视口",
    label: "主视口阴影透明度",
    description: "控制 MainViewport 外阴影的可见强度。",
    min: 0,
    max: 120,
    step: 1,
  },
  {
    key: "mainViewportShadowSpreadRatio",
    section: "主视口",
    label: "主视口阴影扩散比例",
    description: "控制 MainViewport 外阴影向四周扩散的范围。",
    min: 0.01,
    max: 0.08,
    step: 0.002,
  },
  {
    key: "mainViewportOffsetXRatio",
    section: "主视口布局",
    label: "水平位置",
    description: "控制 MainViewport 相对 ShellFrame 基准位置的水平偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "mainViewportOffsetYRatio",
    section: "主视口布局",
    label: "垂直位置",
    description: "控制 MainViewport 相对 ShellFrame 基准位置的垂直偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "mainViewportHeightScale",
    section: "主视口布局",
    label: "高度",
    description: "控制 MainViewport 相对基准高度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "mainViewportWidthScale",
    section: "主视口布局",
    label: "宽度",
    description: "控制 MainViewport 相对基准宽度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "topBarHeightRatio",
    section: "顶栏",
    label: "顶栏高度比例",
    description: "控制顶栏相对主视口高度的占比。",
    min: 0.075,
    max: 0.18,
    step: 0.002,
  },
  {
    key: "topBarShellAlpha",
    section: "顶栏",
    label: "顶栏外壳透明度",
    description: "控制顶栏最外层壳体底色的可见程度。",
    min: 180,
    max: 255,
    step: 1,
  },
  {
    key: "topBarInnerAlpha",
    section: "顶栏",
    label: "顶栏内层透明度",
    description: "控制顶栏内层面板的可见程度，不和外壳透明度绑死。",
    min: 28,
    max: 236,
    step: 1,
  },
  {
    key: "topBarBorderWidth",
    section: "顶栏",
    label: "顶栏描边宽度",
    description: "控制顶栏外圈描边的粗细。",
    min: 1,
    max: 6,
    step: 0.5,
  },
  {
    key: "topBarBorderAlpha",
    section: "顶栏",
    label: "顶栏描边透明度",
    description: "控制顶栏外圈描边的可见程度。",
    min: 120,
    max: 255,
    step: 1,
  },
  {
    key: "topBarShadowAlpha",
    section: "顶栏",
    label: "顶栏阴影透明度",
    description: "控制顶栏外阴影的可见强度，语义与壳层 / 主视口一致。",
    min: 0,
    max: 120,
    step: 1,
  },
  {
    key: "topBarShadowSpreadRatio",
    section: "顶栏",
    label: "顶栏阴影扩散比例",
    description: "控制顶栏外阴影向四周扩散的范围，语义与壳层 / 主视口一致。",
    min: 0.08,
    max: 0.28,
    step: 0.005,
  },
  {
    key: "topBarBrandMarkHeightRatio",
    section: "顶栏",
    label: "品牌图标比例",
    description: "控制左上品牌图标相对顶栏高度的比例。",
    min: 0.5,
    max: 0.8,
    step: 0.01,
  },
  {
    key: "topBarBrandTextGap",
    section: "顶栏",
    label: "图标文字间距",
    description: "控制品牌图标与标题组之间的水平距离。",
    min: 8,
    max: 30,
    step: 1,
  },
  {
    key: "topBarBrandTitleY",
    section: "顶栏细调",
    label: "标题纵向位移",
    description: "控制品牌主标题在顶栏中的上下位置。",
    min: 0,
    max: 24,
    step: 1,
  },
  {
    key: "topBarBrandTitleFontScale",
    section: "顶栏细调",
    label: "标题字号比例",
    description: "控制品牌主标题相对顶栏高度的字号比例。",
    min: 0.26,
    max: 0.4,
    step: 0.005,
  },
  {
    key: "topBarBrandSubtitleY",
    section: "顶栏细调",
    label: "副标题纵向位移",
    description: "控制品牌副标题在顶栏中的上下位置。",
    min: -28,
    max: -6,
    step: 1,
  },
  {
    key: "topBarBrandSubtitleFontScale",
    section: "顶栏细调",
    label: "副标题字号比例",
    description: "控制品牌副标题相对顶栏高度的字号比例。",
    min: 0.11,
    max: 0.2,
    step: 0.005,
  },
  {
    key: "topBarNavWidthRatio",
    section: "顶栏",
    label: "导航宽度比例",
    description: "控制中间胶囊导航的总宽度。",
    min: 0.26,
    max: 0.38,
    step: 0.002,
  },
  {
    key: "topBarStatusWidthRatio",
    section: "顶栏",
    label: "状态入口比例",
    description: "控制右侧状态入口的宽度。",
    min: 0.09,
    max: 0.15,
    step: 0.002,
  },
  {
    key: "topBarNavGlossWidthRatio",
    section: "顶栏细调",
    label: "导航高光宽度",
    description: "控制激活按钮顶部高光相对按钮宽度的比例。",
    min: 0.45,
    max: 0.95,
    step: 0.01,
  },
  {
    key: "topBarNavGlossHeightRatio",
    section: "顶栏细调",
    label: "导航高光高度",
    description: "控制激活按钮顶部高光相对按钮高度的比例。",
    min: 0.16,
    max: 0.6,
    step: 0.01,
  },
  {
    key: "topBarNavGlossOffsetYRatio",
    section: "顶栏细调",
    label: "导航高光位置",
    description: "控制激活按钮顶部高光的纵向位置。",
    min: -0.05,
    max: 0.3,
    step: 0.01,
  },
  {
    key: "topBarNavGlossAlpha",
    section: "顶栏细调",
    label: "导航高光透明度",
    description: "控制激活按钮顶部高光的可见强度。",
    min: 0,
    max: 140,
    step: 1,
  },
  {
    key: "topBarBrandGlossWidthRatio",
    section: "顶栏细调",
    label: "图标高光宽度",
    description: "控制品牌图标高光相对图标宽度的比例。",
    min: 0.4,
    max: 0.95,
    step: 0.01,
  },
  {
    key: "topBarBrandGlossHeightRatio",
    section: "顶栏细调",
    label: "图标高光高度",
    description: "控制品牌图标高光相对图标高度的比例。",
    min: 0.14,
    max: 0.6,
    step: 0.01,
  },
  {
    key: "topBarBrandGlossOffsetYRatio",
    section: "顶栏细调",
    label: "图标高光位置",
    description: "控制品牌图标高光的纵向位置。",
    min: -0.22,
    max: 0.48,
    step: 0.01,
  },
  {
    key: "topBarBrandGlossAlpha",
    section: "顶栏细调",
    label: "图标高光透明度",
    description: "控制品牌图标高光的可见强度。",
    min: 0,
    max: 140,
    step: 1,
  },
  {
    key: "topBarNavTopColorR",
    section: "顶栏细调",
    label: "顶部黄 R",
    description: "控制激活按钮顶部渐变色的红色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "topBarNavTopColorG",
    section: "顶栏细调",
    label: "顶部黄 G",
    description: "控制激活按钮顶部渐变色的绿色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "topBarNavTopColorB",
    section: "顶栏细调",
    label: "顶部黄 B",
    description: "控制激活按钮顶部渐变色的蓝色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "topBarNavBottomColorR",
    section: "顶栏细调",
    label: "底部橙 R",
    description: "控制激活按钮底部渐变色的红色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "topBarNavBottomColorG",
    section: "顶栏细调",
    label: "底部橙 G",
    description: "控制激活按钮底部渐变色的绿色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "topBarNavBottomColorB",
    section: "顶栏细调",
    label: "底部橙 B",
    description: "控制激活按钮底部渐变色的蓝色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "topBarNavMaterialGlossAlpha",
    section: "顶栏细调",
    label: "材质 Gloss 强度",
    description: "控制激活按钮材质内置 gloss 的整体强度。",
    min: 0,
    max: 140,
    step: 1,
  },
  {
    key: "bottomDockHeightRatio",
    section: "底栏",
    label: "底栏高度比例",
    description: "控制底栏相对主视口高度的占比。",
    min: 0.14,
    max: 0.22,
    step: 0.002,
  },
  {
    key: "bottomDockShellAlpha",
    section: "底栏",
    label: "底栏底色透明度",
    description: "控制底栏外壳底色的可见程度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockInnerAlpha",
    section: "底栏",
    label: "底栏内层透明度",
    description: "控制底栏内层白色卡面的可见程度；外壳透明度不明显时通常是这一层在覆盖。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockGradientTopAlpha",
    section: "底栏",
    label: "底栏渐变上透明度",
    description: "控制底栏内部微弱上下渐变的顶部亮度。",
    min: 0,
    max: 120,
    step: 1,
  },
  {
    key: "bottomDockGradientBottomAlpha",
    section: "底栏",
    label: "底栏渐变下透明度",
    description: "控制底栏内部微弱上下渐变的底部暖色强度。",
    min: 0,
    max: 120,
    step: 1,
  },
  {
    key: "bottomDockTileGapRatio",
    section: "底栏",
    label: "动作卡间距比例",
    description: "控制六宫格动作卡之间的水平缝隙。",
    min: 0.006,
    max: 0.02,
    step: 0.001,
  },
  {
    key: "bottomDockIconWidth",
    section: "底栏",
    label: "动作图标长度",
    description: "控制底栏每个动作图标圆润圆角矩形底形的横向长度。",
    min: 36,
    max: 96,
    step: 1,
  },
  {
    key: "bottomDockIconHeight",
    section: "底栏",
    label: "动作图标高度",
    description: "控制底栏每个动作图标圆润圆角矩形底形的纵向高度。",
    min: 32,
    max: 88,
    step: 1,
  },
  {
    key: "bottomDockIconRadiusRatio",
    section: "底栏",
    label: "动作图标圆角比例",
    description: "控制动作图标底形圆角相对短边的比例，保持圆润但不做成完整半圆胶囊。",
    min: 0.2,
    max: 0.48,
    step: 0.01,
  },
  {
    key: "bottomDockIconBorderWidth",
    section: "底栏",
    label: "动作图标描边粗细",
    description: "控制动作图标圆润圆角矩形底形外圈描边粗细。",
    min: 0,
    max: 5,
    step: 0.5,
  },
  {
    key: "bottomDockIconBorderAlpha",
    section: "底栏",
    label: "动作图标描边透明度",
    description: "控制动作图标圆润圆角矩形底形外圈描边可见程度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockIconOffsetX",
    section: "底栏",
    label: "动作图标水平位移",
    description: "控制六个动作图标在各自动作卡里的水平位移。",
    min: -28,
    max: 28,
    step: 1,
  },
  {
    key: "bottomDockIconOffsetY",
    section: "底栏",
    label: "动作图标垂直位移",
    description: "控制六个动作图标在各自动作卡里的垂直位移。",
    min: -28,
    max: 28,
    step: 1,
  },
  {
    key: "bottomDockIconGlossWidthRatio",
    section: "底栏",
    label: "动作图标高光长度",
    description: "控制动作图标顶部高光相对图标长度的比例。",
    min: 0.25,
    max: 0.95,
    step: 0.01,
  },
  {
    key: "bottomDockIconGlossHeightRatio",
    section: "底栏",
    label: "动作图标高光高度",
    description: "控制动作图标顶部高光相对图标高度的比例。",
    min: 0.12,
    max: 0.55,
    step: 0.01,
  },
  {
    key: "bottomDockIconGlossOffsetYRatio",
    section: "底栏",
    label: "动作图标高光位移",
    description: "控制动作图标顶部高光的纵向位移。",
    min: -0.18,
    max: 0.32,
    step: 0.01,
  },
  {
    key: "bottomDockGlyphAlpha",
    section: "底栏",
    label: "颜文字透明度",
    description: "统一控制六个动作图标内颜文字 / 符号的可见程度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockFeedGlyphSizeScale",
    section: "底栏",
    label: "喂食颜文字大小",
    description: "单独控制喂食图标颜文字大小。",
    min: 0.55,
    max: 1.45,
    step: 0.02,
  },
  {
    key: "bottomDockFeedGlyphOffsetX",
    section: "底栏",
    label: "喂食颜文字左右",
    description: "单独控制喂食图标颜文字水平位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockFeedGlyphOffsetY",
    section: "底栏",
    label: "喂食颜文字上下",
    description: "单独控制喂食图标颜文字垂直位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockPlayGlyphSizeScale",
    section: "底栏",
    label: "玩耍颜文字大小",
    description: "单独控制玩耍图标颜文字大小。",
    min: 0.55,
    max: 1.45,
    step: 0.02,
  },
  {
    key: "bottomDockPlayGlyphOffsetX",
    section: "底栏",
    label: "玩耍颜文字左右",
    description: "单独控制玩耍图标颜文字水平位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockPlayGlyphOffsetY",
    section: "底栏",
    label: "玩耍颜文字上下",
    description: "单独控制玩耍图标颜文字垂直位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockBathGlyphSizeScale",
    section: "底栏",
    label: "洗澡颜文字大小",
    description: "单独控制洗澡图标颜文字大小。",
    min: 0.55,
    max: 1.45,
    step: 0.02,
  },
  {
    key: "bottomDockBathGlyphOffsetX",
    section: "底栏",
    label: "洗澡颜文字左右",
    description: "单独控制洗澡图标颜文字水平位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockBathGlyphOffsetY",
    section: "底栏",
    label: "洗澡颜文字上下",
    description: "单独控制洗澡图标颜文字垂直位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockSleepGlyphSizeScale",
    section: "底栏",
    label: "睡觉颜文字大小",
    description: "单独控制睡觉图标颜文字大小。",
    min: 0.55,
    max: 1.45,
    step: 0.02,
  },
  {
    key: "bottomDockSleepGlyphOffsetX",
    section: "底栏",
    label: "睡觉颜文字左右",
    description: "单独控制睡觉图标颜文字水平位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockSleepGlyphOffsetY",
    section: "底栏",
    label: "睡觉颜文字上下",
    description: "单独控制睡觉图标颜文字垂直位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockMusicGlyphSizeScale",
    section: "底栏",
    label: "听歌颜文字大小",
    description: "单独控制听歌图标颜文字大小。",
    min: 0.55,
    max: 1.45,
    step: 0.02,
  },
  {
    key: "bottomDockMusicGlyphOffsetX",
    section: "底栏",
    label: "听歌颜文字左右",
    description: "单独控制听歌图标颜文字水平位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockMusicGlyphOffsetY",
    section: "底栏",
    label: "听歌颜文字上下",
    description: "单独控制听歌图标颜文字垂直位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockCareGlyphSizeScale",
    section: "底栏",
    label: "心情颜文字大小",
    description: "单独控制心情图标颜文字大小。",
    min: 0.55,
    max: 1.45,
    step: 0.02,
  },
  {
    key: "bottomDockCareGlyphOffsetX",
    section: "底栏",
    label: "心情颜文字左右",
    description: "单独控制心情图标颜文字水平位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockCareGlyphOffsetY",
    section: "底栏",
    label: "心情颜文字上下",
    description: "单独控制心情图标颜文字垂直位移。",
    min: -18,
    max: 18,
    step: 1,
  },
  {
    key: "bottomDockTileGroupWidthScale",
    section: "底栏",
    label: "动作卡整体宽度",
    description: "控制六个动作卡整体轨道的横向占用范围，围绕底栏中心展开或收拢。",
    min: 0.45,
    max: 1.55,
    step: 0.02,
  },
  {
    key: "bottomDockTileWidthScale",
    section: "底栏",
    label: "动作卡宽度",
    description: "微调六个动作卡相对自动分配宽度的缩放，已做钝化处理。",
    min: 0.45,
    max: 1.55,
    step: 0.02,
  },
  {
    key: "bottomDockTileHeightScale",
    section: "底栏",
    label: "动作卡高度",
    description: "微调六个动作卡相对底栏基准高度的缩放，已做钝化处理。",
    min: 0.45,
    max: 1.55,
    step: 0.02,
  },
  {
    key: "bottomDockTileBorderWidth",
    section: "底栏",
    label: "动作卡描边宽度",
    description: "控制六个动作卡外圈奶油描边的粗细。",
    min: 0,
    max: 6,
    step: 0.5,
  },
  {
    key: "bottomDockTileBorderAlpha",
    section: "底栏",
    label: "动作卡描边透明度",
    description: "控制六个动作卡外圈奶油描边的可见程度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockTileInnerAlpha",
    section: "底栏",
    label: "动作卡卡面透明度",
    description: "控制六个动作卡白色内层卡面的可见程度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockTextOffsetX",
    section: "底栏",
    label: "动作文字水平位移",
    description: "统一控制喂食、玩耍、洗澡、睡觉、听歌、心情文字的水平位置。",
    min: -40,
    max: 40,
    step: 1,
  },
  {
    key: "bottomDockTextOffsetY",
    section: "底栏",
    label: "动作文字垂直位移",
    description: "统一控制喂食、玩耍、洗澡、睡觉、听歌、心情文字的垂直位置。",
    min: -40,
    max: 40,
    step: 1,
  },
  {
    key: "bottomDockTextAlpha",
    section: "底栏",
    label: "动作文字透明度",
    description: "统一控制底栏六个动作文字的可见程度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockTextFontSize",
    section: "底栏",
    label: "动作文字字号",
    description: "统一控制底栏六个动作文字的字号大小。",
    min: 10,
    max: 34,
    step: 1,
  },
  {
    key: "bottomDockTextColorR",
    section: "底栏",
    label: "动作文字颜色 R",
    description: "控制底栏动作文字颜色的红色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockTextColorG",
    section: "底栏",
    label: "动作文字颜色 G",
    description: "控制底栏动作文字颜色的绿色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockTextColorB",
    section: "底栏",
    label: "动作文字颜色 B",
    description: "控制底栏动作文字颜色的蓝色通道。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockBorderWidth",
    section: "底栏",
    label: "底栏描边宽度",
    description: "控制底栏外圈描边的粗细。",
    min: 0,
    max: 6,
    step: 0.5,
  },
  {
    key: "bottomDockBorderAlpha",
    section: "底栏",
    label: "底栏描边透明度",
    description: "控制底栏外圈描边的可见程度。",
    min: 0,
    max: 255,
    step: 1,
  },
  {
    key: "bottomDockShadowAlpha",
    section: "底栏",
    label: "底栏阴影透明度",
    description: "控制底栏外阴影的可见强度，语义与顶栏一致。",
    min: 0,
    max: 120,
    step: 1,
  },
  {
    key: "bottomDockShadowSpreadRatio",
    section: "底栏",
    label: "底栏阴影扩散比例",
    description: "控制底栏外阴影向四周扩散的范围，语义与顶栏一致。",
    min: 0.08,
    max: 0.28,
    step: 0.005,
  },
  {
    key: "topBarOffsetXRatio",
    section: "主视口布局",
    label: "顶栏水平位置",
    description: "控制顶栏相对主视口基准位置的水平偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "topBarOffsetYRatio",
    section: "主视口布局",
    label: "顶栏垂直位置",
    description: "控制顶栏相对主视口基准位置的垂直偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "topBarWidthScale",
    section: "主视口布局",
    label: "顶栏宽度",
    description: "控制顶栏相对基准宽度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "topBarHeightScale",
    section: "主视口布局",
    label: "顶栏高度",
    description: "控制顶栏相对基准高度的缩放。",
    min: 0.48,
    max: 1.55,
    step: 0.01,
  },
  {
    key: "leftCardOffsetXRatio",
    section: "主视口布局",
    label: "左卡水平位置",
    description: "控制左卡相对主视口基准位置的水平偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "leftCardOffsetYRatio",
    section: "主视口布局",
    label: "左卡垂直位置",
    description: "控制左卡相对主视口基准位置的垂直偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "leftCardWidthScale",
    section: "主视口布局",
    label: "左卡宽度",
    description: "控制左卡相对基准宽度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "leftCardHeightScale",
    section: "主视口布局",
    label: "左卡高度",
    description: "控制左卡相对基准高度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "rightCardOffsetXRatio",
    section: "主视口布局",
    label: "右卡水平位置",
    description: "控制右卡相对主视口基准位置的水平偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "rightCardOffsetYRatio",
    section: "主视口布局",
    label: "右卡垂直位置",
    description: "控制右卡相对主视口基准位置的垂直偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "rightCardWidthScale",
    section: "主视口布局",
    label: "右卡宽度",
    description: "控制右卡相对基准宽度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "rightCardHeightScale",
    section: "主视口布局",
    label: "右卡高度",
    description: "控制右卡相对基准高度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "bottomDockOffsetXRatio",
    section: "主视口布局",
    label: "底栏水平位置",
    description: "控制底栏相对主视口基准位置的水平偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "bottomDockOffsetYRatio",
    section: "主视口布局",
    label: "底栏垂直位置",
    description: "控制底栏相对主视口基准位置的垂直偏移。",
    min: -0.2,
    max: 0.2,
    step: 0.01,
  },
  {
    key: "bottomDockWidthScale",
    section: "主视口布局",
    label: "底栏宽度",
    description: "控制底栏相对基准宽度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "bottomDockHeightScale",
    section: "主视口布局",
    label: "底栏高度",
    description: "控制底栏相对基准高度的缩放。",
    min: 0.6,
    max: 1.4,
    step: 0.01,
  },
  {
    key: "cloudYRatio",
    section: "云朵",
    label: "云层高度比例",
    description: "控制顶部云层整体的纵向高度。",
    min: 0.22,
    max: 0.42,
    step: 0.005,
  },
  {
    key: "cloudBaseWidthRatio",
    section: "云朵",
    label: "云层基础宽度比例",
    description: "控制两朵云共同使用的基础横向尺寸。",
    min: 0.2,
    max: 0.38,
    step: 0.005,
  },
  {
    key: "leftCloudXRatio",
    section: "云朵",
    label: "左云横向比例",
    description: "控制左云相对舞台中心的水平位置。",
    min: -0.36,
    max: -0.12,
    step: 0.005,
  },
  {
    key: "rightCloudXRatio",
    section: "云朵",
    label: "右云横向比例",
    description: "控制右云相对舞台中心的水平位置。",
    min: 0.12,
    max: 0.36,
    step: 0.005,
  },
  {
    key: "leftCloudScale",
    section: "云朵",
    label: "左云缩放",
    description: "控制左云的单独大小。",
    min: 0.7,
    max: 1.3,
    step: 0.01,
  },
  {
    key: "rightCloudScale",
    section: "云朵",
    label: "右云缩放",
    description: "控制右云的单独大小。",
    min: 0.7,
    max: 1.35,
    step: 0.01,
  },
  {
    key: "rightCloudYOffsetRatio",
    section: "云朵",
    label: "右云纵向偏移比例",
    description: "控制右云相对左云的上下错位。",
    min: -0.02,
    max: 0.06,
    step: 0.005,
  },
  {
    key: "stageBaseArcWidthRatio",
    section: "舞台",
    label: "地面阴影宽度比例",
    description: "控制中央地面承托阴影的横向宽度。",
    min: 0.42,
    max: 0.72,
    step: 0.01,
  },
  {
    key: "stageBaseArcHeightRatio",
    section: "舞台",
    label: "地面阴影高度比例",
    description: "控制中央地面承托阴影的厚度。",
    min: 0.08,
    max: 0.22,
    step: 0.005,
  },
  {
    key: "stageBaseArcBottomRatio",
    section: "舞台",
    label: "地面阴影上移比例",
    description: "控制地面阴影离底部的距离。",
    min: 0.09,
    max: 0.24,
    step: 0.005,
  },
  {
    key: "stageGroundLineYRatio",
    section: "舞台",
    label: "地平线纵向比例",
    description: "控制地平线在舞台中的纵向位置。",
    min: -0.24,
    max: -0.04,
    step: 0.005,
  },
  {
    key: "safeZoneWidthRatio",
    section: "舞台",
    label: "安全区宽度比例",
    description: "控制宠物安全区相对舞台宽度的占比。",
    min: 0.28,
    max: 0.52,
    step: 0.01,
  },
  {
    key: "safeZoneHeightRatio",
    section: "舞台",
    label: "安全区高度比例",
    description: "控制宠物安全区相对舞台高度的占比。",
    min: 0.42,
    max: 0.7,
    step: 0.01,
  },
  {
    key: "safeZoneYRatio",
    section: "舞台",
    label: "安全区纵向比例",
    description: "控制宠物安全区整体上移或下移。",
    min: -0.06,
    max: 0.12,
    step: 0.005,
  },
  {
    key: "grassYRatio",
    section: "舞台",
    label: "草丛纵向比例",
    description: "控制底部草丛和花朵整体高度。",
    min: -0.38,
    max: -0.2,
    step: 0.005,
  },
];

@ccclass("MainController")
export class MainController extends ScreenController {
  private referencePageUrl: string | null = null;
  private artDebugPageWindow: Window | null = null;
  private lastReferenceOpenAt = 0;
  private backgroundGradientSpriteFrame: SpriteFrame | null = null;
  private backgroundGlowTopLeftSpriteFrame: SpriteFrame | null = null;
  private backgroundGlowBottomRightSpriteFrame: SpriteFrame | null = null;
  private stageCloudSpriteFrame: SpriteFrame | null = null;
  private radialGlowEffectAsset: EffectAsset | null = null;
  private shellShadowSpriteFrame: SpriteFrame | null = null;
  private mainViewportShadowSpriteFrame: SpriteFrame | null = null;
  private topBarShadowSpriteFrame: SpriteFrame | null = null;
  private bottomDockShadowSpriteFrame: SpriteFrame | null = null;
  private cloudSoftEffectAsset: EffectAsset | null = null;
  private buttonGradientEffectAsset: EffectAsset | null = null;
  private whiteSpriteFrame: SpriteFrame | null = null;
  private shellShadowLayoutKey = "";
  private mainViewportShadowLayoutKey = "";
  private topBarShadowLayoutKey = "";
  private bottomDockShadowLayoutKey = "";
  private backgroundAssetLoadRequested = false;
  private buttonGradientEffectLoadRequested = false;
  private showBackgroundGradient = true;
  private showBackgroundGlowTopLeft = true;
  private showBackgroundGlowBottomRight = true;
  private showBackgroundDebugPanel = false;
  private showShellLayer = true;
  private showShellFrameLayer = true;
  private showMainViewportLayer = true;
  private showShaderDebugBlock = false;
  private artTuning: ArtTuningState = { ...ART_TUNING_DEFAULTS };
  private activeTopBarNavTab: TopBarNavTab = "petHome";

  onLoad(): void {
    this.hydrateArtTuningFromStorage();
    this.installArtDebugBridge();
    view.on("canvas-resize", this.render, this);
  }

  onDestroy(): void {
    view.off("canvas-resize", this.render, this);
    this.releaseArtDebugPage();
    this.uninstallArtDebugBridge();
    this.releaseReferencePageUrl();
  }

  async start(): Promise<void> {
    this.render();
    await this.redirectToLoginWhenSessionMissing();
  }

  private async redirectToLoginWhenSessionMissing(): Promise<void> {
    try {
      const user = appState.getCurrentUser() ?? (await authService.bootstrapSession());
      if (!user) {
        sceneRouter.goToLogin();
      }
    } catch {
      sceneRouter.goToLogin();
    }
  }

  private render(): void {
    // 每次重绘都先算一次当前视口对应的布局参数。
    // 这样切分辨率、旋转设备、调整窗口时，主舞台不会死在固定像素上。
    const layout = this.resolveLayout();
    const root = this.ensureManagedRoot("MainRoot");
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(layout.viewportWidth, layout.viewportHeight);

    RuntimeUI.clear(root);
    this.installArtDebugBridge();
    this.ensureButtonGradientEffectLoaded();
    this.renderBackdrop(root, layout);
    this.renderShell(root, layout);
    this.renderBackgroundDebugEntry(root, layout);
  }

  private hydrateArtTuningFromStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(ART_TUNING_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<Record<ArtTuningKey, unknown>>;
      ART_TUNING_FIELDS.forEach((field) => {
        const value = parsed[field.key];
        if (typeof value === "number" && Number.isFinite(value)) {
          this.artTuning[field.key] = this.normalizeArtTuningValue(field.key, value);
        }
      });
    } catch (error) {
      console.warn("[MainController] failed to restore art tuning state", error);
    }
  }

  private persistArtTuningToStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(ART_TUNING_STORAGE_KEY, JSON.stringify(this.artTuning));
    } catch (error) {
      console.warn("[MainController] failed to persist art tuning state", error);
    }
  }

  private installArtDebugBridge(): void {
    if (typeof window === "undefined") {
      return;
    }

    const hostWindow = window as ArtDebugHostWindow;
    hostWindow.__BUDDY_CLIENT_ART_DEBUG__ = {
      getSnapshot: () => ({
        state: { ...this.artTuning },
        fields: ART_TUNING_FIELDS.map((field) => this.resolveArtTuningFieldSnapshot(field)),
      }),
      setValue: (key, value) => {
        if (this.isArtTuningKey(key)) {
          this.setArtTuningValue(key, value);
        }
      },
      reset: () => this.resetArtTuning(),
      openReferencePage: () => this.openReferencePage(),
    };
  }

  private uninstallArtDebugBridge(): void {
    if (typeof window === "undefined") {
      return;
    }

    const hostWindow = window as ArtDebugHostWindow;
    delete hostWindow.__BUDDY_CLIENT_ART_DEBUG__;
  }

  private isArtTuningKey(key: string): key is ArtTuningKey {
    return ART_TUNING_FIELDS.some((field) => field.key === key);
  }

  private getArtTuningValue(key: ArtTuningKey): number {
    return this.artTuning[key];
  }

  private setArtTuningValue(key: ArtTuningKey, value: number): void {
    const normalized = this.normalizeArtTuningValue(key, value);
    if (this.artTuning[key] === normalized) {
      return;
    }

    this.artTuning[key] = normalized;
    this.persistArtTuningToStorage();
    this.render();
  }

  private resetArtTuning(): void {
    this.artTuning = { ...ART_TUNING_DEFAULTS };
    this.persistArtTuningToStorage();
    this.render();
  }

  private normalizeArtTuningValue(key: ArtTuningKey, value: number): number {
    const field = ART_TUNING_FIELDS.find((item) => item.key === key);
    if (!field) {
      return value;
    }

    const bounds = this.resolveArtTuningFieldBounds(field);
    const clamped = Math.max(bounds.min, Math.min(bounds.max, value));
    const precision = this.resolveStepPrecision(field.step);
    return Number(clamped.toFixed(precision));
  }

  private resolveArtTuningFieldSnapshot(field: ArtTuningField): ArtTuningField {
    const bounds = this.resolveArtTuningFieldBounds(field);
    return {
      ...field,
      min: bounds.min,
      max: bounds.max,
    };
  }

  private resolveArtTuningFieldBounds(field: ArtTuningField): { min: number; max: number } {
    switch (field.key) {
      case "appShellPadding":
      case "shellFramePadding":
        return { min: 0, max: 120 };
      case "mainViewportRadius":
        return { min: 0, max: 120 };
      case "mainViewportAlpha":
      case "mainViewportShadowAlpha":
      case "topBarBorderAlpha":
      case "topBarShadowAlpha":
      case "topBarShellAlpha":
      case "topBarInnerAlpha":
      case "bottomDockBorderAlpha":
      case "bottomDockShadowAlpha":
      case "bottomDockTileBorderAlpha":
      case "bottomDockTileInnerAlpha":
      case "bottomDockShellAlpha":
      case "bottomDockInnerAlpha":
      case "bottomDockGradientTopAlpha":
      case "bottomDockGradientBottomAlpha":
      case "bottomDockIconBorderAlpha":
      case "bottomDockGlyphAlpha":
      case "bottomDockTextAlpha":
      case "bottomDockTextColorR":
      case "bottomDockTextColorG":
      case "bottomDockTextColorB":
        return { min: 0, max: 255 };
      case "mainViewportShadowSpreadRatio":
        return { min: 0, max: 0.2 };
      case "topBarShadowSpreadRatio":
      case "bottomDockShadowSpreadRatio":
        return { min: 0, max: 0.3 };
      case "topBarBorderWidth":
      case "bottomDockBorderWidth":
      case "bottomDockTileBorderWidth":
      case "bottomDockIconBorderWidth":
        return { min: 0, max: 24 };
      case "bottomDockIconOffsetX":
      case "bottomDockIconOffsetY":
      case "bottomDockTextOffsetX":
      case "bottomDockTextOffsetY":
      case "bottomDockFeedGlyphOffsetX":
      case "bottomDockFeedGlyphOffsetY":
      case "bottomDockPlayGlyphOffsetX":
      case "bottomDockPlayGlyphOffsetY":
      case "bottomDockBathGlyphOffsetX":
      case "bottomDockBathGlyphOffsetY":
      case "bottomDockSleepGlyphOffsetX":
      case "bottomDockSleepGlyphOffsetY":
      case "bottomDockMusicGlyphOffsetX":
      case "bottomDockMusicGlyphOffsetY":
      case "bottomDockCareGlyphOffsetX":
      case "bottomDockCareGlyphOffsetY":
        return { min: -80, max: 80 };
      case "topBarBrandTextGap":
        return { min: -60, max: 160 };
      case "topBarBrandTitleY":
      case "topBarBrandSubtitleY":
        return { min: -120, max: 120 };
      case "bottomDockIconWidth":
      case "bottomDockIconHeight":
      case "bottomDockTextFontSize":
        return { min: 0, max: 160 };
      case "leftCloudScale":
      case "rightCloudScale":
        return { min: 0, max: 2 };
      case "leftCloudXRatio":
      case "rightCloudXRatio":
      case "cloudYRatio":
      case "rightCloudYOffsetRatio":
      case "safeZoneYRatio":
      case "grassYRatio":
      case "stageGroundLineYRatio":
      case "mainViewportOffsetXRatio":
      case "mainViewportOffsetYRatio":
      case "topBarOffsetXRatio":
      case "topBarOffsetYRatio":
      case "leftCardOffsetXRatio":
      case "leftCardOffsetYRatio":
      case "rightCardOffsetXRatio":
      case "rightCardOffsetYRatio":
      case "bottomDockOffsetXRatio":
      case "bottomDockOffsetYRatio":
        return { min: -1, max: 1 };
      case "topBarBrandTitleFontScale":
      case "topBarBrandSubtitleFontScale":
      case "topBarHeightRatio":
      case "topBarBrandMarkHeightRatio":
      case "topBarNavWidthRatio":
      case "topBarStatusWidthRatio":
      case "bottomDockHeightRatio":
      case "bottomDockTileGapRatio":
      case "bottomDockTileGroupWidthScale":
      case "bottomDockTileWidthScale":
      case "bottomDockTileHeightScale":
      case "bottomDockIconRadiusRatio":
      case "bottomDockIconGlossWidthRatio":
      case "bottomDockIconGlossHeightRatio":
      case "bottomDockIconGlossOffsetYRatio":
      case "bottomDockFeedGlyphSizeScale":
      case "bottomDockPlayGlyphSizeScale":
      case "bottomDockBathGlyphSizeScale":
      case "bottomDockSleepGlyphSizeScale":
      case "bottomDockMusicGlyphSizeScale":
      case "bottomDockCareGlyphSizeScale":
      case "mainViewportWidthScale":
      case "mainViewportHeightScale":
      case "topBarWidthScale":
      case "topBarHeightScale":
      case "leftCardWidthScale":
      case "leftCardHeightScale":
      case "rightCardWidthScale":
      case "rightCardHeightScale":
      case "bottomDockWidthScale":
      case "bottomDockHeightScale":
      case "cloudBaseWidthRatio":
      case "safeZoneWidthRatio":
      case "safeZoneHeightRatio":
      case "stageBaseArcWidthRatio":
      case "stageBaseArcHeightRatio":
      case "stageBaseArcBottomRatio":
        return { min: 0, max: 2 };
      default:
        return { min: field.min, max: field.max };
    }
  }

  private resolveStepPrecision(step: number): number {
    const text = `${step}`;
    const dotIndex = text.indexOf(".");
    return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
  }

  private getGraphicsMaskSubComp(mask: Mask): Graphics | null {
    const subComp = mask.subComp;
    return subComp instanceof Graphics ? subComp : null;
  }

  private resolveLayout(): MainLayout {
    const visible = view.getVisibleSize();
    const viewportWidth = visible.width || FALLBACK_VIEWPORT.width;
    const viewportHeight = visible.height || FALLBACK_VIEWPORT.height;
    const viewportAspect = viewportWidth / Math.max(1, viewportHeight);

    // 根据当前可视区比例，决定壳层在屏幕里的横竖向倾向。
    // 这里的目标不是撑满屏幕，而是先把壳体放到一个“看起来舒服”的上限里。
    const shellAspect = this.resolveShellAspect(viewportAspect);
    const isPortrait = viewportAspect < 1;
    const margin = Math.max(
      isPortrait ? 10 : 20,
      Math.round(Math.min(viewportWidth, viewportHeight) * (isPortrait ? 0.016 : 0.045))
    );
    const maxShellWidth = viewportWidth - margin * 2;
    const maxShellHeight = viewportHeight - margin * 2;

    let shellWidth = maxShellWidth;
    let shellHeight = shellWidth / shellAspect;
    if (shellHeight > maxShellHeight) {
      shellHeight = maxShellHeight;
      shellWidth = shellHeight * shellAspect;
    }

    // 这里的 safe inset 是给内部内容预留的“软边界”。
    // 它不是业务安全区，而是为了让舞台里后续摆内容时有缓冲，不会紧贴壳边。
    const safeInsetX = Math.max(20, Math.round(shellWidth * 0.056));
    const safeInsetY = Math.max(18, Math.round(shellHeight * 0.06));
    const safeWidth = shellWidth - safeInsetX * 2;
    const safeHeight = shellHeight - safeInsetY * 2;
    const buttonSize = Math.max(76, Math.min(140, Math.round(Math.min(safeWidth, safeHeight) * 0.16)));
    const buttonInset = Math.max(14, Math.round(buttonSize * 0.22));

    return {
      viewportWidth,
      viewportHeight,
      shellWidth,
      shellHeight,
      buttonSize,
      buttonX: safeWidth * 0.5 - buttonSize * 0.5 - buttonInset,
      buttonY: safeHeight * 0.5 - buttonSize * 0.5 - buttonInset,
    };
  }

  private resolveShellAspect(viewportAspect: number): number {
    if (viewportAspect <= PORTRAIT_VIEWPORT_ASPECT) {
      const progress = Math.max(0, Math.min(1, (viewportAspect - 0.46) / (PORTRAIT_VIEWPORT_ASPECT - 0.46)));
      return PORTRAIT_SHELL_ASPECT + (BREAKPOINTS[0] - PORTRAIT_SHELL_ASPECT) * progress;
    }

    for (let index = 0; index < BREAKPOINTS.length - 1; index += 1) {
      const current = BREAKPOINTS[index];
      const next = BREAKPOINTS[index + 1];
      if (viewportAspect <= next) {
        const progress = (viewportAspect - current) / (next - current);
        return current + (next - current) * progress;
      }
    }

    return BREAKPOINTS[BREAKPOINTS.length - 1];
  }

  private renderBackdrop(root: Node, layout: MainLayout): void {
    this.ensureBackgroundAssetsLoaded();

    // 背景层只负责大画布氛围，不参与主舞台的结构本身。
    // 这里的背景开关是给调试和人工验收用的。
    if (this.showBackgroundGradient && this.backgroundGradientSpriteFrame) {
      RuntimeUI.createSpriteFrame(root, {
        name: "CanvasBackdropGradientLut",
        x: 0,
        y: 0,
        width: layout.viewportHeight,
        height: layout.viewportWidth,
        spriteFrame: this.backgroundGradientSpriteFrame,
        rotation: -90,
      });
    }

    if (this.showBackgroundGlowTopLeft && this.backgroundGlowTopLeftSpriteFrame) {
      const size = Math.max(420, layout.viewportWidth * 0.46);
      RuntimeUI.createSpriteFrame(root, {
        name: "CanvasBackdropGlowTopLeft",
        x: -layout.viewportWidth * 0.34,
        y: layout.viewportHeight * 0.28,
        width: size,
        height: size,
        spriteFrame: this.backgroundGlowTopLeftSpriteFrame,
        material: this.createRadialGlowMaterial(),
      });
    }

    if (this.showBackgroundGlowBottomRight && this.backgroundGlowBottomRightSpriteFrame) {
      const size = Math.max(480, layout.viewportHeight * 0.72);
      RuntimeUI.createSpriteFrame(root, {
        name: "CanvasBackdropGlowBottomRight",
        x: layout.viewportWidth * 0.36,
        y: -layout.viewportHeight * 0.32,
        width: size,
        height: size,
        spriteFrame: this.backgroundGlowBottomRightSpriteFrame,
        material: this.createRadialGlowMaterial(),
      });
    }
  }

  private ensureBackgroundAssetsLoaded(): void {
    if (this.backgroundAssetLoadRequested) {
      return;
    }

    this.backgroundAssetLoadRequested = true;
    resources.load(MAIN_BG_GRADIENT_LUT_PATH, SpriteFrame, (error, spriteFrame) => {
      if (error || !spriteFrame) {
        console.warn("[MainController] failed to load background gradient LUT", error);
        return;
      }

      this.backgroundGradientSpriteFrame = spriteFrame;
      this.render();
    });

    resources.load(MAIN_BG_GLOW_TOP_LEFT_PATH, SpriteFrame, (error, spriteFrame) => {
      if (error || !spriteFrame) {
        console.warn("[MainController] failed to load top-left background glow", error);
        return;
      }

      this.backgroundGlowTopLeftSpriteFrame = spriteFrame;
      this.render();
    });

    resources.load(MAIN_BG_GLOW_BOTTOM_RIGHT_PATH, SpriteFrame, (error, spriteFrame) => {
      if (error || !spriteFrame) {
        console.warn("[MainController] failed to load bottom-right background glow", error);
        return;
      }

      this.backgroundGlowBottomRightSpriteFrame = spriteFrame;
      this.render();
    });
    resources.load(MAIN_STAGE_CLOUD_PATH, SpriteFrame, (error, spriteFrame) => {
      if (error || !spriteFrame) {
        console.warn("[MainController] failed to load stage cloud sprite", error);
        return;
      }

      this.stageCloudSpriteFrame = spriteFrame;
      this.render();
    });
    resources.load(CLOUD_SOFT_EFFECT_PATH, EffectAsset, (error, effectAsset) => {
	  if (error || !effectAsset) {
		console.warn("[MainController] failed to load cloud soft effect", error);
		return;
	  }

	  this.cloudSoftEffectAsset = effectAsset;
	  this.render();
	});
    resources.load(RADIAL_LUT_EFFECT_PATH, EffectAsset, (error, effectAsset) => {
      if (error || !effectAsset) {
        console.warn("[MainController] failed to load radial LUT effect", error);
        return;
      }

      this.radialGlowEffectAsset = effectAsset;
      this.render();
    });
  }

  private ensureShellShadowAssetsForLayout(options: {
    shellWidth: number;
    shellHeight: number;
    shellRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.shellWidth,
      options.shellHeight,
      options.shellRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.shellShadowLayoutKey !== layoutKey) {
      this.shellShadowLayoutKey = layoutKey;
      this.shellShadowSpriteFrame = this.createLayoutShellShadowSpriteFrame({
        shellWidth: options.shellWidth,
        shellHeight: options.shellHeight,
        spread: options.spread,
        radius: options.shellRadius,
        sigmaFar: Math.max(6, options.spread * 0.34),
        sigmaNear: Math.max(3, options.spread * 0.16),
        strength: 0.22,
      });
    }
  }

  private ensureMainViewportShadowAssetsForLayout(options: {
    viewportWidth: number;
    viewportHeight: number;
    viewportRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.viewportWidth,
      options.viewportHeight,
      options.viewportRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.mainViewportShadowLayoutKey !== layoutKey) {
      this.mainViewportShadowLayoutKey = layoutKey;
      this.mainViewportShadowSpriteFrame = this.createLayoutShellShadowSpriteFrame({
        shellWidth: options.viewportWidth,
        shellHeight: options.viewportHeight,
        spread: options.spread,
        radius: options.viewportRadius,
        sigmaFar: Math.max(5, options.spread * 0.3),
        sigmaNear: Math.max(2.5, options.spread * 0.14),
        strength: 0.16,
      });
    }
  }

  private ensureTopBarShadowAssetsForLayout(options: {
    topBarWidth: number;
    topBarHeight: number;
    topBarRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.topBarWidth,
      options.topBarHeight,
      options.topBarRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.topBarShadowLayoutKey !== layoutKey) {
      this.topBarShadowLayoutKey = layoutKey;
      this.topBarShadowSpriteFrame = this.createLayoutShellShadowSpriteFrame({
        shellWidth: options.topBarWidth,
        shellHeight: options.topBarHeight,
        spread: options.spread,
        radius: options.topBarRadius,
        sigmaFar: Math.max(5, options.spread * 0.32),
        sigmaNear: Math.max(2.5, options.spread * 0.14),
        strength: 0.16,
      });
    }
  }

  private ensureBottomDockShadowAssetsForLayout(options: {
    bottomDockWidth: number;
    bottomDockHeight: number;
    bottomDockRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.bottomDockWidth,
      options.bottomDockHeight,
      options.bottomDockRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.bottomDockShadowLayoutKey !== layoutKey) {
      this.bottomDockShadowLayoutKey = layoutKey;
      this.bottomDockShadowSpriteFrame = this.createLayoutShellShadowSpriteFrame({
        shellWidth: options.bottomDockWidth,
        shellHeight: options.bottomDockHeight,
        spread: options.spread,
        radius: options.bottomDockRadius,
        sigmaFar: Math.max(5, options.spread * 0.32),
        sigmaNear: Math.max(2.5, options.spread * 0.14),
        strength: 0.16,
      });
    }
  }

  private createRadialGlowMaterial(): Material | undefined {
    if (!this.radialGlowEffectAsset) {
      return undefined;
    }

    const material = new Material();
    material.initialize({
      effectAsset: this.radialGlowEffectAsset,
    });
    return material;
  }

  private createButtonGradientMaterial(options?: {
    shapeRect?: Vec4;
    topColor?: Color;
    bottomColor?: Color;
    glossColor?: Color;
    glossRange?: Vec4;
  }): Material | undefined {
    if (!this.buttonGradientEffectAsset) {
      return undefined;
    }

    const material = new Material();
    material.initialize({
      effectAsset: this.buttonGradientEffectAsset,
    });
    const topColor =
      options?.topColor ??
      new Color(
        Math.round(this.getArtTuningValue("topBarNavTopColorR")),
        Math.round(this.getArtTuningValue("topBarNavTopColorG")),
        Math.round(this.getArtTuningValue("topBarNavTopColorB")),
        255
      );
    const bottomColor =
      options?.bottomColor ??
      new Color(
        Math.round(this.getArtTuningValue("topBarNavBottomColorR")),
        Math.round(this.getArtTuningValue("topBarNavBottomColorG")),
        Math.round(this.getArtTuningValue("topBarNavBottomColorB")),
        255
      );
    const glossColor =
      options?.glossColor ??
      new Color(255, 249, 231, Math.round(this.getArtTuningValue("topBarNavMaterialGlossAlpha")));
    material.setProperty("shapeRect", options?.shapeRect ?? new Vec4(-60, -24, 120, 48));
    material.setProperty("topColor", topColor);
    material.setProperty("bottomColor", bottomColor);
    material.setProperty("glossColor", glossColor);
    material.setProperty("glossRange", options?.glossRange ?? new Vec4(0.66, 0.98, 0.15, 0));
    return material;
  }

  private resolveSpriteWorldRect(node: Node, width: number, height: number): Vec4 {
    node.updateWorldTransform();
    const world = node.worldPosition as Readonly<Vec3>;
    return new Vec4(world.x - width * 0.5, world.y - height * 0.5, width, height);
  }

  private getButtonGradientCarrierSpriteFrame(): SpriteFrame | null {
    return this.getWhiteSpriteFrame();
  }

	  private getWhiteSpriteFrame(): SpriteFrame | null {
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

	private createCloudSoftMaterial(options: {
	  width: number;
	  height: number;
	  circleA: Vec4;
	  circleB: Vec4;
	  feather: number;
	  color: Color;
	}): Material | undefined {
	  if (!this.cloudSoftEffectAsset) {
		return undefined;
	  }

	  const material = new Material();
	  material.initialize({
		effectAsset: this.cloudSoftEffectAsset,
	  });

	  material.setProperty("cloudColor", options.color);
	  material.setProperty("shapeSize", new Vec4(options.width, options.height, 0, 0));
	  material.setProperty("circleA", options.circleA);
	  material.setProperty("circleB", options.circleB);
	  material.setProperty("cloudParams", new Vec4(options.feather, 0, 0, 0));

	  return material;
	}

	private createCloudOutlineSpriteFrame(options: {
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
	}): SpriteFrame | null {
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
				const ellipseDistance = this.sampleEllipseDistance(
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

	  const texture = new Texture2D();
	  texture.image = new ImageAsset(canvas);

	  const spriteFrame = new SpriteFrame();
	  spriteFrame.texture = texture;
	  return spriteFrame;
	}

	private createSdfCloud(
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
	  // 用现成云图替换运行时拼形云。
	  // 这里把“位置”和“大小”彻底拆开：
	  // - x / y 只负责摆放
	  // - baseWidth * scale 只负责尺寸
	  // 这样后续调位置时，不会再连带改变云的大小。
	  if (!this.stageCloudSpriteFrame) {
		return;
	  }

	  const cloudAspect = 606 / 346;
	  const spriteWidth = Math.max(1, Math.round(options.baseWidth * options.scale));
	  const spriteHeight = Math.max(1, Math.round(spriteWidth / cloudAspect));

	  const shadow = RuntimeUI.createSpriteFrame(parent, {
		name: `${options.name}Shadow`,
		x: options.x,
		y: options.y - Math.round(spriteHeight * 0.02),
		width: Math.round(spriteWidth * 1.06),
		height: Math.round(spriteHeight * 1.08),
		spriteFrame: this.stageCloudSpriteFrame,
		color: new Color(255, 255, 255, 92),
	  });
	  shadow.node.setSiblingIndex(0);

	  const cloudGroup = new Node(options.name);
	  cloudGroup.setParent(parent);
	  cloudGroup.setPosition(options.x, options.y, 0);
	  const cloudGroupTransform = cloudGroup.getComponent(UITransform) ?? cloudGroup.addComponent(UITransform);
	  cloudGroupTransform.setContentSize(spriteWidth, spriteHeight);

	  // 外层淡云直接铺整张图。
	  // 它保留完整轮廓，但透明度更低，让云的边缘自然变淡。
	  RuntimeUI.createSpriteFrame(cloudGroup, {
		name: `${options.name}Outer`,
		x: 0,
		y: 0,
		width: spriteWidth,
		height: spriteHeight,
		spriteFrame: this.stageCloudSpriteFrame,
		color: new Color(options.color.r, options.color.g, options.color.b, 180),
	  });

	  // 内层用缩小一点的云图做蒙版，只保留更实的中心区域。
	  // 这样边缘不会整片都一样实，而是变成“外淡内实”的层次。
	  const innerMaskNode = new Node(`${options.name}InnerMask`);
	  innerMaskNode.setParent(cloudGroup);
	  innerMaskNode.setPosition(0, 0, 0);
	  const innerMaskWidth = Math.round(spriteWidth * 0.88);
	  const innerMaskHeight = Math.round(spriteHeight * 0.88);
	  const innerMaskTransform = innerMaskNode.getComponent(UITransform) ?? innerMaskNode.addComponent(UITransform);
	  innerMaskTransform.setContentSize(innerMaskWidth, innerMaskHeight);

	  const innerMask = innerMaskNode.addComponent(Mask);
	  innerMask.type = Mask.Type.GRAPHICS_STENCIL;
	  innerMask.inverted = false;
	  const innerMaskGraphics = this.getGraphicsMaskSubComp(innerMask);
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
		name: `${options.name}Inner`,
		x: 0,
		y: 0,
		width: spriteWidth,
		height: spriteHeight,
		spriteFrame: this.stageCloudSpriteFrame,
		color: new Color(options.color.r, options.color.g, options.color.b, 238),
	  });

	  if (options.flipX) {
		shadow.node.setScale(-1, 1, 1);
		cloudGroup.setScale(-1, 1, 1);
	  }
	}
  private createLayoutShellShadowSpriteFrame(options: {
    shellWidth: number;
    shellHeight: number;
    spread: number;
    radius: number;
    sigmaFar: number;
    sigmaNear: number;
    strength: number;
  }): SpriteFrame | null {
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
            const distance = this.sampleRoundedRectDistance(
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

    const texture = new Texture2D();
    texture.image = new ImageAsset(canvas);

    const spriteFrame = new SpriteFrame();
    spriteFrame.texture = texture;
    return spriteFrame;
  }

  private sampleRoundedRectDistance(
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

  private sampleEllipseDistance(
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

  private renderBackgroundDebugEntry(root: Node, layout: MainLayout): void {
    const right = layout.viewportWidth / 2 - 24;
    const top = layout.viewportHeight / 2 - 24;
    const entryX = right - DEBUG_ENTRY_SIZE / 2;
    const entryY = top - DEBUG_ENTRY_SIZE / 2;

    const { node, button } = RuntimeUI.createButton(root, {
      name: "DebugPanelEntry",
      text: "",
      x: entryX,
      y: entryY,
      width: DEBUG_ENTRY_SIZE,
      height: DEBUG_ENTRY_SIZE,
      color: this.showBackgroundDebugPanel
        ? new Color(220, 56, 45, 230)
        : new Color(220, 56, 45, 150),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 1,
      radius: DEBUG_ENTRY_SIZE / 2,
    });

    button.transition = Button.Transition.NONE;
    node.on(
      Button.EventType.CLICK,
      () => {
        this.showBackgroundDebugPanel = !this.showBackgroundDebugPanel;
        this.render();
      },
      this
    );

    if (this.showBackgroundDebugPanel) {
      this.renderBackgroundDebugPanel(root, right, entryY - DEBUG_ENTRY_SIZE / 2 - DEBUG_TOGGLE_GAP);
    }
  }

  private renderBackgroundDebugPanel(root: Node, right: number, top: number): void {
    const panelX = right - DEBUG_PANEL_WIDTH / 2;
    const panelY = top - DEBUG_PANEL_HEIGHT / 2;

    RuntimeUI.createBox(root, {
      name: "DebugPanelShadow",
      x: panelX + 4,
      y: panelY - 5,
      width: DEBUG_PANEL_WIDTH,
      height: DEBUG_PANEL_HEIGHT,
      color: new Color(103, 67, 42, 45),
      radius: 20,
    });

    const panel = RuntimeUI.createBox(root, {
      name: "DebugPanel",
      x: panelX,
      y: panelY,
      width: DEBUG_PANEL_WIDTH,
      height: DEBUG_PANEL_HEIGHT,
      color: new Color(255, 247, 237, 238),
      radius: 20,
    });

    RuntimeUI.createBox(panel, {
      name: "DebugPanelInner",
      x: 0,
      y: 0,
      width: DEBUG_PANEL_WIDTH - 4,
      height: DEBUG_PANEL_HEIGHT - 4,
      color: new Color(255, 255, 255, 60),
      radius: 18,
    });

    RuntimeUI.createLabel(panel, {
      name: "DebugPanelTitle",
      text: "测试面板",
      x: 0,
      y: DEBUG_PANEL_HEIGHT / 2 - 28,
      width: DEBUG_PANEL_WIDTH - 28,
      height: 28,
      fontSize: 17,
      color: new Color(94, 61, 39, 255),
    });

    RuntimeUI.createLabel(panel, {
      name: "DebugPanelSubtitle",
      text: "背景开关 / 结构层开关 / shader 调试 / 参考页 / 美术调参",
      x: 0,
      y: DEBUG_PANEL_HEIGHT / 2 - 50,
      width: DEBUG_PANEL_WIDTH - 30,
      height: 18,
      fontSize: 11,
      color: new Color(147, 113, 88, 220),
    });

    const startY = DEBUG_PANEL_HEIGHT / 2 - 84;

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleGradient",
      `渐变底色 ${this.showBackgroundGradient ? "ON" : "OFF"}`,
      0,
      startY,
      this.showBackgroundGradient,
      () => {
        this.showBackgroundGradient = !this.showBackgroundGradient;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleGlowTopLeft",
      `左上柔光 ${this.showBackgroundGlowTopLeft ? "ON" : "OFF"}`,
      0,
      startY - DEBUG_TOGGLE_HEIGHT - DEBUG_TOGGLE_GAP,
      this.showBackgroundGlowTopLeft,
      () => {
        this.showBackgroundGlowTopLeft = !this.showBackgroundGlowTopLeft;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleGlowBottomRight",
      `右下柔光 ${this.showBackgroundGlowBottomRight ? "ON" : "OFF"}`,
      0,
      startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 2,
      this.showBackgroundGlowBottomRight,
      () => {
        this.showBackgroundGlowBottomRight = !this.showBackgroundGlowBottomRight;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleShellLayer",
      `壳层 ${this.showShellLayer ? "ON" : "OFF"}`,
      0,
      startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 3,
      this.showShellLayer,
      () => {
        this.showShellLayer = !this.showShellLayer;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleShellFrameLayer",
      `ShellFrame ${this.showShellFrameLayer ? "ON" : "OFF"}`,
      0,
      startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 4,
      this.showShellFrameLayer,
      () => {
        this.showShellFrameLayer = !this.showShellFrameLayer;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleMainViewportLayer",
      `主视口 ${this.showMainViewportLayer ? "ON" : "OFF"}`,
      0,
      startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 5,
      this.showMainViewportLayer,
      () => {
        this.showMainViewportLayer = !this.showMainViewportLayer;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleShaderDebugBlock",
      `Shader测试块 ${this.showShaderDebugBlock ? "ON" : "OFF"}`,
      0,
      startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 6,
      this.showShaderDebugBlock,
      () => {
        this.showShaderDebugBlock = !this.showShaderDebugBlock;
        this.render();
      }
    );

    const { node, button } = RuntimeUI.createButton(panel, {
      name: "DebugOpenReferencePage",
      text: "参考页面",
      x: 0,
      y: startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 7,
      width: DEBUG_TOGGLE_WIDTH,
      height: DEBUG_TOGGLE_HEIGHT,
      color: new Color(94, 61, 39, 172),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 15,
      radius: 17,
    });

    button.transition = Button.Transition.NONE;
    node.on(Button.EventType.CLICK, this.openReferencePage, this);

    const artDebugButton = RuntimeUI.createButton(panel, {
      name: "DebugOpenArtTuningPage",
      text: "美术调参页",
      x: 0,
      y: startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 8,
      width: DEBUG_TOGGLE_WIDTH,
      height: DEBUG_TOGGLE_HEIGHT,
      color: new Color(247, 155, 52, 214),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 15,
      radius: 17,
    });

    artDebugButton.button.transition = Button.Transition.NONE;
    artDebugButton.node.on(Button.EventType.CLICK, this.openArtDebugPage, this);
  }

  private renderBackgroundDebugToggles(root: Node, layout: MainLayout): void {
    const right = layout.viewportWidth / 2 - 24;
    const top = layout.viewportHeight / 2 - 24;
    const startY = top - DEBUG_TOGGLE_HEIGHT / 2;
    const centerX = right - DEBUG_TOGGLE_WIDTH / 2;

    this.renderBackgroundDebugToggle(
      root,
      "DebugToggleGradient",
      `渐变底色 ${this.showBackgroundGradient ? "ON" : "OFF"}`,
      centerX,
      startY,
      this.showBackgroundGradient,
      () => {
        this.showBackgroundGradient = !this.showBackgroundGradient;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      root,
      "DebugToggleGlowTopLeft",
      `左上柔光 ${this.showBackgroundGlowTopLeft ? "ON" : "OFF"}`,
      centerX,
      startY - DEBUG_TOGGLE_HEIGHT - DEBUG_TOGGLE_GAP,
      this.showBackgroundGlowTopLeft,
      () => {
        this.showBackgroundGlowTopLeft = !this.showBackgroundGlowTopLeft;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      root,
      "DebugToggleGlowBottomRight",
      `右下柔光 ${this.showBackgroundGlowBottomRight ? "ON" : "OFF"}`,
      centerX,
      startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 2,
      this.showBackgroundGlowBottomRight,
      () => {
        this.showBackgroundGlowBottomRight = !this.showBackgroundGlowBottomRight;
        this.render();
      }
    );
  }

  private renderBackgroundDebugToggle(
    root: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    enabled: boolean,
    onClick: () => void
  ): void {
    const { node, button } = RuntimeUI.createButton(root, {
      name,
      text,
      x,
      y,
      width: DEBUG_TOGGLE_WIDTH,
      height: DEBUG_TOGGLE_HEIGHT,
      color: enabled ? new Color(247, 155, 52, 235) : new Color(110, 74, 51, 150),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 15,
      radius: 17,
    });

    button.transition = Button.Transition.NONE;
    node.on(Button.EventType.CLICK, onClick, this);
  }

  private renderShell(root: Node, layout: MainLayout): Node {
    const shellWidth = Math.round(layout.shellWidth);
    const shellHeight = Math.round(layout.shellHeight);

    // 壳层本体的缩放跟随视口变化，但会被限制在一个较窄的范围里，
    // 避免它在特别窄或特别宽的屏幕上突然变得太小或太满。
    const shellScale = Math.max(0.72, Math.min(1.16, shellWidth / APP_SHELL_REFERENCE_WIDTH));
    const shellRadius = Math.round(APP_SHELL_RADIUS * shellScale);
    const borderWidth = 2; //边框宽度，shell，mainstage的内外边框都共享这个宽度
    const shellInnerRadius = Math.max(0, shellRadius - borderWidth);
    const shellInnerWidth = Math.max(0, shellWidth - borderWidth * 2);
    const shellInnerHeight = Math.max(0, shellHeight - borderWidth * 2);
    const shadowBase = Math.min(shellWidth, shellHeight);
    const shadowSpread = Math.max(18, Math.round(shadowBase * 0.036));

    const shellContentHost = new Node("AppShellContentHost");
    shellContentHost.setParent(root);
    shellContentHost.setPosition(0, 0, 0);
    const shellContentTransform = shellContentHost.getComponent(UITransform) ?? shellContentHost.addComponent(UITransform);
    shellContentTransform.setContentSize(shellInnerWidth, shellInnerHeight);

    // 先准备整块壳层的阴影贴图。
    // 这一步的目的不是做复杂特效，而是让壳层看起来像“浮在背景上”，
    // 而不是死贴在页面底部。
    this.ensureShellShadowAssetsForLayout({
      shellWidth,
      shellHeight,
      shellRadius,
      spread: shadowSpread,
    });

    if (this.showShellLayer) {
      if (this.shellShadowSpriteFrame) {
        RuntimeUI.createSpriteFrame(root, {
          name: "AppShellShadow",
          x: 0,
          y: 0,
          width: shellWidth + shadowSpread * 2,
          height: shellHeight + shadowSpread * 2,
          spriteFrame: this.shellShadowSpriteFrame,
          color: new Color(SHELL_SHADOW_COLOR.r, SHELL_SHADOW_COLOR.g, SHELL_SHADOW_COLOR.b, 75),
        });
      } else {
        RuntimeUI.createBox(root, {
          name: "AppShellShadowFallback",
          x: 0,
          y: 0,
          width: shellWidth + Math.round(10 * shellScale),
          height: shellHeight + Math.round(10 * shellScale),
          color: new Color(187, 129, 62, 10),
          radius: shellRadius,
        });
      }

      RuntimeUI.createBox(root, {
        name: "AppShellBorder",
        x: 0,
        y: 0,
        width: shellWidth,
        height: shellHeight,
        color: new Color(234, 207, 180, 255),
        radius: shellRadius,
      });

      const shellSurface = RuntimeUI.createBox(root, {
        name: "AppShellSurface",
        x: 0,
        y: 0,
        width: shellInnerWidth,
        height: shellInnerHeight,
        color: new Color(251, 242, 232, 255),
        radius: shellInnerRadius,
      });

      if (this.backgroundGradientSpriteFrame) {
        const gradientMask = new Node("AppShellGradientMask");
        gradientMask.setParent(shellSurface);
        const gradientMaskTransform = gradientMask.addComponent(UITransform);
        gradientMaskTransform.setContentSize(shellInnerWidth, shellInnerHeight);
        const gradientMaskComponent = gradientMask.addComponent(Mask);
        gradientMaskComponent.type = Mask.Type.GRAPHICS_STENCIL;
        gradientMaskComponent.inverted = false;
        const maskGraphics = this.getGraphicsMaskSubComp(gradientMaskComponent);
        if (maskGraphics) {
          maskGraphics.clear();
          maskGraphics.fillColor = Color.WHITE;
          maskGraphics.roundRect(
            -shellInnerWidth / 2,
            -shellInnerHeight / 2,
            shellInnerWidth,
            shellInnerHeight,
            shellInnerRadius
          );
          maskGraphics.fill();

          RuntimeUI.createSpriteFrame(gradientMask, {
            name: "AppShellSurfaceGradient",
            x: 0,
            y: 0,
            width: shellInnerHeight + SHELL_SURFACE_GRADIENT_OVERSCAN * 2,
            height: shellInnerWidth + SHELL_SURFACE_GRADIENT_OVERSCAN * 2,
            spriteFrame: this.backgroundGradientSpriteFrame,
            rotation: -90,
            color: new Color(255, 255, 255, 110),
          });
        }
      }
    }

    shellContentHost.setSiblingIndex(root.children.length - 1);

    // 主舞台层在壳层内部生成，但骨架内容是否显示是单独控制的。
    // 当前这一步只负责把“承载结构”搭出来，不把舞台骨架塞满。
    this.renderMainStageLayer(shellContentHost, shellWidth, shellHeight, borderWidth);
    return shellContentHost;
  }

  private renderMainStageLayer(shell: Node, shellWidth: number, shellHeight: number, shellBorderWidth: number): void {
    // 主舞台层的尺寸关系是：壳层 -> ShellFrame -> MainViewport -> MainStage。
    // 这四层不是重复绘制，而是每一层负责不同的视觉职责：
    // - ShellFrame：主内容的内边界
    // - MainViewport：内部可视窗口
    // - MainStage：真正的主舞台底板
    // - MainStageShadow：舞台的轻微体积感
    // 尺寸计算顺序：
    // 1. 先从壳层扣出最外侧留白
    // 2. 再从 ShellFrame 扣出主视口留白
    // 3. 最后从主视口扣出 MainStage 留白
    // 这样可以保证每一层都保留独立的呼吸空间，后续美术调参也更直观。
    const appShellPadding = Math.round(this.getArtTuningValue("appShellPadding"));
    const shellFramePadding = Math.round(this.getArtTuningValue("shellFramePadding"));
    const mainViewportRadius = Math.round(this.getArtTuningValue("mainViewportRadius"));
    const mainViewportAlpha = Math.round(this.getArtTuningValue("mainViewportAlpha"));
    const shellFrameWidth = Math.max(0, shellWidth - appShellPadding * 2);
    const shellFrameHeight = Math.max(0, shellHeight - appShellPadding * 2);
    const baseViewportWidth = Math.max(0, shellFrameWidth - shellFramePadding * 2);
    const baseViewportHeight = Math.max(0, shellFrameHeight - shellFramePadding * 2);
    const viewportWidth = Math.max(
      0,
      Math.round(baseViewportWidth * this.getArtTuningValue("mainViewportWidthScale"))
    );
    const viewportHeight = Math.max(
      0,
      Math.round(baseViewportHeight * this.getArtTuningValue("mainViewportHeightScale"))
    );
    const viewportOffsetUnitX = shellFrameWidth * 0.5;
    const viewportOffsetUnitY = shellFrameHeight * 0.5;
    const viewportX = Math.round(this.getArtTuningValue("mainViewportOffsetXRatio") * viewportOffsetUnitX);
    const viewportY = Math.round(this.getArtTuningValue("mainViewportOffsetYRatio") * viewportOffsetUnitY);
    const stageWidth = viewportWidth;
    const stageHeight = viewportHeight;

    // ShellFrame 是主舞台的第一道内框。
    // 这里要的是“描边空心”的框感，不是一个有实底的卡片。
    // 如果以后要调主舞台在壳层里的呼吸感，优先动这里的边距、圆角和描边粗细。
    const shellFrameContainer = this.showShellFrameLayer
      ? RuntimeUI.createCard(shell, {
          name: "ShellFrame",
          x: 0,
          y: 0,
          width: shellFrameWidth,
          height: shellFrameHeight,
          style: "shell",
          borderColor: new Color(255, 255, 255, 186),
          radius: mainViewportRadius + 2,
          lineWidth: 4,
        })
      : shell;

    // 美术可调参数清单（ShellFrame / MainViewport / MainStage）
    // - ShellFrame.radius / innerRadius：第一层内框的厚薄感
    // - MainViewport.radius / innerRadius：主视口的柔和程度
    // - MainStage.radius / innerRadius：主舞台底板的圆角和边缘厚度
    // - MainStageShadow.color.a：舞台阴影的轻重
    // - MainStageShadow.y：阴影上下偏移，影响“浮起感”
    // - MainStageShadow.width / height：阴影覆盖范围，影响体积感和柔边范围
    // 这些值改动后，最容易影响设计感知，适合美术和程序一起对调。
    // MainViewport 是主视口容器，负责控制可视范围和内部留白。
    // 它的存在让主舞台不会直接贴着 ShellFrame 边缘，层次更像参考页。
    const viewportShadowBase = Math.min(viewportWidth, viewportHeight);
    const viewportShadowSpread = Math.max(
      14,
      Math.round(viewportShadowBase * this.getArtTuningValue("mainViewportShadowSpreadRatio"))
    );
    const viewportShadowAlpha = Math.round(this.getArtTuningValue("mainViewportShadowAlpha"));
    if (this.showMainViewportLayer) {
      this.ensureMainViewportShadowAssetsForLayout({
        viewportWidth,
        viewportHeight,
        viewportRadius: mainViewportRadius,
        spread: viewportShadowSpread,
      });

      if (this.mainViewportShadowSpriteFrame) {
        RuntimeUI.createSpriteFrame(shellFrameContainer, {
          name: "MainViewportShadow",
          x: viewportX,
          y: viewportY,
          width: viewportWidth + viewportShadowSpread * 2,
          height: viewportHeight + viewportShadowSpread * 2,
          spriteFrame: this.mainViewportShadowSpriteFrame,
          color: new Color(SHELL_SHADOW_COLOR.r, SHELL_SHADOW_COLOR.g, SHELL_SHADOW_COLOR.b, viewportShadowAlpha),
        });
      } else {
        RuntimeUI.createBox(shellFrameContainer, {
          name: "MainViewportShadowFallback",
          x: viewportX,
          y: viewportY,
          width: viewportWidth + Math.round(viewportShadowSpread * 0.8),
          height: viewportHeight + Math.round(viewportShadowSpread * 0.8),
          color: new Color(187, 129, 62, Math.max(0, Math.round(viewportShadowAlpha * 0.18))),
          radius: mainViewportRadius,
        });
      }
    }

    const viewportContainer = this.showMainViewportLayer
      ? RuntimeUI.createCard(shellFrameContainer, {
          name: "MainViewport",
          x: viewportX,
          y: viewportY,
          width: viewportWidth,
          height: viewportHeight,
          color: new Color(235, 207, 180, mainViewportAlpha),
          innerColor: new Color(255, 246, 237, Math.max(0, Math.round(mainViewportAlpha * 0.96))),
          radius: mainViewportRadius,
          borderThickness: 2,
          innerRadius: Math.max(0, mainViewportRadius - 2),
        })
      : shellFrameContainer;

    // 主舞台不再单独套一层 MainStage 卡片。
    // 这一版直接让舞台内容贴着 MainViewport 的内边界展开，
    // 这样可以把可用舞台区放大，同时去掉中间那道额外结构线。
	this.renderStageBase(viewportContainer, stageWidth, stageHeight, {
      borderThickness: 2,
      radius: mainViewportRadius,
    });
	

    // 这一层是主舞台的氛围底光。
    // 它不承载内容，只负责把舞台从主视口里“托”出来一点，避免画面太平。
    // 参考页里这一层对应的是 AmbientLayer / AmbientGlow 的感觉。
    // 这两个 glow 不是装饰纹理，而是“柔光空气层”：
    // - TopGlow：偏上方的白色高光，负责提亮舞台中心上缘
    // - BottomGlow：偏下方的暖色回光，负责把舞台底部托住
    // 调参时优先看三个维度：
    // - width / height：决定光晕铺开的范围，越大越“散”
    // - y：决定光晕往上还是往下偏，影响层次重心
    // - color.a：决定气氛轻重，越高越明显，越低越克制
    const ambientTopGlow = RuntimeUI.createRadialGlow(viewportContainer, {
      name: "MainStageAmbientTopGlow",
      x: 0,
      y: Math.round(stageHeight * 0.08),
      width: Math.max(0, Math.round(stageWidth * 0.96)),
      height: Math.max(0, Math.round(stageHeight * 0.62)),
      color: new Color(255, 255, 255, 30),
      steps: 7,
    });
    ambientTopGlow.setSiblingIndex(0);

    // 下方暖光更接近“托底”的感觉。
    // 它比上方白光更低、更宽、更淡，主要是让主舞台和底层背景之间有一层柔和过渡。
    const ambientBottomGlow = RuntimeUI.createRadialGlow(viewportContainer, {
      name: "MainStageAmbientBottomGlow",
      x: 0,
      y: -Math.round(stageHeight * 0.12),
      width: Math.max(0, Math.round(stageWidth * 1.02)),
      height: Math.max(0, Math.round(stageHeight * 0.74)),
      color: new Color(247, 216, 162, 18),
      steps: 7,
    });
    ambientBottomGlow.setSiblingIndex(0);

    this.renderPrimaryLayoutHosts(viewportContainer, viewportWidth, viewportHeight, stageWidth, stageHeight);
  }

  private renderPrimaryLayoutHosts(
    viewport: Node,
    viewportWidth: number,
    viewportHeight: number,
    stageWidth: number,
    stageHeight: number
  ): void {
    const hostLayer = new Node("PrimaryLayoutHostLayer");
    hostLayer.setParent(viewport);
    const hostLayerTransform = hostLayer.getComponent(UITransform) ?? hostLayer.addComponent(UITransform);
    hostLayerTransform.setContentSize(viewportWidth, viewportHeight);

    const edgeInset = Math.max(12, Math.round(Math.min(viewportWidth, viewportHeight) * 0.018));
    const hostGap = Math.max(8, Math.round(viewportWidth * 0.01));
    const baseTopBarWidth = Math.max(360, viewportWidth - edgeInset * 2);
    const baseTopBarHeight = Math.max(
      72,
      Math.min(104, Math.round(viewportHeight * this.getArtTuningValue("topBarHeightRatio")))
    );
    const topBarWidth = Math.max(180, Math.round(baseTopBarWidth * this.getArtTuningValue("topBarWidthScale")));
    const topBarHeight = Math.max(42, Math.round(baseTopBarHeight * this.getArtTuningValue("topBarHeightScale")));
    const baseBottomDockWidth = Math.max(420, viewportWidth - edgeInset * 2);
    const baseBottomDockHeight = Math.max(
      112,
      Math.min(136, Math.round(viewportHeight * this.getArtTuningValue("bottomDockHeightRatio")))
    );
    const bottomDockWidth = Math.max(
      220,
      Math.round(baseBottomDockWidth * this.getArtTuningValue("bottomDockWidthScale"))
    );
    const bottomDockHeight = Math.max(
      64,
      Math.round(baseBottomDockHeight * this.getArtTuningValue("bottomDockHeightScale"))
    );
    const mainAreaTop = viewportHeight / 2 - edgeInset - topBarHeight - hostGap * 0.6;
    const mainAreaBottom = -viewportHeight / 2 + edgeInset + bottomDockHeight + hostGap * 0.7;
    const mainAreaHeight = Math.max(220, mainAreaTop - mainAreaBottom);
    const baseSideHostHeight = Math.max(300, Math.min(496, Math.round(mainAreaHeight * 0.965)));
    const baseSideHostWidth = Math.max(
      198,
      Math.min(300, Math.round((viewportWidth - edgeInset * 2 - hostGap * 2) * 0.275))
    );
    const leftCardWidth = Math.max(120, Math.round(baseSideHostWidth * this.getArtTuningValue("leftCardWidthScale")));
    const leftCardHeight = Math.max(
      120,
      Math.round(baseSideHostHeight * this.getArtTuningValue("leftCardHeightScale"))
    );
    const rightCardWidth = Math.max(120, Math.round(baseSideHostWidth * this.getArtTuningValue("rightCardWidthScale")));
    const rightCardHeight = Math.max(
      120,
      Math.round(baseSideHostHeight * this.getArtTuningValue("rightCardHeightScale"))
    );
    const baseSideHostY = Math.round((mainAreaTop + mainAreaBottom) / 2 + viewportHeight * 0.008);
    const offsetUnitX = viewportWidth * 0.5;
    const offsetUnitY = viewportHeight * 0.5;
    const topBarX = Math.round(this.getArtTuningValue("topBarOffsetXRatio") * offsetUnitX);
    const topBarY =
      viewportHeight / 2 -
      edgeInset -
      topBarHeight / 2 +
      this.getArtTuningValue("topBarOffsetYRatio") * offsetUnitY;
    const leftCardX =
      -viewportWidth / 2 +
      edgeInset +
      leftCardWidth / 2 +
      this.getArtTuningValue("leftCardOffsetXRatio") * offsetUnitX;
    const leftCardY = baseSideHostY + this.getArtTuningValue("leftCardOffsetYRatio") * offsetUnitY;
    const rightCardX =
      viewportWidth / 2 -
      edgeInset -
      rightCardWidth / 2 +
      this.getArtTuningValue("rightCardOffsetXRatio") * offsetUnitX;
    const rightCardY = baseSideHostY + this.getArtTuningValue("rightCardOffsetYRatio") * offsetUnitY;
    const bottomDockX = Math.round(this.getArtTuningValue("bottomDockOffsetXRatio") * offsetUnitX);
    const bottomDockY =
      -viewportHeight / 2 +
      edgeInset +
      bottomDockHeight / 2 +
      this.getArtTuningValue("bottomDockOffsetYRatio") * offsetUnitY;

    this.renderLayoutHostGuide(hostLayer, {
      name: "LeftCardHost",
      x: leftCardX,
      y: leftCardY,
      width: leftCardWidth,
      height: leftCardHeight,
      radius: 24,
      label: "LEFT CARD HOST",
    });

    this.renderTopBarStructure(hostLayer, {
      x: topBarX,
      y: topBarY,
      width: topBarWidth,
      height: topBarHeight,
    });

    this.renderLayoutHostGuide(hostLayer, {
      name: "RightCardHost",
      x: rightCardX,
      y: rightCardY,
      width: rightCardWidth,
      height: rightCardHeight,
      radius: 24,
      label: "RIGHT CARD HOST",
    });

    this.renderBottomDockStructure(hostLayer, {
      x: bottomDockX,
      y: bottomDockY,
      width: bottomDockWidth,
      height: bottomDockHeight,
    });
  }

  private ensureButtonGradientEffectLoaded(): void {
    if (this.buttonGradientEffectAsset || this.buttonGradientEffectLoadRequested) {
      return;
    }

    this.buttonGradientEffectLoadRequested = true;
    resources.load(BUTTON_GRADIENT_EFFECT_PATH, EffectAsset, (error, effectAsset) => {
      if (error || !effectAsset) {
        console.warn("[MainController] failed to load button gradient effect", error);
        this.buttonGradientEffectLoadRequested = false;
        return;
      }

      this.buttonGradientEffectAsset = effectAsset;
      this.render();
    });
  }

  private renderTopBarStructure(
    parent: Node,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    const radius = Math.round(options.height * 0.38);
    const topBarShellAlpha = Math.round(this.getArtTuningValue("topBarShellAlpha"));
    const topBarInnerAlpha = Math.round(this.getArtTuningValue("topBarInnerAlpha"));
    const topBarBorderWidth = Math.max(0, this.getArtTuningValue("topBarBorderWidth"));
    const topBarBorderAlpha = Math.round(this.getArtTuningValue("topBarBorderAlpha"));
    const topBarBorderOutset = topBarBorderAlpha > 0 ? topBarBorderWidth : 0;
    const topBarVisualWidth = Math.round(options.width + topBarBorderOutset * 2);
    const topBarVisualHeight = Math.round(options.height + topBarBorderOutset * 2);
    const topBarVisualRadius = Math.round(radius + topBarBorderOutset);
    const topBarShadowAlpha = Math.round(this.getArtTuningValue("topBarShadowAlpha"));
    const topBarShadowSpread = Math.max(
      10,
      Math.round(Math.min(options.width, options.height) * this.getArtTuningValue("topBarShadowSpreadRatio"))
    );
    const brandMarkHeightRatio = this.getArtTuningValue("topBarBrandMarkHeightRatio");
    const brandTextGap = Math.round(this.getArtTuningValue("topBarBrandTextGap"));
    const brandTitleY = Math.round(this.getArtTuningValue("topBarBrandTitleY"));
    const brandTitleFontScale = this.getArtTuningValue("topBarBrandTitleFontScale");
    const brandSubtitleY = Math.round(this.getArtTuningValue("topBarBrandSubtitleY"));
    const brandSubtitleFontScale = this.getArtTuningValue("topBarBrandSubtitleFontScale");
    const navWidthRatio = this.getArtTuningValue("topBarNavWidthRatio");
    const statusWidthRatio = this.getArtTuningValue("topBarStatusWidthRatio");

    this.ensureTopBarShadowAssetsForLayout({
      topBarWidth: topBarVisualWidth,
      topBarHeight: topBarVisualHeight,
      topBarRadius: topBarVisualRadius,
      spread: topBarShadowSpread,
    });

    if (this.topBarShadowSpriteFrame) {
      RuntimeUI.createSpriteFrame(parent, {
        name: "TopBarShadow",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: topBarVisualWidth + topBarShadowSpread * 2,
        height: topBarVisualHeight + topBarShadowSpread * 2,
        spriteFrame: this.topBarShadowSpriteFrame,
        color: new Color(
          SHELL_SHADOW_COLOR.r,
          SHELL_SHADOW_COLOR.g,
          SHELL_SHADOW_COLOR.b,
          topBarShadowAlpha
        ),
      });
    } else {
      RuntimeUI.createBox(parent, {
        name: "TopBarShadowFallback",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: topBarVisualWidth + Math.round(topBarShadowSpread * 0.8),
        height: topBarVisualHeight + Math.round(topBarShadowSpread * 0.8),
        color: new Color(187, 129, 62, Math.max(0, Math.round(topBarShadowAlpha * 0.18))),
        radius: topBarVisualRadius,
      });
    }

    if (topBarBorderOutset > 0) {
      RuntimeUI.createCard(parent, {
        name: "TopBarOuterBorder",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: topBarVisualWidth,
        height: topBarVisualHeight,
        style: "shell",
        borderColor: new Color(235, 207, 180, topBarBorderAlpha),
        radius: topBarVisualRadius,
        lineWidth: topBarBorderOutset * 2,
      });
    }

    const topBar = RuntimeUI.createCard(parent, {
      name: "TopBarShell",
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, topBarShellAlpha),
      innerColor: new Color(255, 253, 249, topBarInnerAlpha),
      radius,
      borderThickness: 0,
      innerRadius: radius,
    });

    const brandMarkSize = Math.max(50, Math.min(56, Math.round(options.height * brandMarkHeightRatio)));
    const brandInsetX = Math.max(16, Math.round(options.width * 0.018));
    const brandMarkX = -options.width / 2 + brandInsetX + brandMarkSize / 2;
    const brandMarkY = 2;
    const brandMarkRadius = Math.round(brandMarkSize * 0.32);
    const brandMark = RuntimeUI.createRoundedClip(topBar, {
      name: "TopBarBrandMark",
      x: Math.round(brandMarkX),
      y: brandMarkY,
      width: brandMarkSize,
      height: brandMarkSize,
      radius: brandMarkRadius,
    });
    const brandMarkGradientFrame = this.getButtonGradientCarrierSpriteFrame();
    if (brandMarkGradientFrame) {
      const brandMarkSprite = RuntimeUI.createSpriteFrame(brandMark, {
        name: "TopBarBrandMarkGradient",
        x: 0,
        y: 0,
        width: brandMarkSize,
        height: brandMarkSize,
        spriteFrame: brandMarkGradientFrame,
      });
      const brandMarkGradientMaterial = this.createButtonGradientMaterial({
        shapeRect: this.resolveSpriteWorldRect(brandMarkSprite.node, brandMarkSize, brandMarkSize),
      });
      if (brandMarkGradientMaterial) {
        brandMarkSprite.sprite.customMaterial = brandMarkGradientMaterial;
        brandMarkSprite.sprite.setMaterial(brandMarkGradientMaterial, 0);
      }
    } else {
      RuntimeUI.createBox(brandMark, {
        name: "TopBarBrandMarkFallback",
        x: 0,
        y: 0,
        width: brandMarkSize,
        height: brandMarkSize,
        color: new Color(245, 160, 72, 255),
        radius: brandMarkRadius,
      });
    }
    RuntimeUI.createCard(topBar, {
      name: "TopBarBrandMarkOutline",
      x: Math.round(brandMarkX),
      y: brandMarkY,
      width: brandMarkSize,
      height: brandMarkSize,
      style: "shell",
      borderColor: new Color(239, 132, 61, 224),
      radius: brandMarkRadius,
      lineWidth: 2,
    });
    brandMark.setSiblingIndex(2);
    RuntimeUI.createLabel(brandMark, {
      name: "TopBarBrandMarkText",
      text: "🐹",
      x: 0,
      y: 0,
      width: brandMarkSize - 8,
      height: brandMarkSize - 8,
      fontSize: Math.max(21, Math.round(brandMarkSize * 0.42)),
      color: new Color(255, 255, 255, 255),
    });
    const brandGlossWidth = Math.round(brandMarkSize * this.getArtTuningValue("topBarBrandGlossWidthRatio"));
    const brandGlossHeight = Math.max(8, Math.round(brandMarkSize * this.getArtTuningValue("topBarBrandGlossHeightRatio")));
    const brandGlossY = Math.round(brandMarkSize * this.getArtTuningValue("topBarBrandGlossOffsetYRatio"));
    const brandGlossAlpha = this.getArtTuningValue("topBarBrandGlossAlpha");
    RuntimeUI.createBox(brandMark, {
      name: "TopBarBrandMarkGlossOverlay",
      x: 0,
      y: brandGlossY,
      width: brandGlossWidth,
      height: brandGlossHeight,
      color: new Color(255, 252, 241, brandGlossAlpha),
      radius: Math.round(brandMarkSize * 0.18),
    });

    const brandTextWidth = Math.max(236, Math.round(options.width * 0.27));
    const brandTextLeft = brandMarkX + brandMarkSize / 2 + Math.max(brandTextGap, Math.round(options.width * 0.008));
    const brandTextX = brandTextLeft + brandTextWidth / 2;
    RuntimeUI.createLabel(topBar, {
      name: "TopBarBrandTitle",
      text: "学伴精灵",
      x: Math.round(brandTextX),
      y: brandTitleY,
      width: brandTextWidth,
      height: 32,
      fontSize: Math.max(24, Math.min(31, Math.round(options.height * (brandTitleFontScale + 0.02)))),
      color: new Color(98, 66, 46, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createLabel(topBar, {
      name: "TopBarBrandSubtitle",
      text: "你的专属萌宠精灵",
      x: Math.round(brandTextX),
      y: brandSubtitleY,
      width: brandTextWidth,
      height: 18,
      fontSize: Math.max(11, Math.min(13, Math.round(options.height * Math.max(0.1, brandSubtitleFontScale - 0.01)))),
      color: new Color(156, 123, 99, 162),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    const navWidth = Math.max(330, Math.min(394, Math.round(options.width * navWidthRatio)));
    const navHeight = Math.max(50, Math.min(60, Math.round(options.height * 0.6)));
    const navX = Math.round(options.width * 0.14);
    const navBorderColor = new Color(235, 207, 180, 255);
    const navWrap = RuntimeUI.createCard(topBar, {
      name: "TopBarNavWrap",
      x: navX,
      y: 0,
      width: navWidth,
      height: navHeight,
      color: new Color(255, 255, 255, 136),
      innerColor: new Color(255, 255, 255, 196),
      borderColor: navBorderColor,
      radius: Math.round(navHeight / 2),
      borderThickness: 2,
      innerRadius: Math.round(navHeight / 2) - 2,
    });
    RuntimeUI.createCard(navWrap, {
      name: "TopBarNavWrapOutline",
      x: 0,
      y: 0,
      width: navWidth,
      height: navHeight,
      style: "shell",
      borderColor: navBorderColor,
      radius: Math.round(navHeight / 2),
      lineWidth: 2,
    });

    const navItems: Array<{
      key: TopBarNavTab;
      name: string;
      text: string;
      icon: string;
    }> = [
      { key: "petHome", name: "PetHome", text: "宠物主页", icon: "" },
      { key: "bag", name: "Bag", text: "背包", icon: "" },
      { key: "journal", name: "Journal", text: "日记", icon: "" },
    ];
    const navGap = 10;
    const navItemWidth = Math.round((navWidth - 20 - navGap * 2) / 3);
    const navItemHeight = navHeight - 14;
    navItems.forEach((item, index) => {
      const itemX = -navWidth / 2 + 10 + navItemWidth / 2 + index * (navItemWidth + navGap);
      const isActive = this.activeTopBarNavTab === item.key;
      if (!isActive) {
        RuntimeUI.createBox(navWrap, {
          name: `TopBarNav${item.name}Idle`,
          x: Math.round(itemX),
          y: 0,
          width: navItemWidth,
          height: navItemHeight,
          color: new Color(255, 250, 243, 82),
          radius: Math.round(navItemHeight / 2),
        });
      }
      if (isActive) {
        const activeNav = RuntimeUI.createRoundedClip(navWrap, {
          name: `TopBarNav${item.name}Active`,
          x: Math.round(itemX),
          y: 0,
          width: navItemWidth,
          height: navItemHeight,
          radius: Math.round(navItemHeight / 2),
        });
        const gradientCarrierFrame = this.getButtonGradientCarrierSpriteFrame();
        if (gradientCarrierFrame) {
          const activeNavSprite = RuntimeUI.createSpriteFrame(activeNav, {
            name: `TopBarNav${item.name}ActiveGradient`,
            x: 0,
            y: 0,
            width: navItemWidth,
            height: navItemHeight,
            spriteFrame: gradientCarrierFrame,
          });
          const activeNavGradientMaterial = this.createButtonGradientMaterial({
            shapeRect: this.resolveSpriteWorldRect(activeNavSprite.node, navItemWidth, navItemHeight),
          });
          if (activeNavGradientMaterial) {
            activeNavSprite.sprite.customMaterial = activeNavGradientMaterial;
            activeNavSprite.sprite.setMaterial(activeNavGradientMaterial, 0);
          }
        } else {
          RuntimeUI.createBox(activeNav, {
            name: `TopBarNav${item.name}ActiveFallback`,
            x: 0,
            y: 0,
            width: navItemWidth,
            height: navItemHeight,
            color: new Color(244, 148, 44, 255),
            radius: Math.round(navItemHeight / 2),
          });
        }
      }
      if (!isActive && item.icon) {
        RuntimeUI.createLabel(navWrap, {
          name: `TopBarNav${item.name}Icon`,
          text: item.icon,
          x: Math.round(itemX - navItemWidth * 0.18),
          y: 0,
          width: 20,
          height: 20,
          fontSize: 13,
          color: new Color(247, 155, 52, 228),
        });
      }
      RuntimeUI.createLabel(navWrap, {
        name: `TopBarNav${item.name}Label`,
        text: item.text,
        x: Math.round(isActive ? itemX : itemX + navItemWidth * 0.06),
        y: 0,
        width: navItemWidth - 14,
        height: navItemHeight - 8,
        fontSize: Math.max(14, Math.min(17, Math.round(options.height * 0.2))),
        color: isActive ? new Color(255, 255, 255, 255) : new Color(126, 93, 69, 232),
      });
      if (isActive) {
        const navGlossWidth = Math.round(navItemWidth * this.getArtTuningValue("topBarNavGlossWidthRatio"));
        const navGlossHeight = Math.max(8, Math.round(navItemHeight * this.getArtTuningValue("topBarNavGlossHeightRatio")));
        const navGlossY = Math.round(navItemHeight * this.getArtTuningValue("topBarNavGlossOffsetYRatio"));
        const navGlossAlpha = this.getArtTuningValue("topBarNavGlossAlpha");
        RuntimeUI.createBox(navWrap, {
          name: `TopBarNav${item.name}GlossOverlay`,
          x: Math.round(itemX),
          y: navGlossY,
          width: navGlossWidth,
          height: navGlossHeight,
          color: new Color(255, 252, 241, navGlossAlpha),
          radius: Math.round(navItemHeight * 0.22),
        });
      }

      const navHitArea = RuntimeUI.createBox(navWrap, {
        name: `TopBarNav${item.name}Hit`,
        x: Math.round(itemX),
        y: 0,
        width: navItemWidth,
        height: navItemHeight,
        color: new Color(255, 255, 255, 0),
        radius: Math.round(navItemHeight / 2),
      });
      const navButton = navHitArea.addComponent(Button);
      navButton.transition = Button.Transition.NONE;
      navHitArea.on(
        Button.EventType.CLICK,
        () => {
          if (this.activeTopBarNavTab === item.key) {
            return;
          }
          this.activeTopBarNavTab = item.key;
          this.render();
        },
        this
      );
    });

    const statusWidth = Math.max(118, Math.min(144, Math.round(options.width * statusWidthRatio)));
    const statusHeight = Math.max(48, Math.min(56, Math.round(options.height * 0.58)));
    const statusX = options.width / 2 - brandInsetX - statusWidth / 2;
    const statusShell = RuntimeUI.createCard(topBar, {
      name: "TopBarStatusShell",
      x: Math.round(statusX),
      y: 0,
      width: statusWidth,
      height: statusHeight,
      color: new Color(225, 223, 239, 255),
      innerColor: new Color(207, 210, 234, 214),
      borderColor: new Color(144, 141, 178, 255),
      radius: Math.round(statusHeight / 2),
      borderThickness: 1,
      innerRadius: Math.round(statusHeight / 2) - 1,
    });
    RuntimeUI.createBox(statusShell, {
      name: "TopBarStatusIconBg",
      x: -statusWidth / 2 + 24,
      y: 0,
      width: 32,
      height: 32,
      color: new Color(182, 188, 227, 255),
      radius: 16,
    });
    RuntimeUI.createLabel(statusShell, {
      name: "TopBarStatusIcon",
      text: "🌙",
      x: -statusWidth / 2 + 24,
      y: 0,
      width: 22,
      height: 22,
      fontSize: 13,
      color: new Color(96, 115, 208, 255),
    });
    RuntimeUI.createLabel(statusShell, {
      name: "TopBarStatusText",
      text: "休息中",
      x: 22,
      y: 0,
      width: statusWidth - 48,
      height: 20,
      fontSize: Math.max(14, Math.min(17, Math.round(options.height * 0.2))),
      color: new Color(80, 82, 118, 244),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
  }

  private renderBottomDockStructure(
    parent: Node,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    const radius = Math.round(Math.min(options.height * 0.32, 28));
    const bottomDockShellAlpha = Math.round(this.getArtTuningValue("bottomDockShellAlpha"));
    const bottomDockInnerAlpha = Math.round(this.getArtTuningValue("bottomDockInnerAlpha"));
    const bottomDockGradientTopAlpha = Math.round(this.getArtTuningValue("bottomDockGradientTopAlpha"));
    const bottomDockGradientBottomAlpha = Math.round(this.getArtTuningValue("bottomDockGradientBottomAlpha"));
    const tileGapRatio = this.getArtTuningValue("bottomDockTileGapRatio");
    const iconWidth = Math.round(this.getArtTuningValue("bottomDockIconWidth"));
    const iconHeight = Math.round(this.getArtTuningValue("bottomDockIconHeight"));
    const iconRadius = Math.min(
      Math.round(Math.min(iconWidth, iconHeight) * this.getArtTuningValue("bottomDockIconRadiusRatio")),
      Math.round(Math.min(iconWidth, iconHeight) / 2)
    );
    const iconCenterY = Math.round(iconHeight * 0.42);
    const iconBorderWidth = Math.max(0, this.getArtTuningValue("bottomDockIconBorderWidth"));
    const iconBorderAlpha = Math.round(this.getArtTuningValue("bottomDockIconBorderAlpha"));
    const iconOffsetX = Math.round(this.getArtTuningValue("bottomDockIconOffsetX"));
    const iconOffsetY = Math.round(this.getArtTuningValue("bottomDockIconOffsetY"));
    const iconGlossWidthRatio = this.getArtTuningValue("bottomDockIconGlossWidthRatio");
    const iconGlossHeightRatio = this.getArtTuningValue("bottomDockIconGlossHeightRatio");
    const iconGlossOffsetYRatio = this.getArtTuningValue("bottomDockIconGlossOffsetYRatio");
    const glyphAlpha = Math.round(this.getArtTuningValue("bottomDockGlyphAlpha"));
    const resolveTileSizeScale = (key: ArtTuningKey): number =>
      1 + (this.getArtTuningValue(key) - 1) * BOTTOM_DOCK_TILE_SIZE_TUNING_DAMPING;
    const tileGroupWidthScale = resolveTileSizeScale("bottomDockTileGroupWidthScale");
    const tileWidthScale = resolveTileSizeScale("bottomDockTileWidthScale");
    const tileHeightScale = resolveTileSizeScale("bottomDockTileHeightScale");
    const tileBorderWidth = Math.max(0, this.getArtTuningValue("bottomDockTileBorderWidth"));
    const tileBorderAlpha = Math.round(this.getArtTuningValue("bottomDockTileBorderAlpha"));
    const tileInnerAlpha = Math.round(this.getArtTuningValue("bottomDockTileInnerAlpha"));
    const bottomDockTextOffsetX = Math.round(this.getArtTuningValue("bottomDockTextOffsetX"));
    const bottomDockTextOffsetY = Math.round(this.getArtTuningValue("bottomDockTextOffsetY"));
    const bottomDockTextAlpha = Math.round(this.getArtTuningValue("bottomDockTextAlpha"));
    const bottomDockTextFontSize = Math.round(this.getArtTuningValue("bottomDockTextFontSize"));
    const bottomDockTextColor = new Color(
      Math.round(this.getArtTuningValue("bottomDockTextColorR")),
      Math.round(this.getArtTuningValue("bottomDockTextColorG")),
      Math.round(this.getArtTuningValue("bottomDockTextColorB")),
      bottomDockTextAlpha
    );
    const bottomDockBorderWidth = Math.max(0, this.getArtTuningValue("bottomDockBorderWidth"));
    const bottomDockBorderAlpha = Math.round(this.getArtTuningValue("bottomDockBorderAlpha"));
    const bottomDockBorderOutset = bottomDockBorderAlpha > 0 ? bottomDockBorderWidth : 0;
    const bottomDockVisualWidth = Math.round(options.width + bottomDockBorderOutset * 2);
    const bottomDockVisualHeight = Math.round(options.height + bottomDockBorderOutset * 2);
    const bottomDockVisualRadius = Math.round(radius + bottomDockBorderOutset);
    const bottomDockShadowAlpha = Math.round(this.getArtTuningValue("bottomDockShadowAlpha"));
    const bottomDockShadowSpread = Math.max(
      10,
      Math.round(Math.min(options.width, options.height) * this.getArtTuningValue("bottomDockShadowSpreadRatio"))
    );

    this.ensureBottomDockShadowAssetsForLayout({
      bottomDockWidth: bottomDockVisualWidth,
      bottomDockHeight: bottomDockVisualHeight,
      bottomDockRadius: bottomDockVisualRadius,
      spread: bottomDockShadowSpread,
    });

    if (this.bottomDockShadowSpriteFrame) {
      RuntimeUI.createSpriteFrame(parent, {
        name: "BottomDockShadow",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: bottomDockVisualWidth + bottomDockShadowSpread * 2,
        height: bottomDockVisualHeight + bottomDockShadowSpread * 2,
        spriteFrame: this.bottomDockShadowSpriteFrame,
        color: new Color(
          SHELL_SHADOW_COLOR.r,
          SHELL_SHADOW_COLOR.g,
          SHELL_SHADOW_COLOR.b,
          bottomDockShadowAlpha
        ),
      });
    } else {
      RuntimeUI.createBox(parent, {
        name: "BottomDockShadowFallback",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: bottomDockVisualWidth + Math.round(bottomDockShadowSpread * 0.8),
        height: bottomDockVisualHeight + Math.round(bottomDockShadowSpread * 0.8),
        color: new Color(187, 129, 62, Math.max(0, Math.round(bottomDockShadowAlpha * 0.18))),
        radius: bottomDockVisualRadius,
      });
    }

    if (bottomDockBorderOutset > 0) {
      RuntimeUI.createCard(parent, {
        name: "BottomDockOuterBorder",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: bottomDockVisualWidth,
        height: bottomDockVisualHeight,
        style: "shell",
        borderColor: new Color(235, 207, 180, bottomDockBorderAlpha),
        radius: bottomDockVisualRadius,
        lineWidth: bottomDockBorderOutset * 2,
      });
    }

    const dock = RuntimeUI.createCard(parent, {
      name: "BottomDockShell",
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, bottomDockShellAlpha),
      innerColor: new Color(255, 253, 249, bottomDockInnerAlpha),
      radius,
      borderThickness: 0,
      innerRadius: radius,
    });

    const bottomDockGradientFrame = this.getButtonGradientCarrierSpriteFrame();
    if (bottomDockGradientFrame && (bottomDockGradientTopAlpha > 0 || bottomDockGradientBottomAlpha > 0)) {
      const gradientClip = RuntimeUI.createRoundedClip(dock, {
        name: "BottomDockGradientClip",
        x: 0,
        y: 0,
        width: Math.round(options.width),
        height: Math.round(options.height),
        radius,
      });
      const gradientSprite = RuntimeUI.createSpriteFrame(gradientClip, {
        name: "BottomDockGradientOverlay",
        x: 0,
        y: 0,
        width: Math.round(options.width),
        height: Math.round(options.height),
        spriteFrame: bottomDockGradientFrame,
      });
      const gradientMaterial = this.createButtonGradientMaterial({
        shapeRect: this.resolveSpriteWorldRect(gradientSprite.node, Math.round(options.width), Math.round(options.height)),
        topColor: new Color(255, 255, 255, bottomDockGradientTopAlpha),
        bottomColor: new Color(246, 181, 95, bottomDockGradientBottomAlpha),
        glossColor: new Color(255, 255, 255, 0),
        glossRange: new Vec4(1, 1, 0.01, 0),
      });
      if (gradientMaterial) {
        gradientSprite.sprite.customMaterial = gradientMaterial;
        gradientSprite.sprite.setMaterial(gradientMaterial, 0);
      }
    }

    const items = [
      {
        name: "Feed",
        icon: "๑ڡ๑",
        topColor: new Color(249, 206, 104, 255),
        bottomColor: new Color(238, 157, 50, 255),
        borderColor: new Color(226, 143, 45, 214),
        text: "喂食",
        glyphSizeKey: "bottomDockFeedGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockFeedGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockFeedGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Play",
        icon: "ᕕᐛᕗ",
        topColor: new Color(207, 183, 255, 255),
        bottomColor: new Color(154, 121, 226, 255),
        borderColor: new Color(143, 112, 214, 210),
        text: "玩耍",
        glyphSizeKey: "bottomDockPlayGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockPlayGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockPlayGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Bath",
        icon: "≋",
        topColor: new Color(145, 226, 176, 255),
        bottomColor: new Color(86, 190, 131, 255),
        borderColor: new Color(78, 176, 121, 210),
        text: "洗澡",
        glyphSizeKey: "bottomDockBathGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockBathGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockBathGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Sleep",
        icon: "Zz",
        topColor: new Color(157, 176, 255, 255),
        bottomColor: new Color(96, 119, 220, 255),
        borderColor: new Color(88, 108, 207, 210),
        text: "睡觉",
        glyphSizeKey: "bottomDockSleepGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockSleepGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockSleepGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Music",
        icon: "♪",
        topColor: new Color(248, 202, 92, 255),
        bottomColor: new Color(231, 150, 41, 255),
        borderColor: new Color(218, 137, 38, 210),
        text: "听歌",
        glyphSizeKey: "bottomDockMusicGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockMusicGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockMusicGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Care",
        icon: "♡",
        topColor: new Color(251, 179, 199, 255),
        bottomColor: new Color(226, 111, 148, 255),
        borderColor: new Color(211, 101, 137, 210),
        text: "心情",
        glyphSizeKey: "bottomDockCareGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockCareGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockCareGlyphOffsetY" as ArtTuningKey,
      },
    ];
    const paddingX = Math.max(12, Math.round(options.width * 0.012));
    const gap = Math.max(12, Math.round(options.width * tileGapRatio));
    const baseGroupWidth = options.width - paddingX * 2;
    const groupWidth = Math.max(items.length * 42 + gap * (items.length - 1), baseGroupWidth * tileGroupWidthScale);
    const trackTileWidth = (groupWidth - gap * (items.length - 1)) / items.length;
    const tileWidth = Math.max(42, Math.round(trackTileWidth * tileWidthScale));
    const baseScaledTileHeight = (options.height - 28) * tileHeightScale;
    const groupLeft = -groupWidth / 2;
    items.forEach((item, index) => {
      const tileHeight = Math.max(42, Math.round(baseScaledTileHeight));
      const x = groupLeft + trackTileWidth / 2 + index * (trackTileWidth + gap);
      const tile = RuntimeUI.createCard(dock, {
        name: `BottomDock${item.name}Tile`,
        x: Math.round(x),
        y: 0,
        width: tileWidth,
        height: tileHeight,
        color: new Color(235, 207, 180, tileBorderAlpha),
        innerColor: new Color(255, 251, 245, tileInnerAlpha),
        radius: 24,
        borderThickness: tileBorderWidth,
        innerRadius: Math.max(0, 24 - tileBorderWidth),
      });
      const iconClip = RuntimeUI.createRoundedClip(tile, {
        name: `BottomDock${item.name}IconBg`,
        x: iconOffsetX,
        y: iconCenterY + iconOffsetY,
        width: iconWidth,
        height: iconHeight,
        radius: iconRadius,
      });
      const iconGradientFrame = this.getButtonGradientCarrierSpriteFrame();
      if (iconGradientFrame) {
        const iconSprite = RuntimeUI.createSpriteFrame(iconClip, {
          name: `BottomDock${item.name}IconGradient`,
          x: 0,
          y: 0,
          width: iconWidth,
          height: iconHeight,
          spriteFrame: iconGradientFrame,
        });
        const iconGradientMaterial = this.createButtonGradientMaterial({
          shapeRect: this.resolveSpriteWorldRect(iconSprite.node, iconWidth, iconHeight),
          topColor: item.topColor,
          bottomColor: item.bottomColor,
          glossColor: new Color(255, 252, 241, 42),
          glossRange: new Vec4(0.62, 0.98, 0.16, 0),
        });
        if (iconGradientMaterial) {
          iconSprite.sprite.customMaterial = iconGradientMaterial;
          iconSprite.sprite.setMaterial(iconGradientMaterial, 0);
        }
      } else {
        RuntimeUI.createBox(iconClip, {
          name: `BottomDock${item.name}IconFallback`,
          x: 0,
          y: 0,
          width: iconWidth,
          height: iconHeight,
          color: item.bottomColor,
          radius: iconRadius,
        });
      }
      RuntimeUI.createBox(iconClip, {
        name: `BottomDock${item.name}IconGloss`,
        x: 0,
        y: Math.round(iconHeight * iconGlossOffsetYRatio),
        width: Math.round(iconWidth * iconGlossWidthRatio),
        height: Math.max(6, Math.round(iconHeight * iconGlossHeightRatio)),
        color: new Color(255, 252, 241, 42),
        radius: Math.round(iconRadius * 0.55),
      });
      RuntimeUI.createCard(tile, {
        name: `BottomDock${item.name}IconOutline`,
        x: iconOffsetX,
        y: iconCenterY + iconOffsetY,
        width: iconWidth,
        height: iconHeight,
        style: "shell",
        borderColor: new Color(item.borderColor.r, item.borderColor.g, item.borderColor.b, iconBorderAlpha),
        radius: iconRadius,
        lineWidth: iconBorderWidth,
      });
      RuntimeUI.createLabel(tile, {
        name: `BottomDock${item.name}Icon`,
        text: item.icon,
        x: iconOffsetX + Math.round(this.getArtTuningValue(item.glyphOffsetXKey)),
        y: iconCenterY + iconOffsetY + Math.round(this.getArtTuningValue(item.glyphOffsetYKey)),
        width: Math.max(28, iconWidth - 8),
        height: Math.max(24, iconHeight - 8),
        fontSize: Math.max(
          10,
          Math.round(Math.min(iconWidth, iconHeight) * 0.38 * this.getArtTuningValue(item.glyphSizeKey))
        ),
        color: new Color(112, 76, 49, glyphAlpha),
      });
      RuntimeUI.createLabel(tile, {
        name: `BottomDock${item.name}Text`,
        text: item.text,
        x: bottomDockTextOffsetX,
        y: -30 + bottomDockTextOffsetY,
        width: tileWidth - 12,
        height: 24,
        fontSize: bottomDockTextFontSize,
        color: bottomDockTextColor,
      });
    });
  }

  private renderLayoutHostGuide(
    parent: Node,
    options: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      label: string;
    }
  ): void {
    RuntimeUI.createBox(parent, {
      name: `${options.name}Fill`,
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, 52),
      radius: options.radius,
    });

    RuntimeUI.createCard(parent, {
      name: `${options.name}Outline`,
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      style: "shell",
      borderColor: new Color(231, 193, 150, 214),
      radius: options.radius,
      lineWidth: 3,
    });

    const labelWidth = Math.max(112, Math.min(options.width - 20, 168));
    const labelHeight = 28;
    const labelY = options.y + options.height / 2 - labelHeight / 2 - 14;
    RuntimeUI.createBox(parent, {
      name: `${options.name}LabelBg`,
      x: Math.round(options.x),
      y: Math.round(labelY),
      width: Math.round(labelWidth),
      height: labelHeight,
      color: new Color(255, 255, 255, 228),
      radius: 14,
    });

    RuntimeUI.createLabel(parent, {
      name: `${options.name}Label`,
      text: options.label,
      x: Math.round(options.x),
      y: Math.round(labelY),
      width: Math.round(labelWidth - 14),
      height: 18,
      fontSize: 12,
      color: new Color(126, 93, 69, 214),
    });
  }
    // 给 MainStage 加天空 + 地面，并按 MainStage 圆角裁剪
	// 给 MainStage 加天空 + 地面渐变底图
	private renderStageBase(
    stage: Node,
    stageWidth: number,
    stageHeight: number,
    options?: {
      borderThickness?: number;
      radius?: number;
    }
  ): void {
	  // 当前舞台内容区直接贴合 MainViewport 内边界。
	  // 这里用传入的边框厚度和圆角语义算裁剪盒，避免再套一层独立舞台卡片。
	  const stageBorderThickness = options?.borderThickness ?? 0;

	  const contentWidth = Math.max(1, stageWidth - stageBorderThickness * 2);
	  const contentHeight = Math.max(1, stageHeight - stageBorderThickness * 2);

	  const contentRadius = Math.max(0, (options?.radius ?? MAIN_STAGE_RADIUS) - stageBorderThickness);

	  // 创建一个真正的“圆角裁剪盒子”。
	  // 后面的天空、地面都放进这个盒子里，而不是用一张矩形 Sprite 去盖边框。
	  const clip = new Node("StageContentClip");
	  clip.setParent(stage);
	  clip.setPosition(0, 0, 0);

	  const clipTransform = clip.getComponent(UITransform) ?? clip.addComponent(UITransform);
	  clipTransform.setContentSize(contentWidth, contentHeight);

	  const clipMask = clip.addComponent(Mask);
	  clipMask.type = Mask.Type.GRAPHICS_STENCIL;
	  clipMask.inverted = false;

	  const maskGraphics = this.getGraphicsMaskSubComp(clipMask);
	  if (!maskGraphics) {
		return;
	  }

	  maskGraphics.clear();
	  maskGraphics.fillColor = Color.WHITE;
	  maskGraphics.roundRect(
		-contentWidth / 2,
		-contentHeight / 2,
		contentWidth,
		contentHeight,
		contentRadius
	  );
	  maskGraphics.fill();

	  // 先只做最简单的天空 + 地面。
	  // 这一步不是最终视觉，只用来验证：
	  // 1. 不遮挡 MainStage 边框
	  // 2. 圆角处没有黑边
	// 天空 / 地面分界线，略低于中心，接近参考页感觉。
	const horizonY = -contentHeight * 0.03;

	// 过渡带高度：先做窄一点，避免又变成一大片脏渐变。
	const transitionHeight = 4;

	const topY = contentHeight / 2;
	const bottomY = -contentHeight / 2;

	const skyBottomY = horizonY + transitionHeight / 2;
	const floorTopY = horizonY - transitionHeight / 2;

	const skyHeight = Math.max(0, topY - skyBottomY);
	const floorHeight = Math.max(0, floorTopY - bottomY);

	RuntimeUI.createBox(clip, {
	  name: "StageSkyBase",
	  x: 0,
	  y: skyBottomY + skyHeight / 2,
	  width: contentWidth,
	  height: skyHeight,
	  color: new Color(255, 245, 234, 255),
	  radius: 0,
	});

	RuntimeUI.createBox(clip, {
	  name: "StageFloorBase",
	  x: 0,
	  y: bottomY + floorHeight / 2,
	  width: contentWidth,
	  height: floorHeight,
	  color: new Color(246, 228, 193, 255),
	  radius: 0,
	});

	// 用少量横向色带模拟柔和过渡。
	// 这里先用 10 条，足够柔，但不会太复杂。
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
		name: `StageHorizonBand${index}`,
		x: 0,
		y: skyBottomY - bandHeight / 2 - index * (transitionHeight / blendSteps),
		width: contentWidth,
		height: bandHeight,
		color: new Color(r, g, b, 255),
		radius: 0,
	  });
	}
	// 顶部云朵层：使用现成云图，并把“位置”和“大小”拆成单独参数。
	// 美术后续只需要调这几个值：
	// - leftCloudX / rightCloudX：左右位置
	// - cloudY：整体高度
	// - leftCloudScale / rightCloudScale：左右云的大小
	const cloudY = contentHeight * this.getArtTuningValue("cloudYRatio");
	const cloudBaseWidth = contentWidth * this.getArtTuningValue("cloudBaseWidthRatio");
	const cloudColor = new Color(255, 255, 255, 215);
	const leftCloudX = contentWidth * this.getArtTuningValue("leftCloudXRatio");
	const rightCloudX = contentWidth * this.getArtTuningValue("rightCloudXRatio");
	const leftCloudScale = this.getArtTuningValue("leftCloudScale");
	const rightCloudScale = this.getArtTuningValue("rightCloudScale");
	const rightCloudYOffset = contentHeight * this.getArtTuningValue("rightCloudYOffsetRatio");

	this.createSdfCloud(clip, {
	  name: "StageCloudLeftSdf",
	  x: leftCloudX,
	  y: cloudY,
	  baseWidth: cloudBaseWidth,
	  scale: leftCloudScale,
	  color: cloudColor,
	});

	this.createSdfCloud(clip, {
	  name: "StageCloudRightSdf",
	  x: rightCloudX,
	  y: cloudY + rightCloudYOffset,
	  baseWidth: cloudBaseWidth,
	  scale: rightCloudScale,
	  flipX: true,
	  color: cloudColor,
	});

	// 主舞台底部的弧形承托层。
	// 这层对应参考页里的 StageBaseArc，作用是把地面中心轻轻托起来，
	// 让后续安全区或角色站位不会直接“坐死”在平地上。
	const stageBaseArcWidth = Math.min(contentWidth * this.getArtTuningValue("stageBaseArcWidthRatio"), 560);
	const stageBaseArcHeight = Math.max(76, contentHeight * this.getArtTuningValue("stageBaseArcHeightRatio"));
	const stageBaseArcBottom = Math.max(58, contentHeight * this.getArtTuningValue("stageBaseArcBottomRatio"));
	RuntimeUI.createRadialGlow(clip, {
	  name: "StageBaseArcGlow",
	  x: 0,
	  y: -contentHeight / 2 + stageBaseArcBottom + stageBaseArcHeight / 2,
	  width: Math.round(stageBaseArcWidth),
	  height: Math.round(stageBaseArcHeight),
	  color: new Color(255, 255, 255, 54),
	  steps: 8,
	});

	RuntimeUI.createBox(clip, {
	  name: "StageBaseArc",
	  x: 0,
	  y: -contentHeight / 2 + stageBaseArcBottom + stageBaseArcHeight / 2,
	  width: Math.round(stageBaseArcWidth * 0.9),
	  height: Math.round(stageBaseArcHeight * 0.72),
	  color: new Color(255, 255, 255, 44),
	  radius: Math.round(stageBaseArcHeight),
	});

	// 地平线前面的细线层。
	// 它不是功能线，只是帮地面和天空之间建立一个更明确的舞台“前后关系”。
	const groundLineWidth = Math.round(contentWidth * 0.82);
	const groundLineY = contentHeight * this.getArtTuningValue("stageGroundLineYRatio");
	RuntimeUI.createBox(clip, {
	  name: "StageGroundLine",
	  x: 0,
	  y: groundLineY,
	  width: groundLineWidth,
	  height: 2,
	  color: new Color(213, 171, 118, 166),
	  radius: 1,
	});

	// 顶部星点提示。
	// 这层只负责补参考页上方那组很轻的小星星，让天空不再太空。
	RuntimeUI.createLabel(clip, {
	  name: "StageSparkles",
	  text: "✦   ✧   ✦",
	  x: 0,
	  y: contentHeight * 0.43,
	  width: 180,
	  height: 28,
	  fontSize: 18,
	  color: new Color(244, 183, 79, 210),
	});

	// 中央安全区占位。
	// 先用一层轻填充 + 一层细边框近似参考页的虚线框感，保持结构占位但不过分抢戏。
	const safeZoneWidth = Math.max(320, Math.min(contentWidth * this.getArtTuningValue("safeZoneWidthRatio"), 430));
	const safeZoneHeight = Math.max(310, Math.min(contentHeight * this.getArtTuningValue("safeZoneHeightRatio"), 438));
	const safeZoneY = contentHeight * this.getArtTuningValue("safeZoneYRatio");
	RuntimeUI.createBox(clip, {
	  name: "PetSafeZoneFill",
	  x: 0,
	  y: safeZoneY,
	  width: safeZoneWidth,
	  height: safeZoneHeight,
	  color: new Color(255, 255, 255, 32),
	  radius: 28,
	});
	RuntimeUI.createCard(clip, {
	  name: "PetSafeZoneOutline",
	  x: 0,
	  y: safeZoneY,
	  width: safeZoneWidth,
	  height: safeZoneHeight,
	  style: "shell",
	  borderColor: new Color(247, 191, 129, 154),
	  radius: 28,
	  lineWidth: 2,
	});

	RuntimeUI.createBox(clip, {
	  name: "PetSafeZoneLabelBg",
	  x: 0,
	  y: safeZoneY + safeZoneHeight / 2 - 28,
	  width: 142,
	  height: 28,
	  color: new Color(255, 255, 255, 198),
	  radius: 14,
	});
	RuntimeUI.createLabel(clip, {
	  name: "PetSafeZoneLabel",
	  text: "PET SAFE ZONE",
	  x: 0,
	  y: safeZoneY + safeZoneHeight / 2 - 28,
	  width: 132,
	  height: 20,
	  fontSize: 12,
	  color: new Color(110, 74, 51, 196),
	});

	if (this.showShaderDebugBlock) {
	  const shaderDebugSize = Math.min(128, Math.max(92, Math.round(Math.min(safeZoneWidth, safeZoneHeight) * 0.26)));
	  const shaderDebugY = safeZoneY + 6;
	  const shaderDebugRadius = 18;
	  const shaderDebugFrame = this.getButtonGradientCarrierSpriteFrame();
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
		const shaderDebugMaterial = this.createButtonGradientMaterial({
		  shapeRect: this.resolveSpriteWorldRect(shaderDebugSprite.node, shaderDebugSize, shaderDebugSize),
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

	RuntimeUI.createBox(clip, {
	  name: "PetAnchor",
	  x: 0,
	  y: safeZoneY - safeZoneHeight / 2 + 44,
	  width: 110,
	  height: 18,
	  color: new Color(247, 155, 52, 46),
	  radius: 9,
	});
	RuntimeUI.createCard(clip, {
	  name: "PetAnchorBorder",
	  x: 0,
	  y: safeZoneY - safeZoneHeight / 2 + 44,
	  width: 110,
	  height: 18,
	  style: "shell",
	  borderColor: new Color(247, 155, 52, 68),
	  radius: 9,
	  lineWidth: 1,
	});

	// 地面两侧草丛占位。
	// 这里先用几团半圆草包建立左右落点，避免画面底部太空。
	const grassY = contentHeight * this.getArtTuningValue("grassYRatio");
	const grassTufts = [
	  { x: -contentWidth * 0.44, width: 28, height: 18, color: new Color(114, 211, 154, 228) },
	  { x: -contentWidth * 0.34, width: 24, height: 16, color: new Color(140, 221, 173, 224) },
	  { x: contentWidth * 0.26, width: 30, height: 18, color: new Color(167, 230, 190, 220) },
	  { x: contentWidth * 0.41, width: 30, height: 20, color: new Color(111, 202, 149, 228) },
	];
	for (const tuft of grassTufts) {
	  RuntimeUI.createBox(clip, {
		name: `GrassTuft${Math.round(tuft.x)}`,
		x: tuft.x,
		y: grassY,
		width: tuft.width,
		height: tuft.height,
		color: tuft.color,
		radius: Math.max(tuft.width, tuft.height),
	  });
	}

	// 两侧花形标记。
	// 先用“花芯 + 四瓣”的方式做近似，尽量贴近参考页的小花落点。
	const createStageMarker = (name: string, x: number, y: number, scale: number): void => {
	  const marker = new Node(name);
	  marker.setParent(clip);
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
		  name: `${name}Petal${petal.x}_${petal.y}`,
		  x: petal.x,
		  y: petal.y,
		  width: 10,
		  height: 10,
		  color: new Color(255, 255, 255, 246),
		  radius: 5,
		});
	  }
	  RuntimeUI.createBox(marker, {
		name: `${name}CenterOuter`,
		x: 0,
		y: 0,
		width: 18,
		height: 18,
		color: new Color(255, 255, 255, 246),
		radius: 9,
	  });
	  RuntimeUI.createBox(marker, {
		name: `${name}CenterInner`,
		x: 0,
		y: 0,
		width: 8,
		height: 8,
		color: new Color(247, 184, 200, 255),
		radius: 4,
	  });
	};
	createStageMarker("StageMarkerLeft", -contentWidth * 0.31, -contentHeight * 0.285, 1);
	createStageMarker("StageMarkerRight", contentWidth * 0.39, -contentHeight * 0.278, 0.85);

	clip.setSiblingIndex(1);
	}
  private renderReferenceButton(shell: Node, layout: MainLayout): void {
    RuntimeUI.createBox(shell, {
      name: "ReferenceButtonShadow",
      x: layout.buttonX + 4,
      y: layout.buttonY - 4,
      width: layout.buttonSize,
      height: layout.buttonSize,
      color: new Color(177, 121, 67, 45),
      radius: layout.buttonSize / 2,
    });

    const { node, button } = RuntimeUI.createButton(shell, {
      name: "ReferenceButton",
      text: REFERENCE_BUTTON_LABEL,
      x: layout.buttonX,
      y: layout.buttonY,
      width: layout.buttonSize,
      height: layout.buttonSize,
      color: new Color(245, 164, 93, 255),
      fontSize: Math.max(16, Math.round(layout.buttonSize * 0.2)),
      radius: layout.buttonSize / 2,
    });

    button.transition = Button.Transition.NONE;
    node.on(Button.EventType.CLICK, this.openReferencePage, this);
  }

  private openArtDebugPage(): void {
    if (typeof window === "undefined") {
      return;
    }

    this.installArtDebugBridge();
    const existing = this.artDebugPageWindow;
    if (existing && !existing.closed) {
      existing.focus();
      existing.document.open();
      existing.document.write(this.getArtDebugPageHtml());
      existing.document.close();
      return;
    }

    const popup = window.open("", ART_DEBUG_WINDOW_NAME, "width=520,height=900,resizable=yes,scrollbars=yes");
    if (!popup) {
      return;
    }

    this.artDebugPageWindow = popup;
    popup.document.open();
    popup.document.write(this.getArtDebugPageHtml());
    popup.document.close();
    popup.focus();
  }

  private openReferencePage(): void {
    if (!this.canOpenReferencePage() || typeof window === "undefined") {
      return;
    }

    const url = this.getReferencePageUrl();
    const opened = window.open(url, "_blank");
    if (!opened) {
      window.location.href = url;
    }
  }

  private canOpenReferencePage(): boolean {
    const now = Date.now();
    if (now - this.lastReferenceOpenAt < 500) {
      return false;
    }

    this.lastReferenceOpenAt = now;
    return true;
  }

  private getReferencePageUrl(): string {
    if (this.referencePageUrl) {
      return this.referencePageUrl;
    }

    const blob = new Blob([REFERENCE_PAGE_HTML], { type: "text/html;charset=utf-8" });
    this.referencePageUrl = URL.createObjectURL(blob);
    return this.referencePageUrl;
  }

  private releaseReferencePageUrl(): void {
    if (this.referencePageUrl) {
      URL.revokeObjectURL(this.referencePageUrl);
      this.referencePageUrl = null;
    }
  }

  private releaseArtDebugPage(): void {
    if (this.artDebugPageWindow && !this.artDebugPageWindow.closed) {
      this.artDebugPageWindow.close();
    }

    this.artDebugPageWindow = null;
  }

  private getArtDebugPageHtml(): string {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>主界面美术调参页</title>
  <style>
    :root {
      --bg: #fdf5ec;
      --panel: rgba(255, 250, 243, 0.92);
      --panel-strong: #fffaf4;
      --line: #ebcfb4;
      --text: #6e4a33;
      --muted: #9c7b63;
      --brand: #f79b34;
      --brand-soft: rgba(247, 155, 52, 0.14);
      --shadow: 0 18px 36px rgba(187, 129, 62, 0.12);
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      font-family: "PingFang SC", "Microsoft YaHei", sans-serif;
      background:
        radial-gradient(circle at top left, rgba(255,255,255,0.88) 0%, transparent 30%),
        radial-gradient(circle at bottom right, rgba(255,225,192,0.55) 0%, transparent 28%),
        linear-gradient(180deg, #fcf2e6 0%, #f6e6d4 100%);
      color: var(--text);
      padding: 18px;
    }

    .app {
      max-width: 960px;
      margin: 0 auto;
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 26px;
      box-shadow: var(--shadow);
      overflow: hidden;
    }

    .hero {
      padding: 22px 24px 16px;
      border-bottom: 1px solid rgba(235, 207, 180, 0.72);
      background: linear-gradient(180deg, rgba(255,255,255,0.42) 0%, rgba(255,248,241,0.78) 100%);
    }

    .hero h1 {
      margin: 0 0 8px;
      font-size: 26px;
      line-height: 1.2;
    }

    .hero p {
      margin: 0;
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
    }

    .toolbar {
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      padding: 16px 24px 0;
    }

    .toolbar button {
      border: 0;
      border-radius: 999px;
      padding: 10px 16px;
      background: var(--panel-strong);
      color: var(--text);
      font-size: 14px;
      cursor: pointer;
      box-shadow: inset 0 0 0 1px rgba(235, 207, 180, 0.95);
    }

    .toolbar button.primary {
      background: linear-gradient(180deg, #ffb760 0%, #f79b34 100%);
      color: #fff;
      box-shadow: 0 10px 20px rgba(247, 155, 52, 0.24);
    }

    .status {
      padding: 10px 24px 0;
      color: var(--muted);
      font-size: 12px;
    }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 14px;
      padding: 18px 24px 24px;
    }

    .section {
      background: rgba(255,255,255,0.62);
      border: 1px solid rgba(235, 207, 180, 0.9);
      border-radius: 22px;
      padding: 16px;
    }

    .section-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin: 0 0 12px;
    }

    .section h2 {
      margin: 0;
      font-size: 17px;
    }

    .section-toggle {
      width: 34px;
      height: 28px;
      border: 0;
      border-radius: 999px;
      background: rgba(255, 250, 243, 0.92);
      color: var(--brand);
      cursor: pointer;
      font-size: 15px;
      line-height: 28px;
      box-shadow: inset 0 0 0 1px rgba(235, 207, 180, 0.95);
    }

    .section-body[hidden] {
      display: none;
    }

    .section.is-collapsed {
      padding-bottom: 12px;
    }

    .section.is-collapsed .section-head {
      margin-bottom: 0;
    }

    .field {
      padding: 12px;
      border-radius: 18px;
      background: rgba(255, 250, 243, 0.9);
      box-shadow: inset 0 0 0 1px rgba(242, 221, 200, 0.9);
    }

    .field + .field {
      margin-top: 10px;
    }

    .field-head {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }

    .field-title {
      font-size: 14px;
      font-weight: 700;
    }

    .field-value {
      font-size: 12px;
      color: var(--brand);
      font-variant-numeric: tabular-nums;
    }

    .field-desc {
      margin: 0 0 10px;
      font-size: 12px;
      line-height: 1.5;
      color: var(--muted);
    }

    .field-controls {
      display: grid;
      grid-template-columns: 52px 1fr 52px 92px;
      gap: 10px;
      align-items: center;
    }

    .field-bound {
      font-size: 11px;
      color: var(--muted);
      text-align: center;
      font-variant-numeric: tabular-nums;
    }

    input[type="range"] {
      width: 100%;
      accent-color: var(--brand);
    }

    input[type="number"] {
      width: 100%;
      border: 1px solid rgba(235, 207, 180, 0.95);
      border-radius: 12px;
      background: #fffefb;
      color: var(--text);
      padding: 8px 10px;
      font-size: 13px;
      font-variant-numeric: tabular-nums;
    }

    .footer {
      padding: 0 24px 24px;
      color: var(--muted);
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <main class="app">
    <section class="hero">
      <h1>主界面美术调参页</h1>
      <p>这里集中管理当前 Main 运行时 UI 的关键视觉参数。滑杆或数值框修改后会立即回写到主界面，并保存在当前浏览器本地缓存中，方便美术连续调效果。</p>
    </section>
    <section class="toolbar">
      <button id="refreshButton">同步当前值</button>
      <button id="referenceButton">打开参考页</button>
      <button id="resetButton" class="primary">恢复默认</button>
    </section>
    <div class="status" id="status">正在连接主界面…</div>
    <section class="grid" id="sections"></section>
    <div class="footer">
      当前仅暴露主界面最影响视觉效果的一组参数：壳层、舞台、顶栏、底栏。后续如果某个区块还需要更细颗粒度，我们可以继续往这张调参页里补。
    </div>
  </main>
  <script>
    (function () {
      var BRIDGE_KEY = "__BUDDY_CLIENT_ART_DEBUG__";
      var controlsByKey = {};
      var fieldByKey = {};
      var collapsedSections = {};

      function getBridge() {
        return window.opener && window.opener[BRIDGE_KEY];
      }

      function getSnapshot() {
        var bridge = getBridge();
        return bridge ? bridge.getSnapshot() : null;
      }

      function resolveDecimals(step) {
        var text = String(step);
        var dot = text.indexOf(".");
        return dot === -1 ? 0 : text.length - dot - 1;
      }

      function formatValue(field, value) {
        return Number(value).toFixed(resolveDecimals(field.step));
      }

      function formatBound(field, value) {
        return Number(value).toFixed(resolveDecimals(field.step));
      }

      function setStatus(text, tone) {
        var status = document.getElementById("status");
        if (!status) return;
        status.textContent = text;
        status.style.color = tone || "#9c7b63";
      }

      function isSectionCollapsed(sectionName) {
        return collapsedSections[sectionName] !== false;
      }

      function build(snapshot) {
        var container = document.getElementById("sections");
        if (!container) return;
        container.innerHTML = "";
        controlsByKey = {};
        fieldByKey = {};

        var grouped = {};
        snapshot.fields.forEach(function (field) {
          fieldByKey[field.key] = field;
          if (!grouped[field.section]) grouped[field.section] = [];
          grouped[field.section].push(field);
        });

        Object.keys(grouped).forEach(function (sectionName) {
          var sectionCollapsed = isSectionCollapsed(sectionName);
          var section = document.createElement("section");
          section.className = "section";
          if (sectionCollapsed) {
            section.classList.add("is-collapsed");
          }

          var sectionHead = document.createElement("div");
          sectionHead.className = "section-head";

          var title = document.createElement("h2");
          title.textContent = sectionName;
          sectionHead.appendChild(title);

          var toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "section-toggle";
          toggle.setAttribute("aria-label", sectionName + " 参数卷展");
          toggle.setAttribute("aria-expanded", sectionCollapsed ? "false" : "true");
          toggle.textContent = sectionCollapsed ? "∨" : "∧";
          sectionHead.appendChild(toggle);
          section.appendChild(sectionHead);

          var body = document.createElement("div");
          body.className = "section-body";
          body.hidden = sectionCollapsed;

          toggle.addEventListener("click", function () {
            var collapsed = !body.hidden;
            body.hidden = collapsed;
            collapsedSections[sectionName] = collapsed;
            section.classList.toggle("is-collapsed", collapsed);
            toggle.setAttribute("aria-expanded", collapsed ? "false" : "true");
            toggle.textContent = collapsed ? "∨" : "∧";
          });

          grouped[sectionName].forEach(function (field) {
            var row = document.createElement("div");
            row.className = "field";

            var head = document.createElement("div");
            head.className = "field-head";

            var label = document.createElement("div");
            label.className = "field-title";
            label.textContent = field.label;

            var value = document.createElement("div");
            value.className = "field-value";
            value.textContent = formatValue(field, snapshot.state[field.key]);

            head.appendChild(label);
            head.appendChild(value);
            row.appendChild(head);

            var desc = document.createElement("p");
            desc.className = "field-desc";
            desc.textContent = field.description;
            row.appendChild(desc);

            var controls = document.createElement("div");
            controls.className = "field-controls";

            var minLabel = document.createElement("div");
            minLabel.className = "field-bound";
            minLabel.textContent = formatBound(field, field.min);

            var range = document.createElement("input");
            range.type = "range";
            range.min = String(field.min);
            range.max = String(field.max);
            range.step = String(field.step);
            range.value = String(snapshot.state[field.key]);

            var maxLabel = document.createElement("div");
            maxLabel.className = "field-bound";
            maxLabel.textContent = formatBound(field, field.max);

            var number = document.createElement("input");
            number.type = "number";
            number.min = String(field.min);
            number.max = String(field.max);
            number.step = String(field.step);
            number.value = String(snapshot.state[field.key]);

            controls.appendChild(minLabel);
            controls.appendChild(range);
            controls.appendChild(maxLabel);
            controls.appendChild(number);
            row.appendChild(controls);
            body.appendChild(row);

            controlsByKey[field.key] = { value: value, range: range, number: number };

            range.addEventListener("input", function () {
              number.value = range.value;
              commit(field.key, range.value);
            });

            number.addEventListener("change", function () {
              range.value = number.value;
              commit(field.key, number.value);
            });
          });

          section.appendChild(body);
          container.appendChild(section);
        });
      }

      function applyState(state) {
        Object.keys(controlsByKey).forEach(function (key) {
          var controls = controlsByKey[key];
          var field = fieldByKey[key];
          if (!controls || !field) return;
          var formatted = formatValue(field, state[key]);
          controls.value.textContent = formatted;
          if (document.activeElement !== controls.range) {
            controls.range.value = String(state[key]);
          }
          if (document.activeElement !== controls.number) {
            controls.number.value = String(state[key]);
          }
        });
      }

      function commit(key, rawValue) {
        var bridge = getBridge();
        if (!bridge) {
          setStatus("主界面连接已断开，请回到游戏重新打开调参页。", "#c55b38");
          return;
        }

        var value = Number(rawValue);
        if (!Number.isFinite(value)) {
          return;
        }

        bridge.setValue(key, value);
        var snapshot = bridge.getSnapshot();
        applyState(snapshot.state);
        setStatus("已回写到主界面，可直接对照场景看效果。");
      }

      function boot() {
        var snapshot = getSnapshot();
        if (!snapshot) {
          setStatus("未连接到主界面。请从游戏里的“测试面板”重新打开。", "#c55b38");
          return;
        }

        build(snapshot);
        applyState(snapshot.state);
        setStatus("已连接主界面，当前数值与运行时同步。");
      }

      document.getElementById("refreshButton").addEventListener("click", function () {
        boot();
      });

      document.getElementById("referenceButton").addEventListener("click", function () {
        var bridge = getBridge();
        if (bridge) {
          bridge.openReferencePage();
        }
      });

      document.getElementById("resetButton").addEventListener("click", function () {
        var bridge = getBridge();
        if (!bridge) {
          return;
        }

        bridge.reset();
        boot();
      });

      window.setInterval(function () {
        var snapshot = getSnapshot();
        if (!snapshot) {
          return;
        }

        if (!Object.keys(controlsByKey).length) {
          build(snapshot);
        }
        applyState(snapshot.state);
      }, 900);

      boot();
    })();
  </script>
</body>
</html>`;
  }
}

const REFERENCE_PAGE_HTML = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>电子宠物乐园 - 主舞台底层场景</title>
  <style>
    :root {
      --bg-primary: #FBF2E8;
      --bg-secondary: #F7E9D8;
      --brand: #F79B34;
      --gold: #F4B74F;
      --mint: #72D39A;
      --text-primary: #6E4A33;
      --border-soft: #EBCFB4;
      --border-inner: #F2DDC8;
      --shadow: 0 14px 28px rgba(187, 129, 62, 0.10), 0 6px 12px rgba(187, 129, 62, 0.07);
      --inner-shadow: inset 0 0 0 2px rgba(255,255,255,0.45);
      --radius-xl: 32px;
      --radius-lg: 24px;
      --radius-pill: 999px;
    }

    * { box-sizing: border-box; }

    html, body {
      height: 100%;
      margin: 0;
      font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
      background:
        radial-gradient(circle at top left, #fff7ef 0%, transparent 32%),
        radial-gradient(circle at bottom right, #fce6ce 0%, transparent 26%),
        linear-gradient(180deg, #FDF5EC 0%, #F8EBDD 100%);
      color: var(--text-primary);
    }

    body {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .AppShell {
      width: min(1280px, 100%);
      aspect-ratio: 4 / 3;
      min-height: 720px;
      background: linear-gradient(180deg, var(--bg-primary), #F9EEDF);
      border: 2px solid var(--border-soft);
      border-radius: 38px;
      box-shadow: var(--shadow);
      position: relative;
      overflow: hidden;
      padding: 18px;
    }

    .AppShell::before,
    .AppShell::after {
      content: "";
      position: absolute;
      pointer-events: none;
      border-radius: 50%;
      opacity: 0.35;
    }

    .AppShell::before {
      width: 240px;
      height: 240px;
      left: -70px;
      top: -70px;
      background: radial-gradient(circle, #FFE8C8 0%, transparent 70%);
    }

    .AppShell::after {
      width: 300px;
      height: 300px;
      right: -90px;
      bottom: -110px;
      background: radial-gradient(circle, #FFD8C4 0%, transparent 72%);
    }

    .ShellFrame {
      height: 100%;
      border-radius: 30px;
      border: 2px solid rgba(255,255,255,0.55);
      box-shadow: var(--inner-shadow);
      padding: 22px;
      position: relative;
      z-index: 1;
      display: flex;
    }

    .MainViewport {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 0;
      border-radius: var(--radius-xl);
      border: 2px solid var(--border-soft);
      box-shadow: inset 0 0 0 2px rgba(255,255,255,0.45);
      background: rgba(255, 249, 241, 0.72);
      padding: 16px;
      overflow: hidden;
    }

    .MainStage {
      position: relative;
      width: 100%;
      height: 100%;
      border-radius: 28px;
      border: 1.5px solid var(--border-inner);
      overflow: hidden;
      background:
        linear-gradient(180deg, #FFF8F4 0%, #FFF4E8 48%, #F8E7C9 49%, #F1DEB8 100%);
      isolation: isolate;
    }

    .MainStage::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 18% 16%, rgba(255,255,255,0.96) 0 9%, transparent 9.5%),
        radial-gradient(circle at 26% 20%, rgba(255,255,255,0.84) 0 7%, transparent 7.5%),
        radial-gradient(circle at 72% 14%, rgba(255,255,255,0.94) 0 10%, transparent 10.5%),
        radial-gradient(circle at 82% 20%, rgba(255,255,255,0.82) 0 7%, transparent 7.5%),
        radial-gradient(circle at 10% 70%, rgba(247, 223, 162, 0.7) 0 1.8%, transparent 1.9%),
        radial-gradient(circle at 20% 76%, rgba(155, 223, 163, 0.8) 0 2.3%, transparent 2.4%),
        radial-gradient(circle at 76% 72%, rgba(243, 168, 196, 0.7) 0 1.8%, transparent 1.9%),
        radial-gradient(circle at 84% 78%, rgba(160, 221, 182, 0.8) 0 2.1%, transparent 2.2%);
      z-index: 0;
    }

    .AmbientLayer {
      position: absolute;
      inset: 0;
      pointer-events: none;
      z-index: 1;
    }

    .AmbientLayer::before {
      content: "✦  ✧  ✦";
      position: absolute;
      top: 18px;
      left: 50%;
      transform: translateX(-50%);
      color: rgba(244, 183, 79, 0.82);
      font-size: 18px;
      letter-spacing: 10px;
      text-shadow: 0 0 12px rgba(255,255,255,0.65);
    }

    .AmbientGlow {
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 50% 12%, rgba(255,255,255,0.38) 0%, transparent 28%),
        radial-gradient(circle at 50% 100%, rgba(255, 214, 161, 0.22) 0%, transparent 38%);
      z-index: 1;
    }

    .StageSkeleton {
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
    }

    .StageFloor {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 46%;
      background: linear-gradient(180deg, rgba(249,232,204,0) 0%, rgba(244,225,189,0.82) 22%, #F4E1BD 100%);
    }

    .StageBaseArc {
      position: absolute;
      left: 50%;
      bottom: 58px;
      transform: translateX(-50%);
      width: min(70%, 720px);
      height: 132px;
      border-radius: 50%;
      background: radial-gradient(ellipse at center, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.15) 38%, rgba(231,197,149,0.42) 66%, rgba(209,168,111,0.18) 100%);
      filter: blur(2px);
      opacity: 0.9;
    }

    .StageGroundLine {
      position: absolute;
      left: 8%;
      right: 8%;
      bottom: 92px;
      height: 2px;
      background: linear-gradient(90deg, transparent 0%, rgba(213,171,118,0.65) 16%, rgba(213,171,118,0.65) 84%, transparent 100%);
    }

    .PetSafeZone {
      position: absolute;
      left: 50%;
      bottom: 86px;
      transform: translateX(-50%);
      width: min(42%, 420px);
      height: min(56%, 420px);
      min-width: 280px;
      min-height: 280px;
      border-radius: 28px;
      border: 2px dashed rgba(247, 155, 52, 0.34);
      background: linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.10) 100%);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.22);
      z-index: 3;
    }

    .PetSafeZone::before {
      content: "PET SAFE ZONE";
      position: absolute;
      top: 14px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 12px;
      border-radius: var(--radius-pill);
      background: rgba(255,255,255,0.78);
      border: 1px solid rgba(247, 155, 52, 0.18);
      color: rgba(110, 74, 51, 0.72);
      font-size: 12px;
      letter-spacing: 0.14em;
      font-weight: 700;
      white-space: nowrap;
    }

    .PetAnchor {
      position: absolute;
      left: 50%;
      bottom: 36px;
      transform: translateX(-50%);
      width: 110px;
      height: 18px;
      border-radius: var(--radius-pill);
      background: rgba(247, 155, 52, 0.18);
      border: 1px solid rgba(247, 155, 52, 0.24);
    }

    .GrassLayer {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 74px;
      height: 58px;
      background:
        radial-gradient(circle at 9% 90%, #72D39A 0 13px, transparent 14px),
        radial-gradient(circle at 18% 100%, #8CDDAD 0 12px, transparent 13px),
        radial-gradient(circle at 72% 100%, #A7E6BE 0 15px, transparent 16px),
        radial-gradient(circle at 86% 92%, #6FCA95 0 14px, transparent 15px);
      opacity: 0.64;
      z-index: 2;
    }

    .StageMarker {
      position: absolute;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      box-shadow:
        0 -8px 0 0 #fff,
        0 8px 0 0 #fff,
        -8px 0 0 0 #fff,
        8px 0 0 0 #fff,
        0 0 0 5px #F7B8C8 inset;
      opacity: 0.92;
      z-index: 2;
    }

    .StageMarker.left { left: 18%; bottom: 96px; }
    .StageMarker.right { right: 14%; bottom: 100px; transform: scale(0.85); }

    .StageHint {
      position: absolute;
      top: 18px;
      right: 18px;
      z-index: 4;
      padding: 10px 14px;
      border-radius: var(--radius-pill);
      background: rgba(255,255,255,0.74);
      border: 1px solid var(--border-inner);
      color: rgba(110, 74, 51, 0.78);
      font-size: 13px;
      font-weight: 700;
      backdrop-filter: blur(4px);
    }

    .FooterTip {
      position: absolute;
      left: 26px;
      bottom: 24px;
      font-size: 12px;
      color: rgba(156, 123, 99, 0.8);
      z-index: 2;
    }

    @media (max-width: 1100px) {
      body { padding: 12px; }
      .AppShell { min-height: 660px; }
      .PetSafeZone { width: min(50%, 420px); }
    }

    @media (max-width: 920px) {
      .AppShell {
        aspect-ratio: auto;
        min-height: auto;
      }

      .ShellFrame {
        min-height: 78vh;
      }

      .PetSafeZone {
        width: min(68%, 420px);
        min-width: 240px;
        min-height: 250px;
      }

      .FooterTip {
        position: static;
        margin-top: 12px;
      }
    }

    @media (max-width: 640px) {
      .ShellFrame { padding: 14px; }
      .MainViewport { padding: 12px; }
      .StageHint {
        right: 12px;
        top: 12px;
        font-size: 12px;
      }
    }
  </style>
</head>
<body>
  <main class="AppShell" aria-label="电子宠物乐园主舞台壳层">
    <div class="ShellFrame">
      <section class="MainViewport" aria-label="主视口 MainViewport">
        <section class="MainStage" aria-label="主舞台 MainStage">
          <div class="AmbientLayer" aria-hidden="true">
            <div class="AmbientGlow"></div>
          </div>

          <div class="StageSkeleton" aria-hidden="true">
            <div class="StageFloor"></div>
            <div class="StageBaseArc"></div>
            <div class="StageGroundLine"></div>
            <div class="GrassLayer"></div>
            <div class="StageMarker left"></div>
            <div class="StageMarker right"></div>
          </div>

          <div class="PetSafeZone" aria-label="宠物安全区">
            <div class="PetAnchor" aria-hidden="true"></div>
          </div>

          <div class="StageHint">仅保留底层画布 / 主舞台骨架</div>
        </section>
      </section>
    </div>

    <div class="FooterTip">当前版本：仅保留壳层、MainViewport、MainStage、氛围层、宠物安全区与舞台基础骨架</div>
  </main>
</body>
</html>`;
