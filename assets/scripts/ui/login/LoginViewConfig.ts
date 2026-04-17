import { Color } from "cc";

export type Rgba = readonly [number, number, number, number];

// 文件整体作用：
// 这是登录页的“参数总表”。
// 所有适合集中调的尺寸、偏移、颜色，基本都放在这里，而不是散在业务逻辑里。
//
// 一句话版本：
// 这段代码的核心意思就是：把登录页的尺寸、位置和颜色参数集中放在一起，方便统一调整。
//
// 美术需要关注的重点：
// 1. 想改大构图，优先看 LOGIN_LAYOUT。
// 2. 想改输入框、按钮、账号条尺寸，优先看 LOGIN_RUNTIME_LAYOUT。
// 3. 想改颜色、透明度、整体风格，优先看 LOGIN_THEME。
//
// 推荐调参顺序：
// 1. 先改 LOGIN_LAYOUT，让整页大关系对。
// 2. 再改 LOGIN_RUNTIME_LAYOUT，让按钮、输入框、账号条这些局部细节对。
// 3. 最后再改 LOGIN_THEME，让颜色和透明度更接近想要的风格。
//
// 注意：
// - 宽高一般用“绝对像素值”，好理解，适合当前项目阶段。
// - xFactor / yFactor 这种“比例值”是相对屏幕尺寸的偏移，更适合控制横竖屏的大位置。
// - 颜色统一写成 RGBA，最后通过 themeColor() 转成 Cocos 的 Color。

// LOGIN_LAYOUT 控制的是“整页大构图”。
// portrait = 竖屏方案
// landscape = 横屏方案
export const LOGIN_LAYOUT = {
  portrait: {
    // LogoArea 是顶部 logo 区的“可用空间”，不是 logo 图片本身大小。
    // width / height 越大，logo 的活动范围越大。
    logoArea: {
      width: 520,
      height: 220,
      x: 0,
      // yFactor 表示 logo 区中心点相对屏幕高度的偏移比例。
      // 正值越大，logo 越往上。
      yFactor: 0.2,
    },
    // panel 是登录表单整体面板的尺寸和大位置。
    // 这里只控制“大卡片”放哪里，不控制输入框和按钮的具体位置。
    panel: {
      width: 420,
      height: 280,
      xFactor: 0,
      // 竖屏下希望面板整体稍微下压，给 logo 留空间。
      yFactor: -0.18,
    },
    // logoImage 控制“正式 logo 图片”在 LogoArea 里面最多能占多大。
    // maxWidthFactor / maxHeightFactor 越接近 1，logo 越贴近容器边缘。
    logoImage: {
      maxWidthFactor: 0.98,
      maxHeightFactor: 0.94,
      // y 是 logo 图片在 LogoArea 内部的额外上下偏移。
      y: 0,
    },
  },
  landscape: {
    // 横屏下 logo 区比竖屏更宽，方便承接更宽的正式 logo 图。
    logoArea: {
      width: 660,
      height: 240,
      // landscape 这里用 xFactor 而不是 x，表示跟着屏幕宽度比例移动。
      // 现在是 0，表示水平居中。
      xFactor: 0,
      yFactor: 0.24,
    },
    // 横屏下登录面板往右偏一点，形成“左 logo / 右功能”的构图。
    panel: {
      width: 500,
      height: 290,
      // 正值表示往右偏。
      xFactor: 0.16,
      // 正值表示往上偏。
      yFactor: 0.08,
    },
    logoImage: {
      maxWidthFactor: 0.96,
      maxHeightFactor: 0.92,
      y: 0,
    },
  },
} as const;

