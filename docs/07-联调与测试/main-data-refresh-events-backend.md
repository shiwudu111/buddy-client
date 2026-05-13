# Main 数据刷新与 Events 后端联调方案

## 背景

上一轮 Main 核心互动联调已经完成：

- `POST /api/v1/pets/:petId/sleep` 已可用，并返回完整 `data.pet`。
- `POST /api/v1/pets/:petId/play` 已可用，并返回完整 `data.pet`。
- `POST /api/v1/pets/:petId/care` 已可用，并返回完整 `data.pet`。
- `GET /api/v1/pets/:petId/events?limit=20` 已可用，用于日记页读取历史事件。
- 前端已接入 Sleep / Play / Care，并使用接口返回的 `pet` 更新 Main 页面。

本轮不是补 Sleep / Play / Care 接口，而是收敛 Main 页数据刷新边界，避免后端误以为还需要重复实现上一轮接口。

## 本轮目标

- Sleep / Play / Care 成功后，前端只使用动作接口返回的 `data.pet` 更新页面。
- Sleep / Play / Care 成功后，前端不再额外请求 dashboard。
- Main 首次进入时仍调用 dashboard，初始化首页快照。
- 日记页后续使用独立 events 接口读取历史事件，不依赖 Main 本地互动日志。

## 前端刷新策略

### Main 首次进入

- 调用：`GET /api/v1/pets/:petId/dashboard`
- 用途：初始化 Main 首屏数据。
- 期望返回：
  - `pet`
  - `foods`
  - `recent_events`（可选，用于首屏最近事件）

### Sleep / Play / Care

- 调用：
  - `POST /api/v1/pets/:petId/sleep`
  - `POST /api/v1/pets/:petId/play`
  - `POST /api/v1/pets/:petId/care`
- 成功后前端只读取 `data.pet`。
- 前端不刷新 `foods`。
- 前端不强制刷新 `recent_events`。
- 前端不再额外调用 dashboard。
- 右侧互动日志使用当前会话本地日志，允许刷新或重启后丢失。

### Feed

- 调用：`POST /api/v1/pets/:petId/feed`
- 成功后前端读取：
  - `data.pet`
  - `data.foods`
- Feed 涉及库存变化，因此仍需要使用接口返回的 foods 更新 appState。

### Homework Submit

- 调用：`POST /api/v1/homeworks/submit`
- 成功后前端读取接口返回的奖励信息。
- 如果返回 `pet / foods`，前端直接更新 appState。
- 如果后端未来调整奖励返回结构，需要保证作业奖励后的 foods 能被前端明确同步。

## Events 接口

日记页使用独立事件接口，不让 dashboard 继续承担历史日志查询职责。

### 获取宠物事件

- Method: `GET`
- Path: `/api/v1/pets/:petId/events?limit=20`
- 用途：给日记页读取后端持久化历史事件。
- 不用于每次 Sleep / Play / Care 后的强制同步。

建议响应：

```json
{
  "success": true,
  "data": {
    "events": [
      {
        "kind": "play",
        "title": "一起玩耍",
        "detail": "你和精灵玩了一会儿",
        "timestamp": "2026-05-08T04:43:01.000Z"
      }
    ]
  }
}
```

字段建议：

- `kind`: `system | feed | homework | reward | sleep | play | care | level_up | stage_up`
- `title`: 短标题。
- `detail`: 详情文案。
- `timestamp`: ISO 时间字符串。

## 验收标准

- 点击 Sleep / Play / Care 时，Network 中只出现对应动作请求，不再追加 dashboard 请求。
- 动作请求成功后，Main 使用 `data.pet` 刷新状态卡和顶部状态。
- Feed 成功后仍能刷新 `pet / foods`。
- Main 首次进入仍能通过 dashboard 初始化 `pet / foods / recent_events`。
- 日记 tab 可以通过 events 接口读取历史事件。

## 限频与并发建议

- 前端对 Sleep / Play / Care 做 0.3 秒本地冷却，避免单个客户端误触连发。
- 前端冷却不能替代后端保护；多个账号、多个设备或绕过前端请求时，仍会同时打到后端。
- 后端按 `userId + petId + action` 做 0.5 秒轻量限频或业务冷却，作为最终保护。
- 如果后端触发限频，建议返回稳定业务 message，前端会写入互动日志且不伪造 pet。
