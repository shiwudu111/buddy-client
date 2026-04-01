# 学伴精灵 MVP API 基线 V1.0

## 文档信息
- **整理时间**：2026-04-01
- **整理来源**：
  - `API-LIST.md`
  - `API接口清单.md`
  - 当前客户端实现：`assets/scripts/network/ApiClient.ts`
- **状态**：当前有效

## 整理原则
1. 以 `DECISION-RESULT-FROZEN-V1.0.md` 的冻结范围为上位约束。
2. 以当前客户端已经实际消费的接口为第一优先级。
3. 旧草案中超出 MVP 或与现状冲突的内容，移入归档，不再并列生效。

## 通用约定
- **Base URL**：`/api/v1`
- **认证方式**：`Authorization: Bearer <token>`
- **传输格式**：JSON
- **统一响应**：

```json
{
  "success": true,
  "data": {},
  "message": "optional"
}
```

- **统一错误响应**：

```json
{
  "success": false,
  "message": "错误描述"
}
```

## 角色与命名统一
- 当前客户端以 `username + password` 作为登录输入。
- 当前有效角色枚举：`CHILD | PARENT`
- 旧文档中的以下版本已失效并归档：
  - `phone` 登录主方案
  - `student / parent / admin` 角色枚举
  - `/parents/*` 大量扩展接口草案

## 当前有效接口清单

### 一、认证模块

#### 1. 注册
```http
POST /api/v1/auth/register
```

**请求体**
```json
{
  "username": "student123",
  "password": "SecurePass123",
  "email": "student@example.com",
  "role": "CHILD"
}
```

**响应体**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "student123",
      "email": "student@example.com",
      "role": "CHILD"
    },
    "token": "jwt_token"
  }
}
```

#### 2. 登录
```http
POST /api/v1/auth/login
```

**请求体**
```json
{
  "username": "student123",
  "password": "SecurePass123"
}
```

**响应体**
- 与注册接口一致。

#### 3. 获取当前用户
```http
GET /api/v1/auth/me
```

**说明**
- 当前客户端已消费。
- 返回当前 token 对应的用户信息。

#### 4. 刷新 Token
```http
POST /api/v1/auth/refresh
```

**状态**
- 保留为联调预留接口。
- 当前客户端尚未消费。

### 二、宠物模块

#### 1. 创建宠物
```http
POST /api/v1/pets
```

**请求体**
```json
{
  "name": "Buddy"
}
```

**响应字段**
```json
{
  "success": true,
  "data": {
    "pet_id": "uuid",
    "name": "Buddy",
    "level": 1,
    "hunger": 100,
    "mood": 100,
    "experience": 0,
    "stage": "stage_1",
    "status": true
  }
}
```

#### 2. 获取宠物状态
```http
GET /api/v1/pets/{petId}
```

**说明**
- 当前客户端已消费。
- 当前客户端依赖字段：`pet_id`、`name`、`level`、`hunger`、`mood`、`experience`。

#### 3. 更新宠物资源
```http
PATCH /api/v1/pets/{petId}/resources
```

**请求体**
```json
{
  "fullness_delta": 15,
  "mood_delta": 5,
  "growth_delta": 0,
  "reason": "manual_feed"
}
```

**响应体**
```json
{
  "success": true,
  "data": {
    "hunger": 95,
    "mood": 90,
    "experience": 12,
    "isAlive": true,
    "events": []
  }
}
```

**兼容说明**
- 当前客户端已经使用 `fullness_delta / growth_delta` 作为请求字段。
- 当前返回字段仍以 `hunger / experience` 暴露给客户端。
- 后续若统一命名，必须同步修改 server / client / types，不允许只改一侧。

#### 4. 获取进化信息
```http
GET /api/v1/pets/{petId}/evolution
```

**状态**
- 作为第 2 周接口预留。

### 三、作业模块

#### 1. 提交作业
```http
POST /api/v1/homeworks/submit
```

**请求体**
```json
{
  "subject": "math",
  "content": "today homework",
  "imageUrl": "https://example.com/homework.png"
}
```

**响应体**
```json
{
  "success": true,
  "data": {
    "expReward": 10
  }
}
```

**说明**
- 当前客户端已按 JSON 方式接入。
- 真正图片上传可在不破坏语义的前提下升级为 `multipart/form-data`。

#### 2. 获取作业历史
```http
GET /api/v1/homeworks/history?page=1&limit=10
```

**响应体**
```json
{
  "success": true,
  "data": {
    "list": [
      {
        "id": "uuid",
        "subject": "math",
        "content": "today homework",
        "imageUrl": null,
        "score": 85,
        "feedback": "完成得不错",
        "createdAt": "2026-04-01T10:00:00Z"
      }
    ],
    "total": 1,
    "page": 1,
    "limit": 10
  }
}
```

#### 3. 今日作业状态
```http
GET /api/v1/homeworks/status
```

**状态**
- 预留接口，当前客户端尚未消费。

### 四、家长模块

#### 1. 查看孩子宠物状态
```http
GET /api/v1/parent/pet/{childId}
```

**响应体**
```json
{
  "success": true,
  "data": {
    "pet": {
      "name": "Buddy",
      "level": 1,
      "status": true,
      "hunger": 80,
      "mood": 90
    },
    "today_homework": {
      "math": { "score": 90 },
      "english": null
    }
  }
}
```

#### 2. 绑定孩子
```http
POST /api/v1/parent/bind
```

**状态**
- 预留接口。
- 绑定关系以数据库基线中的 `users.child_id` 方案为准。

#### 3. 家长周报
```http
GET /api/v1/parent/report/weekly?child_id=uuid
```

**状态**
- 冻结决策要求“留壳”。
- 当前只要求固定响应结构，不要求完整统计实现。

## 当前客户端已实际使用的接口
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`
- `POST /pets`
- `GET /pets/{petId}`
- `PATCH /pets/{petId}/resources`
- `POST /homeworks/submit`
- `GET /homeworks/history`
- `GET /parent/pet/{childId}`

## 非当前基线内容
以下内容已不再作为当前有效接口基线：
- 手机号注册登录主方案
- `student / parent / admin` 三角色设计
- 扩展版 `/parents/children/*` 接口族
- 多宠物类型、宠物玩耍、复杂老师/管理员流程

## 后续维护要求
- 新增或删除接口时，先更新本文件，再更新客户端类型与调用代码。
- 任何接口命名变更，都必须同步：
  - `assets/scripts/network/ApiClient.ts`
  - `assets/scripts/types/api.ts`
  - 本文档
