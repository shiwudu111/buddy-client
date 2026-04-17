# 客户端 UI 固化方案 V1.0

## 文档信息
- **整理时间**：2026-04-03
- **适用阶段**：MVP 联调期后半段
- **适用对象**：客户端、测试、打开 Cocos Creator 的执行同学

## 一、目标
当前客户端已经完成学生端与家长端主链路联调，下一阶段 UI 工作目标不再是“继续用运行时代码快速拼界面”，而是把已经稳定的区域逐步固化为场景节点和可维护的界面结构。

本轮 UI 固化目标：
- 保持现有主链路可用，不破坏已通过联调结果
- 逐步减少 `MainController` / `RuntimeUI` 对整页运行时拼装的依赖
- 让后续样式调整、节点挂载、测试定位更直观

## 二、总体策略
当前建议采用：**静态场景 + 运行时兜底的混合方案**

具体原则：
1. 先固化稳定区域，不一次性推翻现有运行时 UI。
2. 场景中已有稳定节点时，优先复用静态节点。
3. 尚未固化的区域，继续保留运行时创建逻辑，保证主链路不掉。
4. 不在当前阶段追求复杂动效和美术细节，先把结构固化、交互稳定、节点可维护做好。

### 当前代码约束
在开始固化 `Main.scene` 之前，必须先理解当前代码限制：
- `MainController` 仍通过 `ensureManagedRoot("MainRoot")` 获取运行时根节点
- 每次渲染时都会执行 `RuntimeUI.clear(root)` 清空整个 `MainRoot`

这意味着：
- **任何直接挂在 `MainRoot` 下的静态节点，当前都会在运行时被清掉**
- 所以 `Main.scene` 的静态标题、顶部按钮、学生端容器、家长端容器，当前**不能直接放在会被清空的 `MainRoot` 下**

执行上必须二选一：
1. 先把要固化的静态节点放在 `MainRoot` 外层，由控制器查找并复用这些节点
2. 先改 `MainController`，让它不再对整棵 `MainRoot` 做无差别清空，再开始把静态节点放回对应容器

在没有完成上述任一前置调整前，不应直接推进 `Main.scene` 的静态节点固化。

## 三、固化优先级

### P0：优先固化
1. `Login.scene`
   - 账号输入框
   - 密码输入框
   - 登录按钮
   - 注册并登录按钮
   - 状态提示区
   - 加载提示区

2. `Main.scene` 顶部公共区域
   - 标题
   - 当前账号
   - 刷新按钮
   - 退出登录按钮
   - 页面消息提示区

3. 学生端一级结构
   - 宠物总览页签
   - 作业中心页签
   - 左侧主卡片容器
   - 右侧信息容器

4. 家长端一级结构
   - 左侧绑定区
   - 右侧“孩子状态与今日作业”区
   - 右侧“本周周报”区

### P1：第二步固化
1. 学生端宠物区按钮与信息块
2. 学生端作业中心输入区与历史区
3. 家长端绑定输入区内部结构
4. 家长端滚动区域容器

### P2：后续固化
1. 统一字体、边距、颜色变量
2. 按钮状态视觉
3. 更正式的 prefab 拆分

## 四、当前不建议立刻做的事
- 不建议现在重做整套视觉风格
- 不建议现在拆太多 prefab，避免把联调中的页面结构切得太碎
- 不建议先做复杂动画
- 不建议直接删除所有运行时 UI 代码

## 五、场景节点约定

### 1. Login.scene 节点约定
建议保留并固定以下节点名：
- `UsernameInput`
- `PasswordInput`
- `LoginButton`
- `RegisterButton`
- `StatusLabel`
- `LoadingNode`

要求：
- `UsernameInput` / `PasswordInput` 为 `EditBox`
- `LoginButton` / `RegisterButton` 为 `Button`
- `StatusLabel` 为纯展示节点，不可输入
- `LoadingNode` 为纯展示节点，不可输入

### 2. Main.scene 顶部公共区节点约定
建议固化以下节点：
- `HeaderTitle`
- `HeaderAccount`
- `HeaderRefreshButton`
- `HeaderLogoutButton`
- `PageMessage`

要求：
- 所有顶部操作固定在静态层
- 不再每次渲染都从零创建

当前运行时节点名与目标静态节点名映射：

