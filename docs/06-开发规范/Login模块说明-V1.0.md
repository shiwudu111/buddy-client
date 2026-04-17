# Login模块说明-V1.0

## 文档定位
- **编写时间**：2026-04-09
- **适用仓库**：`buddy-client`
- **适用模块**：`assets/scripts/ui/login`
- **文档目的**：说明登录页当前代码结构、运行流程、关键约定与后续维护边界

## 一、模块目标
Login 模块负责客户端登录页的完整运行链路，包括：

1. 登录与注册交互
2. 恢复已有登录态
3. 登录页响应式布局与样式刷新
4. 登录页背景、Logo 与表单视觉构建
5. 登录成功后的主场景跳转

当前实现目标不是只保证“页面能跑”，而是将登录流程、布局编排、场景结构和视觉样式拆分开，降低后续联调、改样式和重构时的维护成本。

## 二、核心文件分工

### 1. 控制器层
- `assets/scripts/ui/login/LoginController.ts`
  - 登录页入口控制器
  - 负责页面生命周期、节点引用解析、按钮绑定、loading 开关、状态渲染、场景切换
  - 当前应尽量保持为“薄控制器”，不继续累积认证细节和布局细节

### 2. 认证协调层
- `assets/scripts/ui/login/LoginAuthCoordinator.ts`
  - 负责登录、注册、恢复会话
  - 统一产出 `LoginStatusState`
  - 负责重复提交保护与恢复会话并发保护
  - 当前是 Login 模块中最适合继续增强测试性的层

### 3. 流程协调层
- `assets/scripts/ui/login/LoginFlowCoordinator.ts`
  - 负责 `restore / brandEntry / roleSelect / authForm` 的流程迁移
  - 统一维护 `role / mode / step`
  - 当前应承接返回规则与模式切换，避免在控制器里散落流程分支

### 4. 账号与反馈辅助层
- `assets/scripts/ui/login/LoginAccountStore.ts`
  - 负责默认账号信息的读取与记忆
  - 只保存登录入口层需要的最小账号信息，不承担会话恢复
- `assets/scripts/ui/login/LoginFeedbackPresenter.ts`
  - 负责状态文案渲染与 loading 态禁用逻辑
  - 避免 `LoginController` 再直接操作 `Label` 与交互组件细节
- `assets/scripts/ui/login/LoginResolutionCoordinator.ts`
  - 负责登录页分辨率切换与恢复
  - 将页面分辨率逻辑从控制器中抽离
- `assets/scripts/ui/login/LoginSceneRefs.ts`
  - 负责统一解析登录页必需节点和组件
  - 将场景缺失报错、引用装配与控制器解耦

### 5. 布局编排层
- `assets/scripts/ui/login/LoginViewOrchestrator.ts`
  - 负责确保登录页运行时层级存在
  - 负责接收布局计算结果并应用到真实节点
  - 负责触发背景构建、Logo 加载和控件样式刷新

### 6. 纯布局计算层
- `assets/scripts/ui/login/LoginLayoutCalculator.ts`
  - 负责根据当前视口尺寸计算登录页布局结果
  - 不直接操作节点，便于后续测试与复用
  - 当前是响应式布局规则的单一计算入口

### 7. 场景结构层
- `assets/scripts/ui/login/LoginSceneStructure.ts`
  - 负责查找 Canvas、查找节点、确保 `LoginPage / BackgroundLayer / ContentLayer` 及表单层级骨架存在
  - 尽量只处理结构，不承担视觉和业务逻辑

### 8. 场景契约层
- `assets/scripts/ui/login/LoginSceneContract.ts`
  - 负责集中定义登录页关键节点名与缺失报错格式
  - 让场景结构与引用解析共享同一套约束

### 9. 视觉样式层
- `assets/scripts/ui/login/LoginVisualStyler.ts`
  - 负责 Logo、Panel、Input、Button、Status、Loading 的视觉装饰
  - 当前体量仍偏大，后续优先考虑继续拆为更细的样式子模块

### 10. 背景构建层
- `assets/scripts/ui/login/LoginBackgroundBuilder.ts`
  - 负责登录页背景渐变、森林背景图、环境光效的绘制
  - 背景视口计算已复用布局指标，避免再次散落一套尺寸逻辑

### 11. 配置层
- `assets/scripts/ui/login/LoginViewConfig.ts`
  - 负责集中管理布局参数、运行时尺寸参数与主题色
  - 修改视觉和尺寸时优先改这里，不优先改控制器逻辑

## 三、页面运行流程

### 1. 页面加载
`LoginController` 在 `onLoad()` 中完成：

1. 记录并切换设计分辨率
2. 解析场景中的输入框、按钮、状态节点
3. 绑定按钮点击事件
4. 初始化 `LoginViewOrchestrator`
5. 首次刷新响应式视图
6. 监听 `canvas-resize`

### 2. 页面首帧启动
`start()` 中执行：

1. 初始化空闲状态
2. 尝试恢复已有登录态

