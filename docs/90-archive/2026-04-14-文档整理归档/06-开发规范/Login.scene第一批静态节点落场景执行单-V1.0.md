# Login.scene 第一批静态节点落场景执行单 V1.0

## 一、执行目标

把登录页从“运行时验证版前景”推进到“第一批静态节点已落场景”的状态。

这轮的目标不是一次性把登录页完全做成纯静态资源，而是先把**稳定的结构容器**沉到 `Login.scene`，让后续静态化替换有明确落点。

本轮完成后，应满足：

- `Login.scene` 里已经存在稳定的前景结构容器
- `LoginController` 能优先复用这些容器
- 后续继续替换输入框底板、按钮底板、Logo 资源时，不需要再改大结构

## 二、本轮只做什么

本轮只做“结构落场景”。

### 必做

- 在 `Login.scene` 中补齐前景结构容器
- 让这些容器命名固定
- 让它们层级固定
- 确保当前脚本仍能正常复用这些容器

### 不做

- 不在这轮强行把狐狸背景换成正式图片
- 不在这轮要求把所有运行时绘制都删掉
- 不在这轮重做登录逻辑
- 不在这轮调整后端联调逻辑

## 三、执行前原则

### 1. 只在 Creator 中操作

本轮涉及 `Login.scene`，只允许在 **Cocos Creator** 中编辑。

禁止：

- 手改 `.scene` JSON
- 手改 `.meta`
- 用脚本批量改场景引用关系

### 2. 先落结构，不先抠美术

这轮最重要的是：

- 层级关系稳定
- 节点命名稳定
- 控制器复用稳定

而不是先把视觉做到最终版。

### 3. 不要重新发明节点名

这轮必须沿用当前已经收敛的结构槽位，不能自己再起一套新名字。

## 四、本轮要落到场景的节点结构

执行同学在 `Login.scene` 中，应补齐下面这套结构。

