# PLAN.md 下一阶段修正计划

## Today: Main 日记最小闭环 V1

### Progress

- [done] 新增 `DiaryEntry / DiaryDay / DiaryPayload` 类型。
- [done] `ApiClient.getPetLogs` 已接入 `GET /api/v1/pets/:petId/logs?days=7`，保留 events fallback。
- [done] `PetService.loadPetDiary` 已负责 logs/events/days 归一化，MainController 不直接处理后端多套结构。
- [done] `AppState` 已新增 `diaryDays` 读写与清理。
- [done] Main 日记 tab 已按最近 7 天日期分组展示真实后端记录，失败只显示 tab 内临时状态。
- [done] Main 日记 tab 已改为面板内滚动列表，支持上下拖动查看最近 7 天全部日期与记录。
- [done] 已新增日记 V1 后端联调文档：`docs/07-联调与测试/main-diary-v1-backend.md`。

### Validation

- `.\node_modules\.bin\tsc.cmd --noEmit`

## Summary

将原 `Main 页面功能占位闭环计划` 归档为上一阶段记录。下一阶段新增 `Next: Main 页面功能 MVP`，目标从“可点击、有反馈”升级为“数据驱动、接口驱动、可验收”。

## Archived: Main 离线状态衰减接入

### Status

- [done] 当前阶段已收口完成。
- [done] 后端已使用独立 `lastDecayAt` 作为衰减结算锚点，不复用 `updatedAt / lastUpdatedAt` 作为长期方案。
- [done] 后端按满小时结算离线衰减：饱腹 `-2/h`、心情 `-1/h`、清洁 `-1/h`，体力本阶段不自动变化。
- [done] 单次衰减最多结算 24 小时，状态值 clamp 到 `0-100`。
- [done] dashboard 与背包使用链路均以服务端返回的最终 `pet` 快照为准；前端不根据本地时间扣值、不伪造衰减结果。
- [done] `offlineDecay` 作为请求结算摘要处理，不塞进 `PetStatus`。
- [done] `cleanliness / lastDecayAt / offlineDecay` 类型与服务层兼容已完成；清洁值 UI 在洗澡功能接入前不展示。

### Validation

- `.\node_modules\.bin\tsc.cmd --noEmit`

## Today: Main 背包最小闭环 V1

### Scope

- 只做学生端 Main 的背包 V1：food 类型道具真实展示与使用闭环。
- 不扩展商城、装扮、合成、复杂道具系统、批量使用或非 food 道具。
- 背包只展示后端 `dashboard / inventory` 返回的库存项；前端不补齐未返回的 0 数量道具。
- 前端不本地扣库存、不本地改 pet、不伪造 interaction log。
- 使用食物调用后端 `POST /api/v1/pets/:petId/inventory/use`；后端负责离线衰减、权限校验、库存扣减、pet 更新和日志写入。

### Files Allowed

- `PLAN.md`
- `assets/scripts/types/api.ts`
- `assets/scripts/network/ApiClient.ts`
- `assets/scripts/services/PetService.ts`
- `assets/scripts/ui/main/MainController.ts`
- `docs/07-联调与测试/main-inventory-v1-backend.md`

### Progress

- [done] 已新增背包使用类型：`InventoryFoodItem / UseInventoryItemPayload / UseInventoryItemResultPayload`。
- [done] `ApiClient` 已接入 `POST /pets/{petId}/inventory/use`，文档统一为 `POST /api/v1/pets/:petId/inventory/use`。
- [done] `PetService.useFoodFromInventory` 已接入真实接口，成功才同步 `pet / inventory 或 foods / logs`，失败不修改 `appState`。
- [done] 背包 tab 已升级为 food 道具列表：占位图标、名称、数量、效果说明、使用按钮。
- [done] 背包和底部喂食入口已统一走 `useFoodFromInventory`；失败只显示临时 UI 提示，不写入 `mainEvents`。
- [done] 食物使用成功后不再自动关闭背包/食物选择面板，支持用户连续使用，由用户自行关闭。
- [done] 已新增背包 V1 后端联调文档，明确协作顺序、失败语义、并发保护和离线衰减衔接。

### Validation

- `.\node_modules\.bin\tsc.cmd --noEmit`

### Coordination Order

- 前端提交联调文档。
- 后端确认接口契约。
- 前端先做兼容型接入，等待后端实现真实闭环。
- 后端完成真实结算后，双方用固定账号联调验收。

### Backend Contract

- 正式接口：`POST /api/v1/pets/:petId/inventory/use`。
- 后端执行顺序：权限校验 -> 离线状态衰减 -> 库存校验 -> transaction 中扣库存、更新 pet、写 interaction log -> 返回 `pet / inventory 或 foods / logs / offlineDecay`。
- 失败码：`INVALID_ITEM / UNAUTHORIZED / FORBIDDEN / PET_NOT_FOUND / INSUFFICIENT_INVENTORY / INVENTORY_CONFLICT / INTERNAL_ERROR`。
- 失败响应不应修改 `pet / inventory`，也不应写入成功 interaction log。