| 当前运行时节点名 | 建议目标静态节点名 | 说明 |
|------|------|------|
| `Title` | `HeaderTitle` | 页面主标题 |
| `Subtitle` | `HeaderAccount` | 当前账号信息 |
| `RefreshAction` | `HeaderRefreshButton` | 刷新按钮 |
| `LogoutAction` | `HeaderLogoutButton` | 退出登录按钮 |
| `PageMessage` | `PageMessage` | 页面提示区，可保持不变 |

执行要求：
- 固化时不能只在场景里新增 `HeaderTitle / HeaderAccount / HeaderRefreshButton / HeaderLogoutButton`
- 必须同步确定以下其中一种收口方式：
  1. 控制器改为优先查找并复用新静态节点
  2. 目标静态节点直接沿用当前运行时节点名，避免过渡期出现双套命名

在未完成上述任一项前，不应判定顶部公共区固化完成。

### 3. Main.scene 学生端结构约定
建议固化以下容器节点：
- `ChildTabBar`
- `OverviewTabButton`
- `HomeworkTabButton`
- `ChildOverviewPanel`
- `HomeworkPanel`
- `PetCard`
- `ChildSideCard`
- `HomeworkCard`
- `HomeworkHistoryCard`

说明：
- 当前学生端现态仍由 `renderChildTabs`、`renderChildOverview`、`renderHomeworkTab` 在运行时创建
- 若要固化为场景节点，必须先明确旧运行时容器节点是否继续沿用原名，还是改为静态容器名后同步修改控制器查找逻辑
- 不能只在场景中摆出一套新容器而不修改控制器，否则运行时仍会生成另一套旧节点

当前运行时节点名与目标静态节点名映射：

| 当前运行时节点名 | 建议目标静态节点名 | 说明 |
|------|------|------|
| `OverviewTab` | `OverviewTabButton` | 宠物总览页签按钮 |
| `HomeworkTab` | `HomeworkTabButton` | 作业中心页签按钮 |
| `PetCard` | `PetCard` | 可直接沿用 |
| `SideCard` | `ChildSideCard` | 学生端右侧信息区 |
| `CreatePetButton` | `CreatePetButton` | 可直接沿用 |
| `FeedPetButton` | `FeedPetButton` | 可直接沿用 |
| `OpenHomeworkButton` | `OpenHomeworkButton` | 可直接沿用 |
| `HomeworkCard` | `HomeworkCard` | 可直接沿用 |
| `HomeworkHistoryCard` | `HomeworkHistoryCard` | 可直接沿用 |
| `SubmitHomeworkButton` | `SubmitHomeworkButton` | 可直接沿用 |
| `BackOverviewButton` | `BackOverviewButton` | 可直接沿用 |

执行要求：
- 如果学生端第一阶段准备引入 `OverviewTabButton / HomeworkTabButton / ChildSideCard` 这类新静态节点名，必须同步修改 `MainController` 对应查找和复用逻辑
- 如果控制器暂未开始找静态节点，建议第一阶段继续沿用当前运行时节点名，先完成“静态节点真正接管交互”，再统一改名
- `renderChildTabs`、`renderChildOverview`、`renderHomeworkTab` 涉及的旧运行时节点，必须明确收口条件，避免场景中已有静态节点时运行时又再生成一套
- 只有当学生端页签、左右主容器、作业区容器都由场景静态节点承载，且旧运行时节点不再重复生成时，才可判定学生端一级容器固化完成

### 4. Main.scene 家长端结构约定
建议固化以下容器节点：
- `ParentBindCard`
- `ParentStatusCard`
- `ParentReportCard`
- `ChildBindInput`
- `BindChildButton`
- `ChildBindStatus`
- `ParentOverviewScroll`
- `WeeklySummaryScroll`

说明：
- 当前家长端右侧已确定为上下分区版
- “孩子状态与今日作业”和“本周周报”继续保留滚动结构

当前运行时节点名与目标静态节点名映射：

| 当前运行时节点名 | 建议目标静态节点名 | 说明 |
|------|------|------|
| `ParentBindCard` | `ParentBindCard` | 可直接沿用 |
| `ParentStatusCard` | `ParentStatusCard` | 可直接沿用 |
| `ParentReportCard` | `ParentReportCard` | 可直接沿用 |
| `ChildBindInput` | `ChildBindInput` | 可直接沿用 |
| `BindChildButton` | `BindChildButton` | 可直接沿用 |
| `ChildIdLabel` | `ChildBindStatus` | 绑定结果提示区 |
| `ParentOverview` | `ParentOverviewScroll` | 孩子状态与今日作业滚动区 |
| `WeeklySummary` | `WeeklySummaryScroll` | 周报滚动区 |

