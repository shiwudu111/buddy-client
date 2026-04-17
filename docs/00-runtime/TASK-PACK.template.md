# TASK-PACK.template.md

> 使用方式：
> 1. 复制为 `TASK-<slug>.md`
> 2. 补齐 Objective / Allowed Files / Done When
> 3. 交给 Builder Agent
> 4. Reviewer 只看这个任务包，不看聊天记录脑补需求

---

## 0. Meta

- Task ID: `TASK-<slug>`
- Title: `<task-title>`
- Repo: `buddy-client`
- Owner: `<your-name>`
- Builder: `<agent-name>`
- Reviewer: `<agent-name>`
- Priority: `P0 | P1 | P2`
- Status: `todo | doing | review | done | blocked`
- Depends On: `<none / task-id>`
- Updated At: `<yyyy-mm-dd hh:mm>`

---

## 1. Objective

本任务唯一业务结果：

`<只写一个结果，不能写成一串愿望清单>`

成功定义：

- `<结果 1>`
- `<结果 2>`
- `<结果 3>`

非目标：

- `<本任务明确不追求的东西>`
- `<不做视觉扩展 / 不做顺手重构 / 不改接口>`

---

## 2. Why This Task Exists

当前问题：

- `<当前缺陷 / 阻塞 / 收口点>`

为什么现在做：

- `<和当前 sprint / 验收 / 阻塞的关系>`

---

## 3. Source of Truth

按优先级从高到低：

1. `CURRENT-SOURCE-OF-TRUTH.md`
2. `<当前验收清单>`
3. `<当前模块说明 / 冻结说明>`
4. `<补充文档>`

若冲突：
- 以 `CURRENT-SOURCE-OF-TRUTH.md` 为准
- 不自行裁决历史矛盾
- 在交付中标记 `Needs Owner Decision`

---

## 4. Scope

### In Scope
- `<允许做的点 1>`
- `<允许做的点 2>`
- `<允许做的点 3>`

### Out of Scope
- `<明确不做的点 1>`
- `<明确不做的点 2>`
- `<明确不做的点 3>`

---

## 5. Allowed Files

只允许修改以下文件 / 目录：

- `<path-1>`
- `<path-2>`
- `<path-3>`

若确实需要越界：
- 不要直接改
- 在交付中列出 `Required Extra File Changes`

---

## 6. Forbidden Files

禁止修改：

- `<path-a>`
- `<path-b>`
- `<path-c>`

这些文件即使“顺手改一下更合理”，也不能碰。

---

## 7. Current Contract

必须遵守的接口 / 状态 / 口径：

- `<contract 1>`
- `<contract 2>`
- `<contract 3>`

不能改变的内容：

- `<字段语义>`
- `<状态码语义>`
- `<业务边界>`
- `<流程跳转规则>`

---

## 8. Implementation Constraints

必须遵守：

- 最小改动
- 不新增需求分支
- 不顺手扩视觉
- 不顺手做无关重构
- 不新增接口
- 不自行发明字段 / 状态 / 文案语义

优先策略：

1. 修正现有流程
2. 补齐当前缺失状态
3. 补齐真实失败提示
4. 最后才做局部整理

---

## 9. Done When

只有同时满足以下条件，任务才算完成：

- [ ] `<验收条件 1>`
- [ ] `<验收条件 2>`
- [ ] `<验收条件 3>`
- [ ] 无新增 P0 / P1
- [ ] 无明显越界改动
- [ ] 无和当前真相冲突的实现

---

## 10. Self-Test Checklist

Builder 必须自测并在交付中回答：

- [ ] 正常路径通过
- [ ] 空态路径真实
- [ ] 失败路径真实
- [ ] 返回 / 刷新 / 重进路径真实
- [ ] 控制台无新增高频报错
- [ ] 状态不会跨会话污染

---

## 11. Deliverables

交付必须包含：

1. 改了哪些文件
2. 每个文件改动目的
3. 自测结果
4. 风险点
5. 未解决项
6. 需要 Owner 决策的点

---

## 12. Output Format Required From Builder

Builder 输出必须严格按下面格式：

### Summary
- `<一句话总结完成了什么>`

### Files Changed
- `<file>`: `<why>`

### What Was Implemented
- `<implemented 1>`
- `<implemented 2>`

### Self-Test
- `<test item>`: `pass | fail | not run`

### Risks
- `<risk 1>`
- `<risk 2>`

### Needs Owner Decision
- `<decision 1 or none>`

### Notes
- `<extra note or none>`