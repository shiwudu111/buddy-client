# buddy-client 文档入口

**适用范围**：`buddy-client` 客户端仓库  
**最后更新**：2026-04-14

---

## 必读文件
按以下顺序阅读：

1. [PROJECT-CONTEXT.md](/E:/buddy-client/docs/PROJECT-CONTEXT.md)
2. [CLIENT-COLLAB-RULES.md](/E:/buddy-client/docs/CLIENT-COLLAB-RULES.md)
3. [CURRENT-STATUS.md](/E:/buddy-client/docs/CURRENT-STATUS.md)

这 3 份文件分别回答：
- 项目是什么、边界是什么
- 当前协作规则是什么
- 当前做到哪里、接下来要做什么

---

## 当前生效文档

### 1. 基线与决策
- [DECISION-RESULT-FROZEN-V1.0.md](/E:/buddy-client/docs/05-决策记录/DECISION-RESULT-FROZEN-V1.0.md)
- [登录入口重构变更决议-V1.0.md](/E:/buddy-client/docs/05-决策记录/登录入口重构变更决议-V1.0.md)
- [首次宠物创建链路冻结说明-V1.0.md](/E:/buddy-client/docs/05-决策记录/首次宠物创建链路冻结说明-V1.0.md)

### 2. 接口与数据
- [API-MVP-BASELINE-V1.0.md](/E:/buddy-client/docs/03-API接口/API-MVP-BASELINE-V1.0.md)
- [DATABASE-ER.md](/E:/buddy-client/docs/04-数据库/DATABASE-ER.md)

### 3. 开发规范
- [MVP-FUNCTION-SCOPE.md](/E:/buddy-client/docs/06-开发规范/MVP-FUNCTION-SCOPE.md)
- [客户端架构设计-V1.0.md](/E:/buddy-client/docs/06-开发规范/客户端架构设计-V1.0.md)
- [Login模块说明-V1.0.md](/E:/buddy-client/docs/06-开发规范/Login模块说明-V1.0.md)
- [协作与提交流程基线-V1.0.md](/E:/buddy-client/docs/06-开发规范/协作与提交流程基线-V1.0.md)

### 4. 联调与测试
- [客户端联调验收清单-V1.0.md](/E:/buddy-client/docs/06-开发规范/客户端联调验收清单-V1.0.md)
- [固定联调测试数据表-V1.0.md](/E:/buddy-client/docs/06-开发规范/固定联调测试数据表-V1.0.md)
- [家长端冒烟清单-V1.0.md](/E:/buddy-client/docs/06-开发规范/家长端冒烟清单-V1.0.md)

---

## 目录说明

```text
docs/
├─ README.md
├─ PROJECT-CONTEXT.md
├─ CURRENT-STATUS.md
├─ CLIENT-COLLAB-RULES.md
├─ 03-API接口/
├─ 04-数据库/
├─ 05-决策记录/
├─ 06-开发规范/
├─ 07-联调与测试/
├─ 09-归档/
└─ 90-archive/
```

- `05-决策记录/`：当前仍生效的专项决策和冻结说明
- `06-开发规范/`：当前仍可执行的开发、联调、验收文档
- `09-归档/`：旧一轮整理过程中保留的历史归档
- `90-archive/`：当前仓库内继续新增的归档目录，放阶段性报告、过期材料、被替代文档

---

## 已归档内容

以下材料已从 `docs/` 根目录移出，不再作为当前入口文档：

- 阶段性开发进度报告
- 过期的提审报告
- 明确只具历史参考价值的过程性文档

当前这批历史材料位于：
- [90-archive/2026-04-14-阶段报告归档](/E:/buddy-client/docs/90-archive/2026-04-14-阶段报告归档)
- [90-archive/2026-04-14-文档整理归档](/E:/buddy-client/docs/90-archive/2026-04-14-文档整理归档)

---

## 使用原则

1. 先看决策，再看规范，再看实现。
2. 草案类文档如果与冻结决策冲突，以决策记录为准。
3. 过程性报告默认不作为当前开发和 review 依据，除非需要追溯历史上下文。
4. 需要新增文档时，优先判断它属于“决策 / 规范 / 测试 / 归档”哪一类，不要继续把阶段性报告堆在根目录。

---

## 权威源说明

本目录用于 `buddy-client` 仓库内协作，不是全局唯一权威源。  
若需查看更完整的跨仓库文档体系，请以 `workspace-main/docs/` 为准。
