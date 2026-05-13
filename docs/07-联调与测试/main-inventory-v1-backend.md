# Main 背包最小闭环 V1 后端联调方案

## 协作顺序

1. 前端提交本联调文档。
2. 后端确认接口契约。
3. 前端先做兼容型接入，等待后端实现真实闭环。
4. 后端实现真实闭环后，双方联调验收。

## 前端边界

- 前端只展示后端 `dashboard / inventory` 返回的库存项。
- 前端不补齐未返回的 0 数量道具，不伪造库存列表。
- 前端不本地扣库存、不本地修改正式 pet 数值。
- 失败时只显示 toast / 临时 UI 提示，不写入 `mainEvents`，不伪造 interaction log。
- 食物效果说明只用于 UI 展示；实际 `hunger / mood / energy` 增减以后端结算结果为准。

## 接口

Method: `POST`

Path: `/api/v1/pets/:petId/inventory/use`

请求：

```json
{
  "itemType": "food",
  "food_type": "energy",
  "food_quality": "normal"
}
```

V1 固定单次使用 1 个道具，不开放批量使用。

## 后端执行顺序

1. 校验登录态与 pet 归属权限。
2. 对 pet 先执行离线状态衰减结算。
3. 校验 food 库存数量。
4. 在 transaction 中扣除库存、更新 pet 状态、写 interaction log。
5. 返回最新 `pet`、`inventory` 或兼容 `foods`、`logs`，以及可选 `offlineDecay`。

库存扣减必须具备并发保护，不能出现 `count < 0`。V1 前端做请求锁，后端使用事务和库存条件更新；本轮暂不做 idempotency key。

## 成功响应

```json
{
  "success": true,
  "data": {
    "pet": {
      "pet_id": "pet_001",
      "name": "Buddy",
      "level": 3,
      "hunger": 80,
      "energy": 72,
      "mood": 68,
      "experience": 120
    },
    "inventory": [
      {
        "itemType": "food",
        "food_type": "energy",
        "food_quality": "normal",
        "count": 2
      }
    ],
    "logs": [
      {
        "kind": "feed",
        "title": "使用口粮",
        "detail": "已使用普通体力口粮",
        "timestamp": "2026-05-09T10:00:00.000Z"
      }
    ],
    "offlineDecay": {
      "applied": true,
      "elapsedHours": 5,
      "message": "已先结算离线状态，再使用口粮。"
    }
  }
}
```

短期可返回 `foods` 替代 `inventory`，前端会兼容；长期建议以 `inventory` 作为背包语义字段。

## 失败语义

- `400 INVALID_ITEM`：道具类型、food_type 或 food_quality 不合法。
- `401 UNAUTHORIZED`：未登录或 token 失效。
- `403 FORBIDDEN`：当前用户无权操作该 pet。
- `404 PET_NOT_FOUND`：pet 不存在或不可访问。
- `409 INSUFFICIENT_INVENTORY`：库存不足。
- `409 INVENTORY_CONFLICT`：并发扣减冲突或库存状态已变化。
- `500 INTERNAL_ERROR`：服务端异常。

失败响应不应修改 `pet`、`inventory`，也不应写入成功 interaction log。

## 库存列表策略

- 后端可以返回 `count: 0` 的库存项，也可以只返回用户拥有的库存项。
- 前端只展示后端返回内容。
- 如果后端不返回某个 0 库存道具，前端不会自行补齐或展示该道具。

## 验收场景

- dashboard 返回 food 库存后，打开背包能看到返回项的名称、占位图标、数量、效果说明、使用按钮。
- 如果后端返回 `count: 0` 的道具，该道具显示“已用完”并不可点击。
- 如果后端不返回某个 0 库存道具，前端不补齐、不展示。
- 点击可用食物后，Network 出现 `POST /api/v1/pets/{petId}/inventory/use`。
- 成功后左侧状态栏刷新为接口返回的 `pet`，背包数量刷新为接口返回的 `inventory / foods`。
- 右侧日志展示接口返回的 `logs`；若无 `logs`，前端只显示临时提示，不写入 `mainEvents`。
- 离线 5 小时后不先进 dashboard，直接使用背包食物：后端先返回 `offlineDecay` 并完成衰减结算，再应用食物效果。
- use 接口成功但返回缺少 `inventory / foods`：前端不本地推算库存，尝试重新请求 dashboard；刷新失败则保留旧状态并提示稍后重试。
- 接口失败或返回不完整时，前端不扣本地库存、不修改正式 pet 状态、不写入 `mainEvents`。
- 连续点击同一道具只发起一次有效请求，后端也不会重复扣库存或扣成负数。
