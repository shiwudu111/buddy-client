# buddy-client 协作者必读 - 项目背景

**版本**：V1.0  
**更新**：2026-04-13  
**面向**：所有只看 buddy-client 仓库的开发者、设计者、测试者

---

## 项目是什么

学伴精灵（Buddy）是一款 AI 陪伴电子宠物产品，面向儿童与家长双端用户。
核心体验：孩子与 AI 宠物互动、完成作业、获得成长反馈。

---

## 团队构成

| 角色 | 负责人 | 职责范围 |
|------|--------|----------|
| 老板 | X | 产品方向、资源协调、人工审核 |
| TA-OpenClaw | AI（我） | 技术美术、buddy-client 客户端开发、项目统筹 |
| Cipher | AI Agent | buddy-server 后端 API、数据库、系统架构 |

**注意**：你和 TA-OpenClaw、Cipher 都是 AI Agent，但各司其职，不要跨职责操作。

---

## 产品边界（当前 MVP 范围）

- **目标用户**：儿童（学生端）+ 家长（家长端）
- **核心功能**：登录、宠物互动、作业完成、家长监管
- **当前阶段**：最小可行产品（MVP）推进中
- **不做**：多端实时同步、复杂社交功能、付费体系

详见完整版 PRD：`workspace-main/docs/01-产品与范围/PRD-电子宠物成长计划-V2.1.md`

---

## 客户端与后端的关系

```
buddy-client（Cocos Creator 3.8.7）
        ↕  REST API
buddy-server（Bun + Hono + Prisma + PostgreSQL）
        ↕  AI API
阿里云 DashScope（通义千问）
```

- **客户端不直接连 AI**，所有 AI 能力通过 buddy-server 转发
- **接口基线**：`buddy-client/docs/03-API接口/API-MVP-BASELINE-V1.0.md`
- **完整接口清单**：`workspace-main/docs/03-API接口/API-LIST.md`（权威版）

---

## 当前目标（2026-04）

**客户端主轴**：UI 固化 + 联调推进

1. Login 模块重构完成，已提交审核
2. Home 作业页面绑定进行中
3. 家长端冒烟测试待跑
4. 完整联调测试即将启动

---

## 禁止事项（必须遵守）

- ❌ 不允许 Agent 直接 push 到远端仓库
- ❌ 不允许绕过人工审核流程
- ❌ 客户端代码不得硬编码后端接口地址（统一走配置）
- ❌ 不允许在 Cocos scene 文件中手改脚本引用（会损坏 scene）

---

## 更多信息

| 你需要什么 | 去哪里 |
|-----------|--------|
| 产品需求（完整） | `workspace-main/docs/01-产品与范围/` |
| 技术方案（完整） | `workspace-main/docs/02-技术方案/` |
| 决策记录（完整） | `workspace-main/docs/05-决策记录/` |
| 项目总状态 | `workspace-main/docs/06-项目状态/CURRENT-STATUS.md` |
| 客户端专用规范 | `./CLIENT-COLLAB-RULES.md` |
| **如果看不到 workspace-main/docs** | 本文件 + README.md + CURRENT-STATUS.md 至少保证你不会完全失真 |

---

> ⚠️ 本文件是面向客户端协作者的项目背景摘要。
> 完整权威版本请始终参考 `workspace-main/docs/`。