// LOGIN_RUNTIME_LAYOUT 控制的是“局部组件级别”的尺寸和位置。
// 这里的数字大多是给 LoginLayoutCalculator 用的，最后会换算成真实节点位置。
export const LOGIN_RUNTIME_LAYOUT = {
  // 品牌入口（brandEntry）整体区域。
  // 它本身只是一个逻辑容器，真正显示的“账号条”“进入按钮”还会各自有尺寸。
  brandEntry: {
    width: 340,
    height: 144,
    // 竖屏下整体往下放，避免挤压 logo。
    portraitY: -186,
    // 横屏下品牌入口更靠中间一些。
    landscapeY: -88,
  },
  // 账号条尺寸。
  //
  // 你最近调的“账号条长度、高度”基本都看这里。
  // width 越大，账号名越不容易和右侧“点击切换”打架。
  accountEntry: {
    width: 430,
    height: 46,
    // 账号条在 brandEntry 容器内部的 y 位置。
    // 正值越大，账号条越往上。
    portraitY: 34,
    landscapeY: 34,
  },
  // 账号选择弹层（点击账号条后出现的面板）尺寸。
  accountModal: {
    width: 360,
    height: 220,
  },
  // 弹层内部两个选项按钮的尺寸和上下位置。
  // defaultY 越大越靠上，otherY 越小越靠下。
  accountOption: {
    width: 248,
    height: 56,
    defaultY: 34,
    otherY: -38,
  },
  // 身份选择页（学生 / 家长）整体区域。
  roleSelect: {
    width: 280,
    height: 160,
    portraitY: -148,
    landscapeY: -54,
  },
  // 返回按钮尺寸与位置。
  // 这里是“整页返回按钮”的位置，不属于登录面板内部。
  backButton: {
    width: 116,
    height: 44,
    portraitX: -152,
    portraitY: 206,
    landscapeX: -250,
    landscapeY: 154,
  },
  // panel.initialWidth / initialHeight 目前更像是历史保留参数。
  // 现在主布局更多是由 LOGIN_LAYOUT 里的 panel 控制。
  // 先保留，后续如果确认不再用，可以再清理。
  panel: {
    initialWidth: 430,
    initialHeight: 430,
  },
  // 输入区整体容器尺寸。
  //
  // loginHeight / registerHeight
  // - 登录态只需要账号 + 密码，所以更矮
  // - 注册态多了“确认密码”，所以更高
  //
  // loginOffsetY / registerOffsetY
  // - 控制整个输入区在面板里的上下位置
  // - 正值越大，整体越往上
  inputArea: {
    width: 356,
    loginHeight: 150,
    registerHeight: 224,
    loginOffsetY: 36,
    registerOffsetY: 70,
  },
  // 按钮行容器。
  //
  // 这里控制的是按钮组整体，不是单个按钮。
  // loginX / registerX / parentRegisterX 是按钮相对按钮行中心点的位置。
  // 负值往左，正值往右。
  buttonRow: {
    width: 320,
    height: 72,
    // offsetY 越小（越负），整组按钮越往下。
    offsetY: -92,
    loginX: -72,
    registerX: 72,
    parentRegisterX: 72,
  },
  // 单个输入框的尺寸和纵向排布。
  //
  // loginUsernameY / loginPasswordY
  // - 登录模式下两个输入框的位置
  //
  // registerUsernameY / registerPasswordY / registerConfirmY
  // - 注册模式下三个输入框的位置
  //
  // 这些值越大，输入框越往上。
  inputs: {
    width: 336,
    height: 58,
    loginUsernameY: 34,
    loginPasswordY: -40,
    registerUsernameY: 72,
    registerPasswordY: -2,
    registerConfirmY: -76,
  },
  // 登录 / 注册按钮的统一尺寸。
  // 这里改的是“单个按钮”的大小。
  buttons: {
    width: 118,
    height: 54,
  },
  // 入口流程按钮（开始进入、学生、家长）统一尺寸。
  //
  // brandEntryY: “进入”按钮在品牌入口里的位置
  // childY / parentY: 学生 / 家长按钮在角色选择页里的位置
  flowButtons: {
    width: 228,
    height: 58,
    brandEntryY: -34,
    childY: 36,
    parentY: -36,
  },
  // 状态区容器。
  //
  // 它承载的是 StatusLabel 和 LoadingNode 的父区域。
  // formOffsetY 越小（越负），状态区越往面板下方走。
  statusArea: {
    width: 360,
    height: 76,
    formOffsetY: -166,
  },
  // 状态文案本身的可用宽高。
  // 如果你觉得错误提示显示不下，优先加大这里的 width。
  statusText: {
    width: 328,
    height: 34,
  },
  // loading 文案区域大小。
  // offsetY 为负表示它显示在状态文案下方。
  loadingText: {
    width: 220,
    height: 24,
    offsetY: -26,
  },
} as const;