## Archived: Main 核心互动闭环

### Scope

- 只做学生端 Main 页面 Sleep / Play / Care 核心互动接入。
- 保留已验收的 dashboard / feed / 背包库存 / 食物选择面板闭环，不重构 feed。
- 正式 pet 数值只以后端接口返回为准，不在前端伪造成长结果。
- 不做 Deferred：不做角色资源切换、不做喂食成功动画、不新增 `PetRules.ts`。

### Files Allowed

- `PLAN.md`
- `assets/scripts/types/api.ts`
- `assets/scripts/network/ApiClient.ts`
- `assets/scripts/services/PetService.ts`
- `assets/scripts/ui/main/MainController.ts`
- `docs/07-联调与测试/main-data-refresh-events-backend.md`

### Progress

- [done] 执行前基线确认：feed / dashboard 静态校验通过。
- [done] 已补齐 Sleep / Play / Care 前端类型、ApiClient 方法、PetService 方法。
- [done] MainController 已接入 Sleep / Play / Care 请求锁、阈值拦截、状态映射和失败日志，真实成功链路已完成联调验收。
- [done] 后端已补齐 `POST /pets/{petId}/sleep`、`POST /pets/{petId}/play`、`POST /pets/{petId}/care`，backend-blocked 已解除。
- [done] Sleep / Play / Care 成功后只使用动作接口返回的 `pet` 刷新 Main，不再额外请求 dashboard。
- [done] 后端已补齐 `GET /pets/{petId}/events?limit=20`，前端已接入日记 tab 读取后端历史事件。
- [done] Sleep / Play / Care 已增加 0.3 秒前端本地冷却；后端使用 0.5 秒限频作为最终保护。
- [done] Sleep / Play / Care 前端按钮真实联调已结束：成功后 pet 刷新、失败日志、feed 无回归均已验收。
- [done] 已删除旧的 Sleep / Play / Care 缺接口联调文档，新增数据刷新与 Events 联调方案：`docs/07-联调与测试/main-data-refresh-events-backend.md`。

### Validation

- `.\node_modules\.bin\tsc.cmd --noEmit`

### Main Data Refresh Policy

- Main 首次进入时调用 dashboard，初始化 `pet / foods / recent_events`。
- Sleep / Play / Care 成功后只使用动作接口返回的 `pet` 更新 appState，不额外刷新 dashboard。
- Sleep / Play / Care 的互动日志先写当前会话本地日志，允许刷新或重启后丢失。
- Feed 成功后使用接口返回的 `pet / foods` 更新 appState。
- Homework submit 成功后使用接口返回的 `pet / foods` 更新 appState。
- 日记 tab 读取 events 接口，不从 Main 本地日志伪造历史记录。

## Archived: Main 页面入口占位闭环

保留原 `Today` 已完成内容，明确它只是“静态结构 + 占位交互”阶段，不再继续扩写。

---

## Next: Main 页面功能 MVP

### Goal

把 Main 页面升级为“数据驱动 + 可验收”的学生端宠物主页 MVP。

### Scope

- 只做学生端 Main 页面第一层功能。
- 左侧状态卡、主舞台状态、右侧日志、顶部 tab、底部按钮改为数据驱动。
- 宠物等级、饱腹值、体力值、心情值、foods 库存优先来自 `dashboard / feed / appState`。
- 后端未支持的动作只做明确反馈，不修改正式数值。
- 本阶段只做“当前快照 + 用户事件触发”的状态切换，不做完整时间系统。
- 不扩展 Login / Homework / Chat / Parent 主流程。

### Files Allowed

- `PLAN.md`
- `assets/scripts/ui/main/MainController.ts`
- `assets/scripts/app/AppState.ts`
- `assets/scripts/services/PetService.ts`
- `assets/scripts/ui/common/runtime/RuntimeUI.ts`（仅 UI 工具不足时小改）

### Implementation Order

1. MainViewModel
2. 状态卡数据化
3. Dashboard 同步
4. 宠物状态派生
5. Feed 闭环
6. 背包 / 日记 tab
7. 底部动作反馈
8. 日志优化
9. 验证

---

## Milestones

### 1. [done] MainViewModel

- 在 `MainController` 内新增 `resolveMainViewModel()`。
- 从 `appState` 读取宠物、等级、饱腹值、体力值、心情值、foods。
- 缺数据时显示“待同步 / --/100”，不写死 `Lv.7`、`60/100`。
- ViewModel 只派生展示数据，不直接修改 `appState`。

### 2. [done] 状态卡数据化

- 等级、饱腹值、体力值、心情值全部从 ViewModel 渲染。
- 数值 clamp 到 `0-100`。
- 缺数据时不伪造默认成长结果。

### 3. [done] Dashboard 同步

- Main 启动后调用 dashboard。
- 成功后更新 `appState` 并重绘 Main。
- 失败时日志显示同步失败，不跳转、不崩溃。
- loading 期间避免重复请求和日志刷屏。

