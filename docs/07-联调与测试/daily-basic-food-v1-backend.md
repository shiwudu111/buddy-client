# 每日基础粮食 V1 后端联调方案

## 目标

每日首次进入学生端 Main / dashboard 时，由后端自动发放少量基础粮食，避免宠物挨饿成为强惩罚。作业奖励仍是额外粮食来源，不替代基础粮食。

客户端边界：

- 前端只展示 `GET /api/v1/pets/:petId/dashboard` 返回的真实 `foods / inventory`。
- 前端不本地增加库存、不伪造奖励、不直接修改 pet、不写 `diaryDays`。
- 基础粮食使用仍走 `POST /api/v1/pets/:petId/inventory/use`。
- 日记仍通过 `GET /api/v1/pets/:petId/logs?days=7` 读取。

## 日期边界

每日基础粮食使用后端统一日期工具，当前按 `Asia/Shanghai` 计算 `dayStart / dayEnd`。

dashboard 自动发放、logs 查询、测试断言和手动清理 SQL 必须使用同一日期边界，避免凌晨跨时区重复发放或不发放。

## 发放规则

- 触发点：`GET /api/v1/pets/:petId/dashboard`。
- 发放物品：`meal_box normal ×1`。
- 写入流水：

```json
{
  "type": "FOOD",
  "amount": 1,
  "source": "meal_box",
  "sourceId": "normal",
  "reason": "daily_basic_food"
}
```

- 去重依据：当天是否存在 `reason="daily_basic_food"` 且 `type="FOOD"` 且 `amount > 0` 的发放流水。
- 去重不以当前库存余额为准；即使用户当天已经吃掉基础粮食，也不能再次发放。
- dashboard 响应需要加 `Cache-Control: no-store`。

建议返回可选调试字段，前端不依赖它增加库存：

```json
{
  "success": true,
  "data": {
    "dailyBasicFood": {
      "date": "2026-05-12",
      "granted": true,
      "item": {
        "itemType": "food",
        "food_type": "meal_box",
        "food_quality": "normal",
        "count": 1
      }
    }
  }
}
```

当天已发放时：

```json
{
  "dailyBasicFood": {
    "date": "2026-05-12",
    "granted": false
  }
}
```

## 实现要求

- `Resource` 增加 `reason String?`。
- 按实际库存归属字段建立组合索引；当前库存归属为 `userId`，建议索引为 `userId + reason + type + createdAt`。
- 每日基础粮食发放逻辑封装为独立 service/helper，例如 `grantDailyBasicFoodIfNeeded(userId, now)`。
- helper 职责包括：
  - 基于 `Asia/Shanghai` 计算日期和 day range。
  - 使用 `userId + daily_basic_food + date` 加 advisory lock。
  - 查询当天 `daily_basic_food` 正向流水。
  - 必要时写入 `Resource`。
  - 返回 `granted / alreadyGranted / item`。
- dashboard controller 只调用 helper，不把发放细节散落在 controller。
- 发放、库存读取、日志可读状态应保持事务一致。

## 作业奖励兼容

新作业奖励流水应写入 `reason="homework_reward"`。

作业奖励统计：

- 新数据只统计 `reason="homework_reward"` 且 `amount > 0`。
- 兼容旧数据时，仅统计 `amount > 0` 且 `source` 属于作业奖励 food 映射集合的旧 `Resource`。
- 必须排除 `amount < 0`、`reason="daily_basic_food"` 和非作业来源 food。

`homework dev reset` 不删除 `daily_basic_food`。如需重复测试基础粮食，使用单独的开发环境清理方式。

## 日志

只有 `reason="daily_basic_food"` 且 `amount > 0` 的流水展示为：

```text
今日基础口粮已送达，记得照顾小橘哦。
```

负向消耗流水不得展示为发放日志，应继续展示为背包使用日志。

## 手动清理

手动清理 SQL 仅用于本地 / 开发环境，不得加入正式运行流程。

清理时只能删除指定 `userId`、指定日期、`reason="daily_basic_food"` 的测试流水。重复测试时建议只清理当天正向发放流水；如需完全还原测试场景，应同时理解该用户当天是否已有 `meal_box` 消耗流水。

示意：

```sql
DELETE FROM "Resource"
WHERE "userId" = '<USER_ID>'
  AND "reason" = 'daily_basic_food'
  AND "type" = 'FOOD'
  AND "amount" > 0
  AND "createdAt" >= '<DAY_START_UTC>'
  AND "createdAt" < '<DAY_END_UTC>';
```

`DAY_START_UTC / DAY_END_UTC` 必须由后端统一 `Asia/Shanghai` 日期边界换算得出。

## 验收

- 第一次 `GET /api/v1/pets/:petId/dashboard`：
  - 返回 `foods / inventory` 包含 `meal_box normal ×1`。
  - `dailyBasicFood.granted = true`。
  - logs 可看到基础口粮发放日志。
- 第二次 dashboard：
  - 不重复发放。
  - 不重复写日志。
  - `dailyBasicFood.granted = false`。
- 并发 dashboard：
  - 使用 `Promise.all` 同时发起多次请求。
  - 最终当天 `reason="daily_basic_food"` 且 `amount > 0` 的流水只有 1 条。
  - 库存只增加 1。
- 使用基础粮食：
  - 仍走 `POST /api/v1/pets/:petId/inventory/use`。
  - 库存扣减。
  - pet 状态刷新。
- 当天吃掉基础粮食后再次 dashboard：
  - 不再次发放。
- 提交作业：
  - 作业奖励仍正常发放。
  - 每日基础粮食不占用每日作业奖励次数。
- 日记：
  - 可通过 logs 看到基础口粮日志、作业奖励日志和背包使用日志。

## 客户端联调记录

- 后端开发日志确认：`bun test` 55/55 通过，WSL 同步、迁移、Prisma Client 生成和服务重启已完成。
- 客户端健康检查：`http://localhost:3000/` 返回 `{"status":"ok","message":"Buddy API Server"}`。
- 客户端测试账号首次 dashboard：
  - `dailyBasicFood.granted = true`
  - `dailyBasicFood.date = 2026-05-13`
  - `foods / inventory` 包含 `meal_box normal ×1`
- 同账号第二次 dashboard：
  - `dailyBasicFood.granted = false`
  - `meal_box normal` 库存仍为 1，未重复增加。
- `GET /api/v1/pets/:petId/logs?days=7` 可读到基础口粮发放记录；客户端日记仍只读取 logs，不写本地 `diaryDays`。
- 客户端 `MainController` 只在 `dailyBasicFood.granted=true` 时显示本地同步提示，不使用该字段增加库存。
