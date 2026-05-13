# PLAN.md

## Current Status

- 上一轮 Main 相关计划已归档：`docs/90-archive/2026-05-11-main-v1-plan/PLAN.md`。
- 已收口内容包括：登录、学生端 Main、宠物状态真实接入、互动按钮、互动日志、离线状态衰减、背包食物使用闭环、日记最小闭环 V1。
- 学习任务奖励接入 V1 已完成客户端最终验收：提交作业奖励、背包库存刷新、奖励粮食使用、pet 状态刷新、日记 logs 联动均已通过。

## Today

每日基础粮食 V1：客户端联调与只读展示兼容。

### Scope

- 后端在 `GET /api/v1/pets/:petId/dashboard` 中负责每日基础粮食幂等发放。
- 客户端只展示 dashboard 返回的真实 `foods / inventory`，不本地增加库存。
- 基础粮食使用现有 `meal_box normal ×1`，客户端继续按普通背包食物展示和使用。
- 日记仍通过 `GET /api/v1/pets/:petId/logs?days=7` 读取，不由前端写 `diaryDays`。
- 本轮客户端补联调文档、可选响应字段类型，并在 Main dashboard 成功同步时展示后端发放提示；不改背包 / 日记主流程。

### Files Allowed

- `PLAN.md`
- `docs/07-联调与测试/daily-basic-food-v1-backend.md`
- `assets/scripts/types/api.ts`
- `assets/scripts/services/PetService.ts`
- `assets/scripts/ui/main/MainController.ts`

### Out Of Scope

- 不实现后端发放逻辑、数据库迁移、索引或后端测试。
- 不改 Login / Chat / Parent 主流程。
- 不改 bath / care 流程。
- 不改背包 `/inventory/use` 调用逻辑。
- 不改日记归一化主逻辑。
- 不改离线状态衰减逻辑。
- 不做签到、连续打卡、商城、稀有奖励、AI 批改、家长审核。
- 不让前端伪造基础粮食、库存、奖励或日记。

### Milestones

1. [x] 更新本轮 `Today` scope、允许文件、验收标准和客户端边界。
2. [x] 输出后端联调文档，明确日期边界、发放规则、防重复、日志、缓存、旧数据兼容和测试清理要求。
3. [x] 补 dashboard 可选 `dailyBasicFood` 响应类型，前端不依赖该字段增加库存。
4. [x] 透传 dashboard `dailyBasicFood` 给 Main，并在后端确认发放时展示一次同步提示。
5. [x] 后端完成后进行客户端 TypeScript 验证和接口联调记录。

### Validation

- 本轮客户端改动完成后运行：`.\node_modules\.bin\tsc.cmd --noEmit`
- 后端联调完成后手动验收：
  - 第一次进入 Main / dashboard 后，背包可看到 `meal_box normal ×1`。
  - 第一次发放时 Main 最近互动提示“今日基础口粮已送达，记得照顾小橘哦。”。
  - 第二次进入 Main / dashboard 不重复增加库存。
  - 使用基础粮食仍走 `/pets/:petId/inventory/use`，库存扣减并刷新 pet 状态。
  - 提交作业后科目粮食奖励仍正常显示，且不受基础粮食占用次数影响。
  - 日记通过 logs 可看到基础口粮发放日志、背包使用日志和作业奖励日志。

### Backend Integration Requirements

- 日期边界：每日基础粮食使用后端统一日期工具，按 `Asia/Shanghai` 计算 `dayStart / dayEnd`；dashboard、logs、测试和手动清理 SQL 使用同一日期边界。
- 实现方式：每日基础粮食发放逻辑封装为独立 service/helper，例如 `grantDailyBasicFoodIfNeeded(userId, now)`；dashboard 只调用该能力。
- 防重复：当天存在 `reason="daily_basic_food"` 且 `amount > 0` 的正向发放流水即视为已发放，不以当前库存余额为准。
- 并发：使用 advisory lock 防重；并发测试需用 `Promise.all` 同时发起多次 dashboard 请求，最终当天正向发放流水只能有 1 条，库存只增加 1。
- 旧数据兼容：作业奖励统计仅统计 `amount > 0` 且 `source` 属于作业奖励 food 映射集合的旧 `Resource`；必须排除 `amount < 0`、`reason="daily_basic_food"` 和非作业来源 food。
- 日志：只有 `reason="daily_basic_food"` 且 `amount > 0` 的流水展示为“今日基础口粮已送达，记得照顾小橘哦。”；负向消耗流水不得展示为发放日志。
- 手动清理：清理 SQL 仅用于本地 / 开发环境，只清理指定 `userId`、指定日期、`reason="daily_basic_food"` 的测试流水，不进入正式流程。

### Client Acceptance Status

- [x] 后端健康检查 `http://localhost:3000/` 正常。
- [x] `.\node_modules\.bin\tsc.cmd --noEmit` 通过。
- [x] 新测试账号首次 dashboard 返回 `dailyBasicFood.granted=true`、`date=2026-05-13`，`foods / inventory` 包含 `meal_box normal ×1`。
- [x] 同账号第二次 dashboard 返回 `dailyBasicFood.granted=false`，`meal_box normal` 库存仍为 1，未重复增加。
- [x] `GET /api/v1/pets/:petId/logs?days=7` 可读到基础口粮日志；客户端仍只通过 logs 展示日记，不写 `diaryDays`。
- [x] Main dashboard 同步时已透传 `dailyBasicFood`，仅在 `granted=true` 时显示“今日基础口粮已送达，记得照顾小橘哦。”，不本地增加库存。

### Remaining Risks

- PowerShell 直接打印后端 logs 时中文出现编码显示问题；Cocos / 浏览器 fetch 正常按 JSON 读取，客户端不做本地文案改写。
- 基础口粮日志的 `title / kind` 由后端映射决定，客户端按后端返回展示。

## Rules

- `PLAN.md` 仍作为当前产品执行源。
- 新一轮开始前，先补充本轮 `Today` 的 scope、files、progress 和 validation。
- 新一轮计划必须明确列出允许改动的代码文件或模块；未列入允许范围的代码默认不可改。
- 涉及后端配合的内容，必须先输出后端联调需求；后端联调完成后，需要补齐后端修改对前端产生的接口、字段、流程和验收影响。
- 不从归档计划继续扩写；需要引用历史内容时，到归档文件查看。
