# 数据库 ER 图 - 学伴精灵 MVP

> ⚠️ **参考副本，非权威源**
> 本文件内容可能与权威版不一致。
> 权威版本位于：`workspace-main/docs/04-数据库/DATABASE-ER.md`
> 如有冲突，**以权威源为准**。
> 最后核对日期：2026-04-13

---

## 文档信息
- **整理时间**：2026-04-01
- **状态**：当前有效
- **对齐依据**：
  - `DECISION-RESULT-FROZEN-V1.0.md`
  - `03-API接口/API-MVP-BASELINE-V1.0.md`

## 核心设计原则
- MVP 阶段只保留 **5 张核心表**
- 关系数据库：PostgreSQL
- ORM：Prisma
- 家长绑定、日报周报都必须在 5 张核心表约束内完成

## 当前有效 5 表
1. `users`
2. `pets`
3. `homeworks`
4. `conversations`
5. `resources`

## ER 关系图

```text
┌─────────────┐        ┌─────────────┐
│    users    │        │    pets     │
├─────────────┤        ├─────────────┤
│ id (PK)     │◄───────│ user_id (FK)│
│ username    │        │ id (PK)     │
│ email       │        │ name        │
│ password    │        │ level       │
│ role        │        │ fullness    │
│ child_id    │        │ mood        │
│ created_at  │        │ growth      │
│ updated_at  │        │ stage       │
└──────┬──────┘        │ status      │
       │               │ created_at  │
       │               │ updated_at  │
       │               └──────┬──────┘
       │                      │
┌──────▼──────┐        ┌──────▼──────────┐
│  homeworks  │        │ conversations   │
├─────────────┤        ├─────────────────┤
│ id (PK)     │        │ id (PK)         │
│ user_id (FK)│        │ pet_id (FK)     │
│ pet_id (FK) │        │ role            │
│ subject     │        │ content         │
│ content     │        │ mood_factor     │
│ image_url   │        │ created_at      │
│ score       │        └─────────────────┘
│ feedback    │
│ rewards...  │        ┌─────────────────┐
│ created_at  │        │   resources     │
└─────────────┘        ├─────────────────┤
                       │ id (PK)         │
                       │ pet_id (FK)     │
                       │ source_type     │
                       │ fullness_delta  │
                       │ mood_delta      │
                       │ growth_delta    │
                       │ homework_id     │
                       │ created_at      │
                       └─────────────────┘
```

## 详细表结构

### 1. users - 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| username | VARCHAR(50) | UNIQUE, NOT NULL | 当前登录主键 |
| email | VARCHAR(255) | UNIQUE, NULL | 可选联系字段 |
| password | VARCHAR(255) | NOT NULL | 密码哈希 |
| role | ENUM('CHILD', 'PARENT') | NOT NULL | 用户角色 |
| child_id | UUID | FK→users.id, NULL | 家长账号绑定的孩子 |
| nickname | VARCHAR(50) | NULL | 展示昵称 |
| avatar | VARCHAR(255) | NULL | 头像 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**说明**
- `child_id` 只在 `PARENT` 角色上使用。
- 多个家长账号都可以指向同一个孩子账号，因此能满足“父母 2 人都可以绑定一个孩子”的冻结决策。
- 旧版 `parent_id` 单字段方案已不再作为当前基线。

**索引**
- `idx_users_username`
- `idx_users_role`
- `idx_users_child_id`

### 2. pets - 宠物表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| user_id | UUID | FK→users.id, UNIQUE | 一个孩子一只宠物 |
| name | VARCHAR(50) | NOT NULL | 宠物名 |
| level | INT | DEFAULT 1 | 等级 |
| fullness | INT | DEFAULT 100 | 内部饱食度 |
| mood | INT | DEFAULT 100 | 心情值 |
| growth | INT | DEFAULT 0 | 内部成长值 |
| stage | INT | DEFAULT 1 | 进化阶段 |
| status | ENUM('alive', 'hungry', 'depressed', 'dead') | DEFAULT 'alive' | 生存状态 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |
| updated_at | TIMESTAMP | DEFAULT NOW() | 更新时间 |

