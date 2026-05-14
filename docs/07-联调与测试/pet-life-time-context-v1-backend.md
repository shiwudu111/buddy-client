# 真实时间与宠物生命感 V1 后端联调需求

## 背景

本轮只做学生端 Main 的生命感表现层。后端只需要在 dashboard 中提供可选 `timeContext`，用于前端展示主动气泡和 returnGreeting。正式宠物数值、库存、离线衰减、每日基础粮食、作业奖励和日记仍沿用既有接口与后端快照。

本仓库不修改后端代码；后端实现交给后端联调处理。

## 接口

Method: `GET`

Path: `/api/v1/pets/:petId/dashboard`

在现有成功响应 `data` 中可选增加：

```ts
interface TimeContextPayload {
  serverNow: string;
  timezone: string;
  localDate: string;
  dayPeriod: "morning" | "noon" | "afternoon" | "evening" | "night" | "lateNight";
  minutesSinceLastSeen?: number;
  lastSeenAt?: string | null;
  returnGreeting?: {
    shouldShow: boolean;
    text: string;
    reason: "short_return" | "long_return" | "overnight" | "new_day" | "none";
  };
}
```

示例：

```json
{
  "success": true,
  "data": {
    "pet": {
      "pet_id": "pet_001",
      "name": "小橘",
      "level": 3,
      "hunger": 74,
      "energy": 80,
      "mood": 67,
      "experience": 120
    },
    "foods": [],
    "recent_events": [],
    "timeContext": {
      "serverNow": "2026-05-13T10:30:00.000Z",
      "timezone": "Asia/Shanghai",
      "localDate": "2026-05-13",
      "dayPeriod": "morning",
      "minutesSinceLastSeen": 45,
      "lastSeenAt": "2026-05-13T09:45:00.000Z",
      "returnGreeting": {
        "shouldShow": true,
        "text": "你回来啦，见到你真好。",
        "reason": "short_return"
      }
    }
  }
}
```

## 日期和时段口径

- 日期边界按 `Asia/Shanghai`，与每日基础粮食一致。
- `serverNow` 使用 ISO 字符串。
- `localDate` 使用 `YYYY-MM-DD`。
- `dayPeriod` 建议按后端统一时间工具计算，前端只消费返回值，不自行构造 fake `timeContext`。

建议时段：

- `morning`: 05:00-10:59
- `noon`: 11:00-13:59
- `afternoon`: 14:00-17:59
- `evening`: 18:00-20:59
- `night`: 21:00-23:59
- `lateNight`: 00:00-04:59

## Return Greeting

- `timeContext.returnGreeting` 是后端正式展示上下文。
- `minutesSinceLastSeen` 和 `lastSeenAt` 只用于展示问候，不触发前端正式数值变化。
- 如果后端暂不能可靠记录 `lastSeenAt`，可以先不返回 `returnGreeting`；前端会降级为本地会话提示，但不会写入 `timeContext`、后端 logs 或日记。
- returnGreeting 文案必须温和，不制造负罪感。

建议档位：

- `short`: 10-60 分钟
- `long`: 1-6 小时或超过 6 小时，可按后端实际 reason 拆分
- `overnight`: 跨天
- `new_day`: 新日期上下文
- `none`: 不展示

## 前端边界

- 前端不构造 fake `timeContext`。
- 前端不把本地 fallback 问候写回 `timeContext`。
- 前端不因 `timeContext` 修改正式 pet 状态、库存、奖励或日记。
- 生命感气泡只作为 Main session UI 展示，不写 `mainEvents / diaryDays / backend logs`。
- `music` 暂无真实后端数值接口时，前端只做表现反馈，不影响正式数值。

## 验收场景

- dashboard 返回完整 `timeContext`：前端展示对应主动气泡或 returnGreeting。
- dashboard 不返回 `timeContext`：前端不报错，不生成时段文案，不构造假字段。
- `dailyBasicFood.granted=true` 或 `offlineDecay.applied=true`：前端优先展示既有高优先级提示。
- 同一 pet 同一回归窗口：前端只显示一次 returnGreeting。
- 背包、日记、作业奖励、每日基础粮食既有闭环不受影响。
