# Main 日记最小闭环 V1 后端联调方案

## 前端边界

- 日记 V1 只读展示后端持久化 interaction logs/events。
- 前端不伪造历史日记，不本地生成持久化日记记录。
- 失败时只显示 diary tab 内临时 UI 状态或 toast，不写入 `mainEvents`，不进入 `diaryDays`。
- `bath / care` 暂不纳入日记 V1；若后端返回，前端默认忽略。

## 推荐正式接口

Method: `GET`

Path: `/api/v1/pets/:petId/logs?days=7`

推荐成功响应：

```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "log_001",
        "kind": "feed",
        "title": "使用口粮",
        "detail": "已使用普通体力口粮",
        "timestamp": "2026-05-09T10:00:00.000Z"
      }
    ]
  }
}
```

也可以直接返回已分组结构：

```json
{
  "success": true,
  "data": {
    "days": [
      {
        "date": "2026-05-09",
        "dateText": "今天",
        "summary": "今天照顾了小橘 4 次",
        "entries": [
          {
            "id": "log_001",
            "kind": "feed",
            "title": "使用口粮",
            "detail": "已使用普通体力口粮",
            "timestamp": "2026-05-09T10:00:00.000Z",
            "timeText": "18:00"
          }
        ]
      }
    ]
  }
}
```

## 字段约定

- `id` 可选；后端没有时前端会生成临时 UI key，但不当作持久 ID。
- `kind` 推荐范围：`feed / play / sleep / music / mood / offline_decay / inventory_food_use`。
- `title` 为短标题。
- `detail` 为记录详情。
- `timestamp` 使用 ISO 时间字符串。

## 兼容与 fallback

- 前端优先请求 `GET /api/v1/pets/:petId/logs?days=7`。
- 只有 logs 接口返回 `404 / 405 / 501` 或稳定错误码 `NOT_IMPLEMENTED` 时，前端才 fallback 到：
  - `GET /api/v1/pets/:petId/events?limit=100`
- `401 / 403 / 500 / 网络错误` 不 fallback，直接显示错误态。
- events fallback 只是临时兼容方案，受 `limit` 限制，不能保证完整覆盖最近 7 天；正式能力仍以 `logs?days=7` 为准。

## 前端归一化

- `PetService` 兼容标准 `ApiResponse` 包装：优先读取 `response.data.days / response.data.logs / response.data.events`。
- 也兼容直接返回 `days / logs / events` 的裸结构。
- 若返回 `days`，优先使用后端分组。
- 若返回平铺 `logs / events`，前端按客户端本地日期分组，并过滤最近 7 天。
- `bath / care` 默认忽略；其他未知 `kind` 不中断渲染，可显示为“其他记录”。

## 验收场景

- 打开 Main 日记 tab，Network 优先出现 `GET /api/v1/pets/{petId}/logs?days=7`。
- logs 未实现时 fallback 到 `GET /api/v1/pets/{petId}/events?limit=100`。
- 最近 7 天记录按日期分组展示，日期倒序，同日记录时间倒序。
- 超过 7 天的记录不展示。
- 无记录成功响应显示“最近还没有成长记录”。
- 接口失败时显示“日记暂未同步，请稍后再试”。
- 已有 `diaryDays` 时加载失败，保留旧展示并提示“同步失败，当前为上次记录”。
- 失败不影响宠物主页、背包页签、状态栏，不写入 `mainEvents`，不伪造成功日志。