// LOGIN_THEME 统一管理 Login 页运行时绘制使用的颜色。
//
// 推荐理解方式：
// - logo: logo 区相关颜色
// - panel: 登录面板相关颜色
// - input: 输入框相关颜色
// - button: 按钮相关颜色
// - loading / status: 文案颜色
//
// RGBA 最后一个值是透明度 alpha：
// - 255 = 完全不透明
// - 0 = 完全透明
// - 想让某层更轻，就优先调 alpha，而不是急着改 RGB
export const LOGIN_THEME = {
  logo: {
    // 占位 logo 小徽章的阴影。
    badgeShadow: [17, 28, 46, 24] as Rgba,
    // 占位 logo 徽章本体颜色。
    badgeFill: [255, 255, 255, 186] as Rgba,
    // 徽章描边。
    badgeStroke: [133, 182, 236, 94] as Rgba,
    // 占位 logo 小脸和耳朵颜色。
    iconFace: [242, 151, 82, 188] as Rgba,
    iconEarLeft: [242, 151, 82, 172] as Rgba,
    iconEarRight: [242, 151, 82, 140] as Rgba,
    // logo 标题和副标题颜色。
    title: [248, 250, 255, 255] as Rgba,
    subtitle: [223, 233, 246, 224] as Rgba,
  },
  panel: {
    // 登录卡片外阴影。
    shadow: [6, 12, 20, 64] as Rgba,
    // 竖屏 / 横屏主体填充色。
    fillPortrait: [26, 38, 58, 194] as Rgba,
    fillLandscape: [26, 38, 58, 188] as Rgba,
    // 面板描边。
    stroke: [152, 197, 245, 74] as Rgba,
    // 卡片内部提亮。
    innerGlow: [255, 255, 255, 18] as Rgba,
    // 顶部浅高光。
    topSheen: [255, 255, 255, 14] as Rgba,
  },
  input: {
    // 输入框阴影、填充、描边和顶部高光。
    shadow: [12, 20, 34, 34] as Rgba,
    fill: [248, 250, 255, 236] as Rgba,
    stroke: [152, 182, 223, 132] as Rgba,
    highlight: [255, 255, 255, 46] as Rgba,
    // 输入文字和 placeholder 颜色。
    text: [61, 82, 112, 255] as Rgba,
    placeholder: [144, 159, 185, 210] as Rgba,
  },
  button: {
    // 主按钮 / 次按钮阴影颜色。
    shadowPrimary: [12, 35, 24, 48] as Rgba,
    shadowSecondary: [19, 32, 51, 28] as Rgba,
    // 主按钮 / 次按钮主体填充颜色。
    fillPrimary: [72, 202, 134, 255] as Rgba,
    fillSecondary: [251, 252, 255, 236] as Rgba,
    // 主按钮 / 次按钮描边颜色。
    strokePrimary: [176, 242, 202, 74] as Rgba,
    strokeSecondary: [115, 170, 226, 94] as Rgba,
    // 顶部高光。
    glossPrimary: [255, 255, 255, 28] as Rgba,
    glossSecondary: [255, 255, 255, 40] as Rgba,
    // 文案颜色。
    textPrimary: [255, 255, 255, 255] as Rgba,
    textSecondary: [57, 107, 170, 255] as Rgba,
  },
  loading: {
    // loading 文案颜色。
    text: [221, 229, 239, 190] as Rgba,
  },
  status: {
    // 状态文案三种语义颜色。
    // success 用于成功
    // error 用于失败
    // neutral 用于普通提示
    success: [86, 205, 134, 255] as Rgba,
    error: [255, 125, 125, 255] as Rgba,
    neutral: [235, 239, 244, 255] as Rgba,
  },
} as const;

// 把 [r, g, b, a] 数组转成 Cocos 的 Color。
// 平时你不需要改这个函数，除非整个颜色配置的表达方式要换。
export function themeColor(value: Rgba): Color {
  return new Color(value[0], value[1], value[2], value[3]);
}