### 4. [done] 宠物状态派生

- ViewModel 增加 `displayStatus`。
- 优先使用接口返回的 `status`。
- 无 `status` 时根据饱腹值、体力值、心情值派生：饥饿、疲惫、低落、状态良好。
- 点击睡觉 / 休息只设置当前会话 `localPetMode`，不修改正式数值。
- dashboard / feed 成功后清理或覆盖本地展示状态。

### 5. [done] Feed 闭环

- 从 foods 中选择可用食物。
- 调用真实 feed 接口。
- 成功后用接口返回的 `pet / foods` 更新 `appState`。
- 返回缺少 `pet` 或 `foods` 时，不本地推算，显示“接口返回不完整”。
- 失败时只显示原因，不扣库存，不伪造宠物状态。
- 请求中禁用或忽略重复点击。

### 6. [done] 背包 / 日记 tab

- 背包展示 foods：名称 / 品质 / 数量。
- 无 foods 时显示空状态。
- 日记展示当前会话最近互动日志。
- 不伪造历史日记数据。

### 7. [done] 底部动作与日志

- 玩耍 / 洗澡 / 睡觉 / 听歌 / 心情均可点击。
- 无真实接口时只写日志，并说明“不改变正式数值”。
- 一条互动作为一条日志，最多显示最近 3 条。
- 可显示当前会话本地时间戳。

---

## Time / State Boundary

### 允许做

- 展示 dashboard / feed 返回的当前宠物状态。
- 根据数值阈值派生展示状态。
- 点击睡觉 / 休息进入本地会话展示状态。
- 日志显示本地时间戳。

### 不做

- 不根据本地时间自动减少饱腹值。
- 不根据本地时间自动恢复体力。
- 不做离线结算。
- 不做每日重置。
- 不用前端推算覆盖后端宠物数值。
- 不实现完整冷却、作息、成长系统。

---

## Acceptance

- `.\node_modules\.bin\tsc.cmd --noEmit` 通过。
- 只修改 `Files Allowed` 中列出的文件。
- Main 页面不再显示硬编码的 `Lv.7`、`60/100`、`75/100`、`80/100`。
- dashboard 成功后，等级、饱腹值、体力值、心情值、foods 来自 `appState / 接口结果`。
- dashboard 失败时 Main 不崩溃，并显示同步失败日志。
- 饥饿、疲惫、低落、休息等状态有明确来源。
- feed 成功后用接口返回的 `pet / foods` 刷新状态和库存。
- feed 失败或返回不完整时，不修改正式状态，不扣库存。
- 背包 tab 能展示 foods 或空状态。
- 日记 tab 能展示当前会话最近日志。
- 底部按钮连续点击不报错、不重复刷屏。
- 没有完整时间系统前，不做自动成长、自动消耗、离线结算。

## Progress Notes

- MainViewModel 已接入，状态卡、顶栏状态、背包、日记和 feed 均从 ViewModel / appState 派生展示数据。
- Dashboard 同步已收口：成功更新 appState 并重绘，失败或异常写入日志且不跳转，loading 会在 finally 中释放。
- Feed 语义已收紧：`feedCurrentPet` 必须传入口粮 payload，只接受完整 `pet / foods` 返回，不再保留无 payload 旧资源接口回退。
- Feed 功能闭环已验收为完成：点击喂食打开食物选择面板，用户选择口粮后调用真实 feed，成功后更新宠物状态和库存、关闭面板并追加日志；当前成功反馈以日志为主。
- 宠物展示状态已收口：当前会话 `localPetMode` 优先于服务端状态；dashboard / feed 成功后清理本地展示状态。
- 服务端 `status` 映射已扩展为 `unknown` 输入，支持 boolean 与常见字符串状态；未知值回落到数值阈值派生。
- 后端 `display_status` 已联调并接入前端读取；`idle` 等展示状态已可进入 MainViewModel。
- 背包 tab 已按“名称 / 品质 / 数量”拆分展示 foods。
- 底部未接入真实接口的动作只写本地日志，并明确不改变正式数值。
- 静态校验已通过：`.\node_modules\.bin\tsc.cmd --noEmit`。

## Blocked / Deferred

- Main 宠物角色多状态展示后置：当前前端只有睡眠态角色资源，暂不能根据 `display_status` 切换 `idle / sleeping / playing` 等角色图。
- 喂食成功动画后置：当前 feed 成功后已有日志反馈和数据刷新，但缺少专门的成功动画资源与表现层设计。
- 以上阻塞不影响当前 Main 数据同步、背包库存、食物选择、feed 接口和日志闭环验收。

## Assumptions

- 上一阶段只归档，不再扩写。
- 本阶段优先移除硬编码状态值，不继续加视觉细节。
- 正式宠物数值只以后端接口和 `appState` 为准。
- 本阶段不碰 Login / Homework / Chat / Parent 稳定主流程。
