# Main 离线状态衰减后端联调方案

## 背景

本轮只接入学生端 Main 的离线状态衰减展示与接口兼容。正式宠物数值必须以后端返回为准，前端不根据本地时间自行扣减，也不使用假数据替代缺失字段。

## 衰减锚点

后端应使用独立字段 `lastDecayAt` 记录上次状态衰减结算时间。

- 不要直接复用 `updatedAt / lastUpdatedAt` 作为长期方案。
- `updatedAt / lastUpdatedAt` 可能被喂食、玩耍、改名、状态切换或后台修正刷新，容易误重置离线衰减时间。
- 如果当前后端暂未提供 `lastDecayAt`，本轮请先补字段与迁移默认值；前端只兼容展示，不自行计算。

## 结算规则

后端在返回 pet 快照前按 `lastDecayAt` 结算：

```ts
elapsedHours = floor((now - lastDecayAt) / 1h)
cappedHours = min(elapsedHours, 24)
```

每满 1 小时：

- `hunger -2`
- `mood -1`
- `cleanliness -1`
- `energy` 本轮不自动变化

所有状态字段 clamp 到 `0-100`。结算后持久化 pet，并更新 `lastDecayAt = now`。

## 响应字段

建议 dashboard / feed / sleep / play / care 等返回 pet 快照的接口兼容：

```json
{
  "success": true,
  "data": {
    "pet": {
      "pet_id": "pet_001",
      "name": "Buddy",
      "level": 3,
      "hunger": 74,
      "energy": 80,
      "mood": 67,
      "cleanliness": 71,
      "experience": 120,
      "lastDecayAt": "2026-05-08T09:00:00.000Z"
    },
    "offlineDecay": {
      "applied": true,
      "elapsedHours": 3,
      "message": "离线 3 小时，已更新饱腹、心情和清洁。"
    }
  }
}
```

字段说明：

- `cleanliness`: `0-100` 清洁值。
- `lastDecayAt`: 上次衰减结算时间，不等同于通用更新时间。
- `offlineDecay`: 本次请求的结算摘要，不属于宠物基础属性。
- 如果后端当前返回 `last_decay_at / offline_decay.elapsed_hours`，前端 `PetService` 会归一化为 camelCase。

## 前端行为

- Main 只展示接口返回后的 pet 快照。
- 前端不新增定时器，不根据本地时间扣减饱腹、心情、清洁。
- 缺 `cleanliness` 时，左侧状态卡显示 `--/100`，右侧轻提示“清洁值字段暂未同步”。
- 缺 `lastDecayAt` 时，前端不自行寻找 `updatedAt / lastUpdatedAt` 作为替代锚点。

## 验收场景

- 构造 `lastDecayAt` 为 3 小时前：dashboard 返回后饱腹 `-6`、心情 `-3`、清洁 `-3`。
- 构造 `lastDecayAt` 为 30 分钟前：不发生衰减。
- 构造 `lastDecayAt` 为 48 小时前：最多只按 24 小时结算。
- 连续请求 dashboard 两次：第一次发生衰减并更新 `lastDecayAt`，第二次不重复扣减。
- 构造接近 0 的状态值：后端 clamp 到 0，前端不出现负数。
- 后端暂缺 `cleanliness`：前端显示 `--/100` 和待同步提示，不生成假清洁值。
- Sleep / Play / Care / Feed 原有成功链路不回归。