```text
Canvas
└── LoginPage
    ├── BackgroundLayer
    └── ContentLayer
        ├── LogoArea
        ├── LoginPanel
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

## 五、每个节点怎么落

### 1. LoginPage

作用：

- 登录页总容器
- 后续背景层和前景层都收口到这里

执行要求：

- 挂在 `Canvas` 下
- 锚点保持默认中心
- 暂不挂业务脚本

### 2. BackgroundLayer

作用：

- 背景层容器
- 后续继续承接渐变、光斑、狐狸背景

执行要求：

- 挂在 `LoginPage` 下
- 层级在 `ContentLayer` 下方
- 本轮不要求把内部背景元素全部静态化

### 3. ContentLayer

作用：

- 前景总容器
- 所有可交互登录元素都归到这里

执行要求：

- 挂在 `LoginPage` 下
- 位于 `BackgroundLayer` 上方

### 4. LogoArea

作用：

- 头部 Logo 区
- 后续可逐步替换为正式图标和正式标题资源

执行要求：

- 挂在 `ContentLayer` 下
- 节点名固定为 `LogoArea`
- 本轮只要求容器存在

本轮不强制：

- 把运行时代码生成的徽章、标题、副标题全部删掉

### 5. LoginPanel

作用：

- 登录卡片外层容器

执行要求：

- 挂在 `ContentLayer` 下
- 节点名固定为 `LoginPanel`
- 本轮只要求容器存在且位置可调

### 6. InputArea

作用：

- 只承载两个输入框

执行要求：

- 挂在 `LoginPanel` 下
- 节点名固定为 `InputArea`

### 7. UsernameInput

执行要求：

- 必须挂在 `InputArea` 下
- 节点名固定为 `UsernameInput`
- 必须保留 `EditBox`

### 8. PasswordInput

执行要求：

- 必须挂在 `InputArea` 下
- 节点名固定为 `PasswordInput`
- 必须保留 `EditBox`
- 必须开启密码模式

### 9. ButtonRow

作用：

- 只承载两个按钮

执行要求：

- 挂在 `LoginPanel` 下
- 节点名固定为 `ButtonRow`

### 10. LoginButton

执行要求：

- 必须挂在 `ButtonRow` 下
- 节点名固定为 `LoginButton`
- 必须保留 `Button`

### 11. RegisterButton

执行要求：

- 必须挂在 `ButtonRow` 下
- 节点名固定为 `RegisterButton`
- 必须保留 `Button`

### 12. StatusArea

作用：

- 独立的底部状态区

执行要求：

- 挂在 `ContentLayer` 下
- 节点名固定为 `StatusArea`
- 保持在卡片外，不要塞回 `LoginPanel`

### 13. StatusLabel

执行要求：

- 必须挂在 `StatusArea` 下
- 节点名固定为 `StatusLabel`
- 本轮允许仍由控制器写入文字

### 14. LoadingNode

执行要求：

- 必须挂在 `StatusArea` 下
- 节点名固定为 `LoadingNode`
- 本轮允许仍由控制器控制显隐

## 六、静态节点接管规则

当前 [LoginController.ts](/E:/buddy-client/assets/scripts/ui/login/LoginController.ts) 已支持静态样式接管。

规则如下：

- 如果某个前景节点下存在 `SceneStyled` 子节点
- 或已经存在非运行时管理的静态样式子节点

则控制器会：

- 继续负责布局和交互绑定
- 但不再主动关闭当前节点上的 `Sprite / Graphics`
- 也不再继续注入运行时样式节点

适用节点：

- `UsernameInput`
- `PasswordInput`
- `LoginButton`
- `RegisterButton`
- `StatusLabel`
- `LoadingNode`

### 本轮怎么用这条规则

本轮可以先不加 `SceneStyled`。

原因：

- 当前还是第一批结构节点落场景
- 还没进入正式静态样式接管阶段

等后续开始把输入框底板、按钮底板、状态区样式真正沉到场景里时，再使用这条接管规则。

## 七、推荐执行顺序

### 第一步

在 `Canvas` 下建立：

- `LoginPage`
- `BackgroundLayer`
- `ContentLayer`

### 第二步

在 `ContentLayer` 下建立：

- `LogoArea`
- `LoginPanel`
- `StatusArea`

### 第三步

在 `LoginPanel` 下建立：

- `InputArea`
- `ButtonRow`

### 第四步

把现有功能节点移动到对应容器：

- `UsernameInput` -> `InputArea`
- `PasswordInput` -> `InputArea`
- `LoginButton` -> `ButtonRow`
- `RegisterButton` -> `ButtonRow`
- `StatusLabel` -> `StatusArea`
- `LoadingNode` -> `StatusArea`

### 第五步

保存场景后，重新预览，检查当前脚本是否仍正常工作。

## 八、本轮完成后的验收标准

完成后，至少要确认下面这些点：

### 结构验收

- `LoginPage` 已存在
- `ContentLayer` 已存在
- `LogoArea` 已存在
- `LoginPanel` 已存在
- `InputArea` 已存在
- `ButtonRow` 已存在
- `StatusArea` 已存在

### 归属验收

- `UsernameInput` / `PasswordInput` 已归到 `InputArea`
- `LoginButton` / `RegisterButton` 已归到 `ButtonRow`
- `StatusLabel` / `LoadingNode` 已归到 `StatusArea`

### 功能验收

- 登录页能正常打开
- 横屏 / 竖屏下布局不炸
- 输入框仍可输入
- 登录 / 注册按钮仍可点击
- 状态提示仍能显示

## 九、本轮完成后不要误判的事

完成这轮后，可以说：

- `Login.scene` 已进入可固化版结构
- 登录页第一批静态节点已落场景

但还不能说：

- `Login.scene` 已完全固化完成
- 登录页已完全去掉运行时代码绘制

## 十、下一轮建议

等这轮场景结构落完，再继续做第二轮：

- 把 `LogoArea` 的视觉资源逐步沉到场景
- 把 `LoginPanel` 外框逐步沉到场景
- 把输入框底板和按钮底板逐步沉到场景
- 最后再替换狐狸背景为正式 `Sprite`
