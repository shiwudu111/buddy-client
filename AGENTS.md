# AGENTS.md

## 本仓库执行边界

- root `../PLAN.md` 是 Buddy 当前任务唯一执行源。
- root `../docs/agent/` 是唯一 Agent 状态账本。
- 本仓 `PLAN.md` 如存在，只能作为客户端 backlog / archive / 局部草案，不得覆盖 root Task Packet。
- 执行客户端任务时，以 root Task Packet 的 Allowed Files、Out of Scope、Validation 为准。
- 本仓规则只补充客户端边界；如与 root `../AGENTS.md` 冲突，以 root 规则为准。

## 客户端硬规则

- 不修改后端代码。
- 不伪造库存。
- 不直接修改正式 pet 状态。
- 不把表现气泡写入 `mainEvents` 或 `diaryDays`。
- 不提交 `.tmp/`。
- 不提交 Cocos settings 噪音，除非当前 Task Packet 明确授权。
- 保持 diff 最小且局部。
- 不做无关重构、重命名、依赖升级或样式重写。

## 写代码前必须说明

1. 本轮范围。
2. 预计触碰的文件。
3. 验证命令。