执行要求：
- `ChildIdLabel / ParentOverview / WeeklySummary` 如果改名为新的静态节点名，必须同步修改控制器查找与写入逻辑
- 若控制器暂未改造，建议在第一阶段继续沿用当前运行时节点名，避免先固化出一套不会被脚本使用的新节点
- 只有当旧运行时节点不再重复生成、场景静态节点成为唯一实际承载节点时，才算固化完成

## 六、推荐执行顺序

### 第一步：固化 Login.scene
目标：
- 登录页不再依赖运行时代码补按钮和提示节点
- 所有基础交互节点在场景中可见、可选中、可调整

完成标准：
- `LoginController` 只负责事件和状态，不再补 UI 主体结构

### 第二步：处理 Main.scene 的 MainRoot 约束
目标：
- 明确 `MainRoot` 只作为运行时容器，还是改造成“静态节点 + 动态子节点共存”的结构
- 避免后续刚固化的静态节点被 `RuntimeUI.clear(root)` 再次销毁

完成标准：
- 至少完成以下任一项：
  - 静态节点统一移出 `MainRoot`，控制器改为查找并复用
  - `MainController` 改为只清理动态子容器，不再整棵清空 `MainRoot`

### 第三步：固化 Main.scene 顶部公共区
目标：
- 标题、账号、刷新、退出、提示区固定在场景中

完成标准：
- 这些节点不再由 `RuntimeUI` 在每次渲染时重建
- 控制器已开始复用场景静态节点，而不是继续创建旧运行时节点

### 第四步：固化 Main.scene 的学生端 / 家长端大容器
目标：
- 场景中有明确的静态布局框架
- 控制器只负责填充数据和切换显示

完成标准：
- `MainController` 开始从“整页生成器”向“容器驱动器”收敛
- 对应区域不再出现“场景里一套静态节点 + 运行时再生成一套旧节点”的双套结构

### 第五步：逐步固化内部控件
目标：
- 输入框、按钮、信息块逐步进入场景或 prefab
- 运行时 UI 只保留补位或兜底能力

## 七、代码改造建议

### 1. 保留 RuntimeUI，但角色收缩
`RuntimeUI` 当前不应立即删除，建议收缩成：
- 调试态兜底
- 尚未固化区域的临时创建工具
- 小型组件工厂

### 2. MainController 逐步改为“找节点 + 填数据”
当前 `MainController` 还承担了大量整页创建职责。
UI 固化后建议逐步改成：
- 查找已有节点
- 绑定按钮事件
- 切换容器显隐
- 填充文本与状态

在 `Main.scene` 固化阶段，优先改这两点：
- 不再整棵清空 `MainRoot`
- 把 `MainRoot` 切成“静态层 + 动态层”或“外层静态节点 + 内层动态容器”

### 3. 滚动区继续保留脚本能力
家长端当前滚动区已可用，后续即使做场景固化，也建议保留脚本层对滚动文本的装配能力，避免每次改字段都得进场景重配。

## 八、执行注意事项
- `scene / prefab / meta` 一律通过 Cocos Creator 修改
- 不手工改 `__type__ / __id__ / uuid` 等内部序列化字段
- 每次固化一块区域后，立刻做一次最小冒烟
- 不要一边大改布局，一边同时改接口逻辑

## 九、验收标准
满足以下条件，可认为 UI 固化第一阶段完成：
1. `Login.scene` 基础登录区已静态化
2. `Main.scene` 顶部公共区已静态化
3. 学生端与家长端至少完成一级容器固化
4. 现有主链路回归结果不低于当前基线
5. 运行时 UI 代码未被一次性粗暴移除

补充验收要求：
6. 静态按钮、输入框、滚动区必须是**实际承载交互的节点**，而不是仅存在于场景中的摆设节点
7. 固化区域对应的旧运行时节点不再重复生成，或控制器已明确改为优先复用静态节点
8. 在 Creator 层级面板中可明确看到当前正在工作的节点，不存在“场景一套、运行时另一套”的双套结构

## 十、当前阶段建议结论
当前应先做：
- Login.scene 固化
- 先处理 MainRoot 约束
- Main.scene 顶部公共区固化
- 学生端 / 家长端一级容器固化

当前暂缓：
- 大规模 prefab 化
- 样式精修
- 动效与视觉升级

这样可以在不打断联调节奏的前提下，把客户端从“运行时拼 UI”稳步推进到“场景结构可维护”的状态。
