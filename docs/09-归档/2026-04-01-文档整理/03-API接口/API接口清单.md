# 学伴精灵MVP API接口清单

## 概述
- **API版本**: v1
- **认证方式**: JWT Bearer Token
- **响应格式**: JSON
- **错误处理**: 统一错误响应格式
- **分页**: 支持limit/offset分页

## 接口分类

### 1. 认证模块 (auth)

#### 1.1 用户注册
```
POST /api/v1/auth/register
```

**请求体:**
```json
{
  "username": "student123",
  "email": "student@example.com",
  "password": "SecurePass123!",
  "full_name": "张三",
  "role": "student"  // student, parent, admin
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "username": "student123",
      "email": "student@example.com",
      "full_name": "张三",
      "role": "student",
      "created_at": "2026-03-23T10:00:00Z"
    },
    "tokens": {
      "access_token": "jwt_token",
      "refresh_token": "refresh_token",
      "expires_in": 604800
    }
  }
}
```

#### 1.2 用户登录
```
POST /api/v1/auth/login
```

**请求体:**
```json
{
  "email": "student@example.com",
  "password": "SecurePass123!"
}
```

**响应:** 同注册响应

#### 1.3 刷新令牌
```
POST /api/v1/auth/refresh
```

**请求头:**
```
Authorization: Bearer {refresh_token}
```

#### 1.4 获取当前用户信息
```
GET /api/v1/auth/me
```

**请求头:**
```
Authorization: Bearer {access_token}
```

#### 1.5 用户登出
```
POST /api/v1/auth/logout
```

**请求头:**
```
Authorization: Bearer {access_token}
```

### 2. 宠物模块 (pets)

#### 2.1 创建宠物
```
POST /api/v1/pets
```

**请求头:**
```
Authorization: Bearer {access_token}
```

**请求体:**
```json
{
  "name": "小星星",
  "type": "cat"  // cat, dog, rabbit, dragon
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "小星星",
    "type": "cat",
    "stage": "egg",
    "level": 1,
    "fullness": 100,
    "mood": 100,
    "growth": 0,
    "hp": 100,
    "created_at": "2026-03-23T10:00:00Z"
  }
}
```

#### 2.2 获取宠物列表
```
GET /api/v1/pets
```

**查询参数:**
- `limit`: 每页数量，默认20
- `offset`: 偏移量，默认0

#### 2.3 获取宠物详情
```
GET /api/v1/pets/{pet_id}
```

#### 2.4 更新宠物信息
```
PATCH /api/v1/pets/{pet_id}
```

**请求体:**
```json
{
  "name": "新名字"
}
```

#### 2.5 喂养宠物
```
POST /api/v1/pets/{pet_id}/feed
```

**请求体:**
```json
{
  "food_type": "regular",  // regular, premium, special
  "amount": 1
}
```

#### 2.6 与宠物玩耍
```
POST /api/v1/pets/{pet_id}/play
```

**请求体:**
```json
{
  "toy_type": "ball",  // ball, puzzle, interactive
  "duration": 10  // 分钟
}
```

#### 2.7 宠物进化检查
```
GET /api/v1/pets/{pet_id}/evolution-check
```

### 3. 作业模块 (homework)

#### 3.1 提交作业
```
POST /api/v1/homeworks
```

**请求头:**
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**表单字段:**
- `subject`: 科目（chinese, math, english, science, art）
- `content`: 作业内容（文字，可选）
- `image`: 作业图片文件（可选）
- `description`: 作业描述（可选）

**业务规则:**
- 每个学生每天每科只能提交一次作业
- 图片大小限制10MB
- 支持jpg, png格式

#### 3.2 获取作业列表
```
GET /api/v1/homeworks
```

**查询参数:**
- `subject`: 按科目筛选
- `status`: 按状态筛选（submitted, reviewed, graded, returned）
- `start_date`: 开始日期
- `end_date`: 结束日期
- `limit`: 每页数量
- `offset`: 偏移量

#### 3.3 获取作业详情
```
GET /api/v1/homeworks/{homework_id}
```

#### 3.4 更新作业状态（老师/家长）
```
PATCH /api/v1/homeworks/{homework_id}/status
```

**请求体:**
```json
{
  "status": "reviewed",
  "feedback": "作业完成得很好！",
  "score": 95
}
```

**权限要求:** teacher或parent角色

#### 3.5 删除作业
```
DELETE /api/v1/homeworks/{homework_id}
```

**权限要求:** 只能删除自己的作业

### 4. 对话模块 (chat)

#### 4.1 与宠物对话
```
POST /api/v1/pets/{pet_id}/chat
```

**请求体:**
```json
{
  "message": "今天学习好累啊",
  "context": "after_homework"  // morning, afternoon, evening, after_homework, before_sleep
}
```

**响应:**
```json
{
  "success": true,
  "data": {
    "pet_response": "辛苦了！完成作业的你真棒！",
    "mood_impact": 5,
    "conversation_id": "uuid",
    "created_at": "2026-03-23T10:00:00Z"
  }
}
```

**预设回复规则:**
- 根据宠物心情值调整回复内容
- 根据对话上下文选择回复模板
- 记录对话历史（最近10条）

#### 4.2 获取对话历史
```
GET /api/v1/pets/{pet_id}/conversations
```

