# PLAN.md

## 当前状态

- 上一轮计划已归档：`../docs/client/90-archive/2026-05-18-main-structure-v2-plan/PLAN.md`。
- 已收口内容包括：Main 结构减负 V2、Main 内部渲染模块拆分、资源加载集中化、程序化贴图工厂、StageRenderer context 分组、资源加载回调合帧渲染。
- 新一轮开始前，请在 `## Today` 下补充本轮目标、范围、允许文件、里程碑和验收标准。

## Today

Main 核心互动控制器起步：先把 sleep/play/care 的进行中状态和冷却状态从 MainController 抽出。

### 范围

- 新增 `MainPetInteractionController.ts`，只承接 `sleep/play/care` 核心互动的 active action 和冷却计时。
- `MainController.ts` 继续保留真实接口调用、业务判断、视觉反馈和 interaction log。
- 不抽喂食/背包使用流程，本轮避免碰库存结算。
- 不改变核心互动的文案、接口、状态刷新、视觉反馈和失败处理。
- 不推进 PetBehaviorController 后续生命感状态机，不处理全量重绘。

### 允许文件

- `PLAN.md`
- `assets/scripts/ui/main/MainController.ts`
- `assets/scripts/ui/main/MainPetInteractionController.ts`
- `assets/scripts/ui/main/MainPetInteractionController.ts.meta`

### 不在范围内

- 未列入 `Files Allowed` 的代码默认不可改。
- 不修改稳定业务流程，除非本轮计划明确要求。
- 不改后端接口、数据库、奖励规则、库存结算、作业提交服务。
- 不改 Main 视觉、狐狸动画节奏、调参页、背包/日记渲染样式。
- 不抽喂食、作业、日记、背包面板逻辑。
- 不改 PetBehaviorController 状态转换。
- 不改 Cocos scene / prefab 文件。

### 里程碑

1. [x] 定义本轮 `Today` scope、允许文件、验收标准和边界。
2. [x] 新增 MainPetInteractionController，承接核心互动 active/cooldown 状态。
3. [x] MainController 使用 interaction controller 管理 sleep/play/care 进行中与冷却。
4. [x] 保持核心互动请求、视觉反馈、日志和失败处理行为不变。
5. [x] 运行 TypeScript 验证并记录验收状态。

### 验证

- `.\node_modules\.bin\tsc.cmd --noEmit`
- 手动验收：
  - sleep/play/care 重复点击仍会提示“操作进行中”。
  - 核心互动成功后仍有 300ms 前端冷却。
  - sleep/play/care 成功后仍触发原视觉状态和气泡。
  - 核心互动失败不修改宠物状态和库存。

### 客户端验收状态

- [x] `.\node_modules\.bin\tsc.cmd --noEmit` 通过。
- [x] `git diff --check` 通过（仅有 LF/CRLF warning）。
- [x] 乱码哨兵检查通过。
- [x] 旧 `activePetAction/corePetActionCooldownUntil` 引用检查通过。
- [ ] Cocos + 真实后端核心互动手动验收待跑。

### 剩余风险

- 本轮只抽核心互动的状态管理，不抽真实请求和 UI 表现。
- 手动核心互动验收仍依赖真实后端和 Cocos 运行环境。

## 规则

- `PLAN.md` 仍作为当前产品执行源。
- 新一轮开始前，先补充本轮 `Today` 的 scope、files、progress 和 validation。
- 新一轮计划必须明确列出允许改动的代码文件或模块；未列入允许范围的代码默认不可改。
- 涉及后端配合的内容，必须先输出后端联调需求；后端联调完成后，需要补齐后端修改对前端产生的接口、字段、流程和验收影响。
- 不从归档计划继续扩写；需要引用历史内容时，到归档文件查看。
