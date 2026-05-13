# 学习任务奖励接入 V1 后端联调方案

## 目标

本阶段接入“提交作业 -> 后端轻量判断质量 -> 发放粮食到背包 -> 写 interaction log -> 前端刷新库存 -> 日记读取后端 logs”的最小闭环。

作业系统负责产出奖励；背包系统负责消耗奖励。作业提交只增加库存，不直接修改宠物状态。使用粮食仍走 `POST /api/v1/pets/:petId/inventory/use`。

## 前端边界

- 复用现有作业中心，不重做作业系统页面，不新增独立作业 Tab。
- 前端只做最小必填校验：`subject` 必选，至少 1 张图片必填，`note` 可选。
- 前端不判断质量、不发奖励、不本地增加库存、不修改 pet、不写 `diaryDays`、不伪造 interaction log。
- 若提交响应返回 `logs`，前端可刷新 Main 右侧最近日志；日记仍只通过 `GET /api/v1/pets/:petId/logs?days=7` 读取。

## 图片上传接口

Method: `POST`

Path: `/api/v1/homeworks/uploads`

Content-Type: `multipart/form-data`

字段：

```text
file
```

成功响应兼容：

```json
{
  "success": true,
  "data": {
    "url": "https://example.com/homework.png",
    "imageUrl": "https://example.com/homework.png"
  }
}
```

前端会使用 `FormData`，且不会手动设置 `Content-Type`，由运行环境自动携带 multipart boundary。

## 作业提交接口

Method: `POST`

Path: `/api/v1/homeworks/submit`

请求：

```json
{
  "subject": "math",
  "imageUrls": ["https://example.com/homework.png"],
  "imageUrl": "https://example.com/homework.png",
  "note": "可选备注",
  "petId": "pet_001"
}
```

说明：

- V1 UI 只支持上传 1 张图片。
- `imageUrls` 只是接口兼容，不代表本轮做多图。
- `imageUrl` 兼容旧字段，取同一张图片。
- `petId` 建议携带；如果后端能从当前登录学生推导默认 pet / inventory，可兼容不传。
- 如果前端当前没有有效 `petId`，不会发起奖励型提交。

## 质量与奖励状态

`qualityLevel`：

- `invalid`：无效提交，不发奖励。
- `basic`：有效提交，发普通科目粮食 1 个。
- `good`：较完整提交，发稍好一点的同科目粮食 1 个。

`good` 不等于稀有或高价值奖励。若 `premium` 在当前系统中过强，后端可配置 `good` 仍发 `normal`，或限制为轻微提升。

`rewardStatus`：

- `granted`：已发奖励。
- `capped`：作业已保存，但今日奖励次数已用完。
- `rejected`：提交无效，不发奖励。
- `none`：已保存但本次不产生奖励。

建议失败码：

- `INVALID_SUBJECT`
- `EMPTY_CONTENT`
- `UPLOAD_REQUIRED`
- `DAILY_REWARD_LIMIT_REACHED`
- `DUPLICATE_SUBMISSION`
- `UPLOAD_FAILED`
- `PET_NOT_FOUND`
- `INVENTORY_NOT_FOUND`
- `INTERNAL_ERROR`

## 推荐成功响应

```json
{
  "success": true,
  "data": {
    "submission": {
      "id": "sub_001",
      "subject": "math",
      "qualityLevel": "basic",
      "rewardStatus": "granted"
    },
    "reward": {
      "items": [
        {
          "itemType": "food",
          "food_type": "logic_cookie",
          "food_quality": "normal",
          "count": 1
        }
      ],
      "message": "完成数学作业，获得逻辑饼干 ×1"
    },
    "inventory": [],
    "foods": [],
    "logs": []
  }
}
```

`capped / rejected / none` 时 `reward.items` 返回空数组，不增加库存。

## 奖励规则 V1

支持科目：

- `chinese`
- `math`
- `english`
- `general`

科目与粮食映射建议：

- `chinese -> expression_fruit`，展示名：表达果实，主要作用：mood
- `math -> logic_cookie`，展示名：逻辑饼干，主要作用：energy
- `english -> star_milk`，展示名：星星牛奶，主要作用：mood + hunger
- `general -> meal_box`，展示名：营养便当，主要作用：hunger

限制：

- 每次有效提交最多发 1 个 food。
- 每日作业奖励最多 3 次。
- 同一科目每日 1-2 次作为后端预留规则。
- 每日基础粮食本轮只预留，不作为本轮验收项；若后端已有 dashboard 自动发放能力，前端只展示返回库存，不新增领取按钮。

## 后端执行要求

1. 校验登录态。
2. 确认 student / pet / inventory 归属。
3. 保存作业提交。
4. 轻量判断质量。
5. 检查每日奖励上限和重复提交。
6. 按科目与质量发放最多 1 个粮食。
7. 增加库存。
8. 写 interaction log。
9. 返回 `submission / reward / inventory 或 foods / logs`。
10. 使用 transaction 保证作业保存、奖励发放、库存增加、日志写入一致。

推荐日志文案：`完成数学作业，获得逻辑饼干 ×1。`

## 验收

- 上传图片请求为 `multipart/form-data`，字段名 `file`。
- 未上传图片或上传失败时，提交不会获得奖励。
- 有效数学作业返回 `qualityLevel = basic | good`、`rewardStatus = granted`、`logic_cookie ×1`。
- `granted` 后库存增加，并返回 `inventory / foods`；若暂未返回，前端会请求 dashboard 兜底刷新。
- `capped / rejected / none` 不增加库存。
- 作业奖励日志能通过 `GET /api/v1/pets/:petId/logs?days=7` 读取。
- 背包使用仍由 `/pets/:petId/inventory/use` 扣库存并更新 pet。
