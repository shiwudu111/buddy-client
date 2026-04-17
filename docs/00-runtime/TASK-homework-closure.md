# TASK-homework-closure.md

## 0. Meta

- Task ID: `TASK-homework-closure`
- Title: `Homework 主链路收口到验收级别`
- Repo: `buddy-client`
- Owner: `<your-name>`
- Builder: `codex-builder`
- Reviewer: `codex-reviewer`
- Priority: `P0`
- Status: `todo`
- Depends On: `none`
- Updated At: `2026-04-15`

---

## 1. Objective

本任务唯一业务结果：

**把 `Homework` 收口到当前 sprint 的验收级别。**

成功定义：

- 提交可用
- 草稿可用
- 切科目可用
- 提交后刷新真实
- 返回总览可用

非目标：

- 不做视觉扩展
- 不做 AI 对话相关内容
- 不扩新交互分支
- 不改登录 / 家长端逻辑
- 不新增接口

---

## 2. Why This Task Exists

当前问题：

- `Homework` 是本轮明确要求收口到验收级别的主链路模块
- 若该链路不稳定，会直接造成主链路数据断点

为什么现在做：

- 当前项目已进入主链路收口阶段
- `Homework` 是本轮最核心的收口点之一

---

## 3. Source of Truth

1. `CURRENT-SOURCE-OF-TRUTH.md`
2. `两天冲刺目标-V1.0.md`
3. `客户端联调验收清单-V1.0.md`
4. `客户端架构设计-V1.0.md`

若冲突：
- 以 `CURRENT-SOURCE-OF-TRUTH.md` 为准
- 不扩展到其他模块

---

## 4. Scope

### In Scope
- Homework 提交流程
- 草稿保存 / 读取
- 学科切换后的状态保持
- 提交后的刷新与状态同步
- 返回总览后的结果一致性

### Out of Scope
- AI 对话
- 新视觉样式
- 复杂评分逻辑
- 其他模块顺手重构
- 新增接口或改字段语义

---

## 5. Allowed Files

- `assets/scripts/ui/homework/**`
- `assets/scripts/services/HomeworkService.ts`
- `assets/scripts/app/AppState.ts`
- `assets/scripts/types/**` （仅在确有必要且不改语义时）
- `assets/scripts/utils/**` （仅限 Homework 相关）

---

## 6. Forbidden Files

- `assets/scripts/ui/login/**`
- `assets/scripts/ui/main/**`（除非 Homework 总览返回必须经过最小改动接入）
- `assets/scripts/ui/login/**`
- `docs/**`
- `assets/scripts/services/AuthService.ts`
- `assets/scripts/services/ParentService.ts`

---

## 7. Current Contract

必须遵守：

- `Homework` 本轮唯一收口目标是：提交 / 草稿 / 切科目 / 提交后刷新 / 返回总览
- 不扩视觉
- 不扩新交互
- 不新增接口
- 不改当前正式业务边界

不能改变：

- 当前接口字段语义
- 当前主链路顺序
- 当前错误提示的真实性原则

---

## 8. Implementation Constraints

- 以最小改动修正现有流程
- 优先保证真实刷新和真实状态同步
- 草稿必须按学科隔离，不可互相覆盖
- 若发现需要大改结构，先用最小补丁收口，不做横向重构

---

## 9. Done When

- [ ] 作业提交成功 / 失败提示真实
- [ ] 草稿按学科独立保存
- [ ] 学科切换不会污染别的学科草稿
- [ ] 提交后刷新结果真实
- [ ] 返回总览后状态一致
- [ ] 无新增 P0 / P1
- [ ] 控制台无新增高频错误
- [ ] 不影响 Login / Parent / First-pet

---

## 10. Self-Test Checklist

- [ ] 正常提交通过
- [ ] 空内容 / 非法内容失败提示真实
- [ ] 草稿保存后切换学科再返回仍正确
- [ ] 提交后今日状态可见
- [ ] 返回总览后不误报成功
- [ ] 刷新后状态不丢失
- [ ] 无跨会话污染

---

## 11. Deliverables

1. 文件改动列表
2. 关键逻辑说明
3. 自测记录
4. 风险点
5. 未解决项
6. 需要 Owner 决策的点

---

## 12. Output Format Required From Builder

### Summary
- ...

### Files Changed
- ...

### What Was Implemented
- ...

### Self-Test
- ...

### Risks
- ...

### Needs Owner Decision
- ...

### Notes
- ...