# Login.scene 可固化版结构 V1.0

## 目标

把当前“运行时验证版前景”推进到“可固化版结构”。

这里的“可固化”不是指登录页已经完全改成场景静态资源，而是指：

- 控制器已经有稳定的结构槽位可以复用
- 后续把节点沉到 `Login.scene` 时，不会和当前运行时代码互相打架
- 固化工作可以按区域逐步替换，而不是一次性推翻

## 当前结构口径

当前登录页建议统一收敛到下面这套结构：

```text
Canvas
└── LoginPage
    ├── BackgroundLayer
    │   ├── BgGradient
    │   ├── AmbientShapes
    │   ├── FoxVisualPortrait
    │   └── FoxVisualLandscape
    └── ContentLayer
        ├── LogoArea
        │   ├── MascotBadgeShadow
        │   ├── MascotBadge
        │   ├── TitleLabel
        │   └── SubtitleLabel
        ├── LoginPanel
        │   ├── PanelShadow
        │   ├── PanelChrome
        │   ├── PanelInnerGlow
        │   ├── PanelTopSheen
        │   ├── InputArea
        │   │   ├── UsernameInput
        │   │   └── PasswordInput
        │   └── ButtonRow
        │       ├── LoginButton
        │       └── RegisterButton
        └── StatusArea
            ├── StatusLabel
            └── LoadingNode
```

## 这版新增的结构槽位

为了支持后续固化，这轮已经把下面 3 个结构槽位固定下来了：

- `InputArea`
- `ButtonRow`
- `StatusArea`

含义如下：

- `InputArea`
  - 只承载账号输入框和密码输入框
  - 后续如果把输入框样式沉到场景里，就直接落在这里

- `ButtonRow`
  - 只承载登录按钮和注册按钮
  - 后续按钮 prefab / 静态节点可以直接替换这里

- `StatusArea`
  - 只承载底部提示信息和 loading 提示
  - 保证它继续在卡片外，不和 `LoginPanel` 混在一起

## 控制器当前职责

当前 [LoginController.ts](/E:/buddy-client/assets/scripts/ui/login/LoginController.ts) 的职责是：

- 优先查找并复用这些固定节点
- 场景里没有时，才兜底创建
- 负责布局、状态切换、登录/注册提交

它现在不应该再被理解成“整页任意拼 UI 的 builder”。

更准确的定位是：

**结构驱动的过渡控制器**

## 静态样式接管规则

为了避免后续场景静态节点和运行时样式继续打架，当前控制器新增了一个接管约定：

- 如果某个前景节点下存在名为 `SceneStyled` 的子节点
- 或者该节点下已经存在非运行时管理的静态样式子节点

控制器就会：

- 继续负责布局和交互绑定
- 但不再主动关闭该节点现有的 `Sprite / Graphics`
- 也不再继续注入运行时 `ChromeBackground / StatusText / LoadingText` 这一套样式子节点

适用范围：

- `UsernameInput`
- `PasswordInput`
- `LoginButton`
- `RegisterButton`
- `StatusLabel`
- `LoadingNode`

这意味着后续同学在 `Login.scene` 里正式沉输入框底板、按钮底板、状态区样式时，可以通过静态子节点平滑接管，而不需要先删控制器逻辑。

## 后续固化时的执行规则

### 1. 优先往固定槽位里沉节点

如果后续同学要在 `Login.scene` 里做静态化，应该优先把节点落到下面这些容器里：

- `LogoArea`
- `LoginPanel`
- `InputArea`
- `ButtonRow`
- `StatusArea`

不要重新发明第二套名字。

### 2. 不要把状态区再塞回卡片里

当前产品口径已经确定：

- `StatusLabel` 在卡片外
- 接近页面底部
- 只显示文字

所以后续固化时，不要再把状态提示做回 `LoginPanel` 内部。

### 3. 背景和前景继续分治

背景层只负责：

- 渐变
- 光斑
- 狐狸背景

前景层只负责：

- Logo
- 登录卡片
- 输入框
- 按钮
- 状态提示

后续即使狐狸改成正式 `Sprite`，也不要把它挪回前景层。

## 当前还没有完全固化的部分

这轮结构已经趋稳，但以下内容仍属于“过渡实现”：

- `LogoArea` 的徽章和图形还是代码画出来的
- `LoginPanel` 的卡片、输入框、按钮底板仍是运行时绘制
- 狐狸背景仍是 `Graphics`

也就是说：

**结构已经开始可固化，资源还没有完全静态化。**

## 后续建议的固化顺序

### 第一阶段

- 在 `Login.scene` 中补齐：
  - `LoginPage`
  - `ContentLayer`
  - `LogoArea`
  - `LoginPanel`
  - `InputArea`
  - `ButtonRow`
  - `StatusArea`

目标：
- 先把容器结构沉下去
- 不急着一次性把所有视觉都变成静态资源

### 第二阶段

- 固化 `LogoArea`
- 固化 `LoginPanel` 外框
- 固化输入框底板和按钮底板

目标：
- 控制器继续复用这些静态节点
- 运行时绘制逐步减少

### 第三阶段

- 狐狸背景替换为正式 `Sprite`
- 渐变和光斑换成更正式的资源方案
- loading 和状态提示改成最终版

## 当前验收标准

达到下面几点，就算已经从“纯验证版”推进到了“可固化版结构”：

- 结构槽位明确：`LogoArea / LoginPanel / InputArea / ButtonRow / StatusArea`
- 输入框、按钮、状态提示不再散挂
- 横屏 / 竖屏下结构关系稳定
- 控制器能复用这些结构槽位
- 后续静态化工作可以按块替换，而不是整页推翻

## 当前不建议做的事

- 不建议现在就把整个登录页一次性改成纯场景静态版
- 不建议继续大改背景布局逻辑
- 不建议在没有正式资源前，提前过度拆 prefab

当前更稳的方式是：

**先把结构固定，再逐步把运行时绘制替换成正式资源。**
