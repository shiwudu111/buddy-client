# PLAN.md

## Current Status

- 上一轮 Main 相关计划已归档：`docs/90-archive/2026-05-11-main-v1-plan/PLAN.md`。
- 已收口内容包括：登录、学生端 Main、宠物状态真实接入、互动按钮、互动日志、离线状态衰减、背包食物使用闭环、日记最小闭环 V1。
- 学习任务奖励接入 V1 已完成客户端最终验收：提交作业奖励、背包库存刷新、奖励粮食使用、pet 状态刷新、日记 logs 联动均已通过。

## Today

真实时间与宠物生命感 V1：Main 狐狸精灵图待机表现。

### Scope

- 使用 `assets/resources/ui/main/fox` 下的 `pet_idle_default` / `pet_idle_show` 精灵图替换 Main 舞台旧小狐狸静态图。
- Main 打开后进入默认待机状态；无操作超过阈值后播放一次待机表演；播放完成后回到默认待机状态。
- 小狐狸大小、位置参数继续暴露在调参页，并将语义切换为精灵图大小和位置。
- 正式宠物数值、库存、离线衰减、作业奖励、日记仍以后端 pet 快照和既有接口为准。
- 背包、日记、作业奖励、每日基础粮食、timeContext 表现层必须保持原有行为。

### Files Allowed

- `PLAN.md`
- `assets/scripts/ui/main/MainController.ts`

### Out Of Scope

- 不修改后端代码、数据库迁移、后端测试或后端业务逻辑。
- 不因后端阻塞伪造 `timeContext`、`returnGreeting`、库存、奖励、日记或 pet 正式状态。
- 不改 Login / Chat / Parent 主流程。
- 不改背包 `/inventory/use` 调用主逻辑。
- 不改日记归一化主逻辑，不写 `mainEvents / diaryDays / backend logs`。
- 不改离线状态衰减、每日基础粮食、作业奖励平衡。
- 不接入 `bath / wash / clean`，不实现完整 AI 聊天或复杂作息系统。
- 不新增复杂骨骼动画系统；本轮只使用现有 plist 精灵帧。

### Milestones

1. [x] 更新本轮 `Today` scope、允许文件、验收标准和边界。
2. [x] 加载 `pet_idle_default` / `pet_idle_show` SpriteAtlas，并保留旧静态图兜底。
3. [x] 实现默认待机循环、无操作计时、待机表演播放一次后回默认待机。
4. [x] 将调参页“小狐狸”参数语义切换为精灵图大小和位置。
5. [x] 运行 TypeScript 验证并记录客户端验收状态。

### Validation

- 本轮客户端改动完成后运行：`.\node_modules\.bin\tsc.cmd --noEmit`
- 手动验收：
  - Main 打开后默认展示 `pet_idle_default` 待机精灵图。
  - 无操作超过阈值后切换到 `pet_idle_show` 待机表演。
  - `pet_idle_show` 播放完成后回到 `pet_idle_default` 待机。
  - 点击底部动作、切换页签、选择口粮等用户操作会重置无操作计时。
  - 调参页“小狐狸”大小和位置参数能影响新精灵图，不再只针对旧静态图。
  - timeContext 气泡、action feedback、背包、日记、作业奖励、每日基础粮食原验收路径不回归。

### Client Acceptance Status

- [x] `.\node_modules\.bin\tsc.cmd --noEmit` 通过。
- [x] Main 已使用 fox 目录精灵图作为默认待机展示。
- [x] 无操作待机表演流程已接入。
- [x] 调参页参数已覆盖新精灵图大小和位置。

### Remaining Risks

- `MainController.ts` 已较大，本轮只做局部新增，避免无关重构。
- music 暂无真实后端数值接口，只做表现反馈。
- `assets/resources/ui/main/fox` 当前只有 `plist/png`，若 Cocos 尚未生成 meta，运行时 SpriteAtlas 加载可能需要编辑器导入；客户端保留旧静态图兜底避免空白。

## Rules

- `PLAN.md` 仍作为当前产品执行源。
- 新一轮开始前，先补充本轮 `Today` 的 scope、files、progress 和 validation。
- 新一轮计划必须明确列出允许改动的代码文件或模块；未列入允许范围的代码默认不可改。
- 涉及后端配合的内容，必须先输出后端联调需求；后端联调完成后，需要补齐后端修改对前端产生的接口、字段、流程和验收影响。
- 不从归档计划继续扩写；需要引用历史内容时，到归档文件查看。
## Structural Maintenance Log

- [x] 2026-05-14: Extracted Main art tuning schema/defaults/fields from `assets/scripts/ui/main/MainController.ts` into `assets/scripts/ui/main/MainArtTuning.ts`.
- [x] Validation: `.\node_modules\.bin\tsc.cmd --noEmit` passed.
- [x] 2026-05-14: Prevented fox idle animation frame updates from re-rendering non-pet tabs, fixing journal ScrollView bounce/reset while reading long backend logs.
- [x] Validation: `.\node_modules\.bin\tsc.cmd --noEmit` passed.
