# 第一批接口清单 - 学伴精灵 MVP

## 概述

- **API 风格**: RESTful
- **认证方式**: JWT (Bearer Token)
- **数据格式**: JSON
- **基础路径**: `/api/v1`

---

## 📋 接口总览

| 模块 | 接口数 | 优先级 |
|------|--------|--------|
| 认证 (Auth) | 3 | P0 |
| 宠物 (Pet) | 4 | P0 |
| 作业 (Homework) | 4 | P1 |
| 对话 (Chat) | 2 | P1 |
| 家长 (Parent) | 3 | P2 |
| **合计** | **16** | |

---

## 🔐 认证模块 (Auth) - P0

### 1. 用户注册

```
POST /api/v1/auth/register
```

**请求体**:
```json
{
  "phone": "13800138000",
  "password": "securePassword123",
  "nickname": "小明",
  "role": "child",
  "parent_phone": "13800138001"
}
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "token": "jwt_token_here"
  }
}
```

**校验规则**:
- phone: 11位手机号
- password: 6-20位字母数字
- role: child | parent

---

### 2. 用户登录

```
POST /api/v1/auth/login
```

**请求体**:
```json
{
  "phone": "13800138000",
  "password": "securePassword123"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "nickname": "小明",
    "role": "child",
    "token": "jwt_token_here"
  }
}
```

---

### 3. Token 刷新

```
POST /api/v1/auth/refresh
```

**请求头**: `Authorization: Bearer <old_token>`

**响应** (200):
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token"
  }
}
```

---

## 🐾 宠物模块 (Pet) - P0

### 4. 创建宠物

```
POST /api/v1/pets
```

**请求体**:
```json
{
  "name": "小Buddy"
}
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "pet_id": "uuid",
    "name": "小Buddy",
    "level": 1,
    "fullness": 100,
    "mood": 100,
    "growth": 0,
    "stage": 1,
    "status": "alive"
  }
}
```

**业务规则**:
- 每个用户只能创建1只宠物
- 初始资源: 饱食度=100, 心情=100, 成长=0

---

### 5. 获取宠物状态

```
GET /api/v1/pets/:petId
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "pet_id": "uuid",
    "name": "小Buddy",
    "level": 1,
    "exp": 50,
    "fullness": 85,
    "mood": 90,
    "growth": 20,
    "stage": 1,
    "status": "alive",
    "next_evolve_days": 6
  }
}
```

---

### 6. 更新宠物资源（被动接口）

```
PATCH /api/v1/pets/:petId/resources
```

**请求体**:
```json
{
  "fullness_delta": -10,
  "mood_delta": 5,
  "growth_delta": 0,
  "reason": "homework_submit"  // "natural_decay" | "homework_submit"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "fullness": 75,
    "mood": 95,
    "growth": 20,
    "status": "alive",
    "events": ["fullness_below_threshold"]
  }
}
```

**业务规则**:
- 资源衰减时触发状态检查
- 饱食度<20: 状态→hungry
- 心情<20: 状态→depressed
- 饱食度=0: 状态→dead

---

### 7. 获取宠物进化信息

```
GET /api/v1/pets/:petId/evolution
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "current_stage": 1,
    "current_visual": "小碳团",
    "next_stage": 2,
    "next_visual": "机甲犬",
    "requirements": {
      "level": 2,
      "growth": 50
    },
    "days_until_evolution": 6
  }
}
```

---

## 📝 作业模块 (Homework) - P1

### 8. 提交作业

```
POST /api/v1/homeworks
```

**请求体** (multipart/form-data):
```
image: <file>
subject: chinese
```

**响应** (201):
```json
{
  "success": true,
  "data": {
    "homework_id": "uuid",
    "subject": "chinese",
    "score": 85,
    "food_reward": 17,
    "mood_reward": 0,
    "growth_reward": 0,
    "message": "字迹工整，奖励饱食度+17"
  }
}
```

**MVP 简化规则**:
- 科目识别: 预设关键词匹配 → chinese/math/english
- 评分: AI分析 → 0-100分
- 奖励: food = score * 0.2, mood = score * 0.1

**防作弊**:
- 同一科目、7天内重复图片 → 拒绝提交

---

### 9. 获取作业历史

```
GET /api/v1/homeworks?subject=chinese&limit=10&offset=0
```

**响应** (200):
```json
{
  "success": true,
  "data": [
    {
      "homework_id": "uuid",
      "subject": "chinese",
      "score": 85,
      "food_reward": 17,
      "created_at": "2026-03-23T10:00:00Z"
    }
  ]
}
```

---

### 10. 今日作业状态

```
GET /api/v1/homeworks/status
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "chinese": { "submitted": true, "score": 85 },
    "math": { "submitted": false },
    "english": { "submitted": false }
  }
}
```

---

### 11. 删除作业（撤回）

```
DELETE /api/v1/homeworks/:homeworkId
```

**响应** (204): 空

**限制**: 提交后30分钟内可撤回

---

## 💬 对话模块 (Chat) - P1

### 12. 发送对话

```
POST /api/v1/chat
```

**请求体**:
```json
{
  "pet_id": "uuid",
  "message": "今天作业好难啊"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "reply": "没关系的主人，慢慢来~ 我陪着你",
    "mood_factor": 1.0,
    "mood_impact": "stable"
  }
}
```

**MVP 简化**:
- 回复使用预设模板
- mood_factor 基于宠物当前心情

---

### 13. 获取对话历史

```
GET /api/v1/chat/:petId/history?limit=20
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "conversations": [
      { "role": "user", "content": "...", "created_at": "..." },
      { "role": "pet", "content": "...", "created_at": "..." }
    ],
    "mood_factor": 0.9
  }
}
```

---

## 👨‍👩‍👧 家长模块 (Parent) - P2

### 14. 绑定孩子

```
POST /api/v1/parent/bind
```

**请求体**:
```json
{
  "child_phone": "13800138000"
}
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "child_id": "uuid",
    "child_nickname": "小明"
  }
}
```

---

### 15. 查看孩子宠物状态

```
GET /api/v1/parent/pet/:childId
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "pet": {
      "name": "小Buddy",
      "level": 1,
      "status": "alive",
      "fullness": 75,
      "mood": 90
    },
    "today_homework": {
      "chinese": { "score": 85 },
      "math": null,
      "english": null
    }
  }
}
```

---

### 16. 家长使用周报

```
GET /api/v1/parent/report/weekly?child_id=xxx
```

**响应** (200):
```json
{
  "success": true,
  "data": {
    "week": "2026-03-17 ~ 2023-03-23",
    "total_homework": 15,
    "average_score": 82,
    "subject_breakdown": {
      "chinese": { "count": 5, "avg": 85 },
      "math": { "count": 5, "avg": 80 },
      "english": { "count": 5, "avg": 81 }
    },
    "pet_status_summary": {
      "alive_days": 7,
      "hungry_days": 0
    }
  }
}
```

---

## 🔒 通用错误码

| 码 | 说明 |
|----|------|
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 无效 |
| 403 | 无权限 |
| 404 | 资源不存在 |
| 429 | 请求过于频繁 |
| 500 | 服务器错误 |

---

## 📅 开发优先级

**第1周**:
- [ ] Auth: register, login, refresh
- [ ] Pet: create, get, update_resources
- [ ] Homework: submit, status

**第2周**:
- [ ] Chat: send, history
- [ ] Pet: evolution
- [ ] Homework: list, delete

**第3周**:
- [ ] Parent: bind, pet_view, report

---

*文档版本: V1.0*  
*创建时间: 2026-03-23*  
*作者: Cipher (后端开发)*