若存在已保存会话，则由 `LoginAuthCoordinator` 执行恢复流程；恢复成功后回到账号入口并带上可续用账号，用户点击“进入”后再进入主场景；无会话或恢复失败则停留在账号入口。

### 3. 用户点击登录或注册
点击事件由 `LoginController` 交给 `LoginAuthCoordinator`：

1. 协调层先做基础输入校验
2. 协调层进入 pending 状态并回推给 UI
3. 调用 `authService.login()` 或 `authService.register()`
4. 返回统一的 `LoginAuthOutcome`
5. 控制器根据结果更新文案、loading 与场景跳转

### 4. 页面布局刷新
每次页面初始化、窗口尺寸变化、Logo 资源到达时：

1. `LoginViewOrchestrator` 获取当前视口尺寸
2. `LoginLayoutCalculator` 计算布局结果
3. 编排器将结果应用到节点
4. 背景与控件样式同步刷新

## 四、关键状态约定

### 1. 状态对象
当前登录状态使用 `LoginStatusState` 表达，而不是只传裸字符串。

状态对象包含：
- `key`：状态标识
- `message`：显示给用户的文案
- `tone`：状态语义，当前为 `neutral / success / error`

这样做的目的：
- 避免通过文案关键字反推颜色
- 避免样式逻辑绑定中文文本
- 为后续测试、国际化、埋点扩展留出口

### 2. 加载状态
进入 pending 时：
- 登录按钮禁用
- 注册按钮禁用
- 用户名输入框禁用
- 密码输入框禁用
- `LoadingNode` 显示

退出 pending 时，上述状态恢复。

## 五、关键节点约定
当前登录页依赖以下场景节点存在：

- `StartButton`
- `AccountEntryButton`
- `AccountModalMask`
- `AccountModalPanel`
- `DefaultAccountOptionButton`
- `OtherAccountOptionButton`
- `FlowBackButton`
- `ChildRoleButton`
- `ParentRoleButton`
- `UsernameInput`
- `PasswordInput`
- `ConfirmPasswordInput`
- `LoginButton`
- `RegisterButton`
- `ParentRegisterButton`
- `StatusLabel`
- `LoadingNode`

如果这些节点缺失，`LoginController` 会将其视为场景错误，而不是继续静默补救。

当前仍存在一些运行时约定：
- `SceneStyled`
- `TEXT_LABEL`
- `PLACEHOLDER_LABEL`
- `StatusText`
- `LoadingText`

这些约定已经比早期版本更集中，但仍建议后续继续收口成统一常量，减少“魔法字符串”扩散。

## 六、维护建议

### 1. 改登录流程时
优先修改：
- `LoginAuthCoordinator.ts`
- `LoginFlowCoordinator.ts`

不要优先改：
- `LoginVisualStyler.ts`
- `LoginBackgroundBuilder.ts`

### 2. 改布局时
优先修改：
- `LoginViewConfig.ts`
- `LoginLayoutCalculator.ts`

不要优先在 `LoginViewOrchestrator.ts` 方法体里直接塞新魔法数。

### 3. 改视觉样式时
优先修改：
- `LoginViewConfig.ts`
- `LoginVisualStyler.ts`
- `LoginBackgroundBuilder.ts`

若只是颜色、尺寸、间距调整，优先从配置层入手。

### 4. 改场景节点时
先确认：
- `Login.scene` 中节点名称是否仍满足控制器与结构层约定
- 是否会影响运行时重挂载关系
- 是否会影响 `StatusLabel / LoadingNode` 的显示容器

## 七、当前已知边界
当前版本相较早期实现已经明显收敛，但仍有以下边界需要注意：

1. `LoginVisualStyler.ts` 仍偏大，后续适合拆分为 `Logo / Panel / FormControl` 三类样式器
2. 节点查找仍部分依赖名称约定，尚未完全常量化
3. 账号入口已引入“默认账号 / 其他账号”轻量分流，后续若调整入口返回规则，必须同步更新 `LoginFlowCoordinator.ts` 与状态机文档
4. 可测试性已有改善，但目前仍未形成系统化的自动化测试

## 八、建议的后续优化顺序

1. 继续拆分 `LoginVisualStyler.ts`
2. 将关键节点名称与样式标记收敛为统一常量
3. 为 `LoginAuthCoordinator.ts` 与 `LoginLayoutCalculator.ts` 补最小单元测试
4. 视 UI 固化程度，逐步减少运行时重挂载与补结构逻辑

## 九、结论
当前 Login 模块已经从“能跑的登录页实现”收敛到“具备工程分层意识的可维护实现”。

它的核心优势在于：
- 登录流程、布局、结构、视觉已分层
- 状态表达已经从字符串驱动提升为显式状态对象
- 响应式布局已具备独立计算入口

后续维护时应坚持一条原则：

**登录流程改协调层，布局改计算层，样式改样式层，控制器尽量只保留页面编排职责。**