**查询参数:**
- `limit`: 返回数量，默认10
- `offset`: 偏移量

#### 4.3 获取对话统计
```
GET /api/v1/pets/{pet_id}/conversations/stats
```

**响应:**
```json
{
  "success": true,
  "data": {
    "total_conversations": 45,
    "today_conversations": 3,
    "average_mood_impact": 2.5,
    "most_active_time": "evening"
  }
}
```

### 5. 家长模块 (parents)

#### 5.1 绑定孩子
```
POST /api/v1/parents/bind-child
```

**请求体:**
```json
{
  "child_email": "child@example.com",
  "relationship": "father"  // father, mother, guardian
}
```

**业务规则:**
- 家长角色才能绑定
- 需要孩子确认（发送确认邮件）
- 一个家长最多绑定3个孩子（MVP限制）

#### 5.2 获取绑定孩子列表
```
GET /api/v1/parents/children
```

#### 5.3 解除绑定
```
DELETE /api/v1/parents/children/{child_id}
```

#### 5.4 查看孩子宠物状态
```
GET /api/v1/parents/children/{child_id}/pet
```

#### 5.5 查看孩子作业记录
```
GET /api/v1/parents/children/{child_id}/homeworks
```

**查询参数:**
- `subject`: 按科目筛选
- `start_date`: 开始日期
- `end_date`: 结束日期
- `limit`: 每页数量
- `offset`: 偏移量

#### 5.6 获取孩子日报
```
GET /api/v1/parents/children/{child_id}/daily-report
```

**查询参数:**
- `date`: 日期，格式YYYY-MM-DD，默认今天

**响应:**
```json
{
  "success": true,
  "data": {
    "date": "2026-03-23",
    "child_info": {
      "name": "张三",
      "grade": "三年级"
    },
    "study_summary": {
      "total_homeworks": 3,
      "completed_homeworks": 3,
      "average_score": 88.3,
      "subjects": ["chinese", "math", "english"]
    },
    "pet_status": {
      "name": "小星星",
      "level": 5,
      "fullness": 85,
      "mood": 90,
      "growth": 45
    },
    "conversation_summary": {
      "total_today": 5,
      "positive_interactions": 4,
      "average_mood_impact": 3.2
    },
    "recommendations": [
      "数学作业需要加强练习",
      "宠物心情良好，继续保持"
    ]
  }
}
```

#### 5.7 获取孩子周报（接口留壳）
```
GET /api/v1/parents/children/{child_id}/weekly-report
```

**MVP阶段**: 返回固定结构，实际数据待实现

## 通用接口

### 健康检查
```
GET /api/v1/health
```

**响应:**
```json
{
  "status": "healthy",
  "timestamp": "2026-03-23T10:00:00Z",
  "services": {
    "database": "connected",
    "redis": "connected",
    "storage": "available"
  },
  "version": "1.0.0"
}
```

### 系统信息
```
GET /api/v1/system/info
```

## 错误响应格式

### 通用错误
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "错误描述",
    "details": {}  // 可选，详细错误信息
  }
}
```

### 常见错误码
- `AUTH_REQUIRED`: 需要认证
- `INVALID_TOKEN`: 令牌无效
- `PERMISSION_DENIED`: 权限不足
- `VALIDATION_ERROR`: 参数验证失败
- `RESOURCE_NOT_FOUND`: 资源不存在
- `RATE_LIMIT_EXCEEDED`: 请求过于频繁
- `INTERNAL_ERROR`: 服务器内部错误

## 速率限制

### 认证接口
- 登录: 5次/15分钟/IP
- 注册: 3次/小时/IP

### 普通接口
- 100次/15分钟/IP

### 高频接口
- 宠物交互: 30次/分钟/用户
- 作业提交: 10次/小时/用户

## 数据验证规则

### 用户注册
- 用户名: 3-20字符，字母数字下划线
- 邮箱: 有效邮箱格式
- 密码: 8-32字符，包含大小写字母和数字
- 角色: 必须是student, parent, admin之一

### 作业提交
- 科目: 必须是支持的科目
- 图片: 最大10MB，支持jpg, png
- 内容: 最大1000字符

### 宠物交互
- 食物类型: 必须是支持的类型
- 玩具类型: 必须是支持的类型
- 持续时间: 1-60分钟

## API版本管理

### 版本策略
- URL路径包含版本号: `/api/v1/`
- 向后兼容至少一个主要版本
- 废弃的API有6个月过渡期

### 版本迁移
1. 新版本发布时，旧版本继续支持
2. 文档明确标注废弃时间
3. 客户端有足够时间迁移

## 安全考虑

### 认证安全
- JWT令牌有效期: 7天（access）, 30天（refresh）
- 密码使用bcrypt哈希
- 敏感操作需要二次验证（预留）

### 数据安全
- 用户数据隔离
- 家长只能访问绑定孩子的数据
- 敏感信息脱敏

### API安全
- HTTPS强制使用
- CORS严格配置
- 输入验证和清理
- SQL注入防护

## 监控和日志

### 监控指标
- API响应时间
- 错误率
- 请求量
- 资源使用率

### 日志记录
- 所有API请求日志
- 错误日志
- 安全事件日志
- 业务操作日志

---
*版本：v1.0*
*创建时间：2026-03-23*
*负责人：Cipher*