**说明**
- API 对客户端暴露时：
  - `fullness -> hunger`
  - `growth -> experience`

**索引**
- `idx_pets_user_id`
- `idx_pets_status`

### 3. homeworks - 作业记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| user_id | UUID | FK→users.id | 提交人 |
| pet_id | UUID | FK→pets.id | 关联宠物 |
| subject | ENUM('chinese', 'math', 'english') | NOT NULL | 科目 |
| content | TEXT | NULL | 文本内容 |
| image_url | VARCHAR(500) | NULL | 图片地址 |
| image_hash | VARCHAR(128) | NULL | 防重复校验 |
| score | INT | NULL | 评分 |
| feedback | VARCHAR(255) | NULL | 反馈 |
| food_reward | INT | DEFAULT 0 | 饱食奖励 |
| mood_reward | INT | DEFAULT 0 | 心情奖励 |
| growth_reward | INT | DEFAULT 0 | 成长奖励 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

**说明**
- 日报、周报的作业统计以本表为主。
- 防作弊规则使用 `user_id + subject + image_hash + created_at` 组合判断。

**索引**
- `idx_homeworks_user_subject_created`
- `idx_homeworks_pet_created`

### 4. conversations - 对话记录表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| pet_id | UUID | FK→pets.id | 关联宠物 |
| role | ENUM('USER', 'PET') | NOT NULL | 发言角色 |
| content | TEXT | NOT NULL | 对话内容 |
| mood_factor | FLOAT | DEFAULT 1.0 | 心情系数 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

**说明**
- MVP 只需要支持短期记忆与基础历史。
- 若要裁剪历史数量，在业务层控制，不新增额外归档表。

**索引**
- `idx_conversations_pet_created`

### 5. resources - 资源变化表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| id | UUID | PK | 主键 |
| pet_id | UUID | FK→pets.id | 关联宠物 |
| source_type | ENUM('HOMEWORK_REWARD', 'MANUAL_FEED', 'CHAT', 'NATURAL_DECAY', 'ADMIN_ADJUST') | NOT NULL | 资源变化来源 |
| fullness_delta | INT | DEFAULT 0 | 饱食度变化 |
| mood_delta | INT | DEFAULT 0 | 心情变化 |
| growth_delta | INT | DEFAULT 0 | 成长值变化 |
| homework_id | UUID | FK→homeworks.id, NULL | 来源作业 |
| note | VARCHAR(255) | NULL | 备注 |
| created_at | TIMESTAMP | DEFAULT NOW() | 创建时间 |

**说明**
- 这是冻结决策中要求保留的第 5 张核心表。
- 原文档中的 `parent_view_logs` 已移出当前基线，不再占用核心表名额。
- 日报 / 周报里的资源变化摘要应从本表聚合得出。

**索引**
- `idx_resources_pet_created`
- `idx_resources_source_type`

## 关系总结

| 关系 | 类型 | 说明 |
|------|------|------|
| users(CHILD) -> pets | 1:1 | 一个孩子一只宠物 |
| users(CHILD) -> homeworks | 1:N | 一个孩子多次提交作业 |
| users(PARENT) -> users(CHILD) | N:1 | 多个家长可绑定同一个孩子 |
| pets -> homeworks | 1:N | 宠物承接作业奖励 |
| pets -> conversations | 1:N | 宠物拥有多条对话 |
| pets -> resources | 1:N | 宠物拥有多条资源变化记录 |

## 不再作为当前基线的内容
- `parent_view_logs` 作为第 5 张核心表
- `users.parent_id` 单家长绑定方案
- 手机号登录作为唯一主键

## 下一步
1. Prisma Schema 按本文重写或校正
2. API 返回字段与数据库内部字段的映射在 service / adapter 层统一处理
