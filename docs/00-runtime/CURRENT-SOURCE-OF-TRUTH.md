# CURRENT-SOURCE-OF-TRUTH.md

> 目的：给 Codex / Agent / Reviewer 一个“当前唯一执行真相”。
> 规则：本文件只写“现在有效的执行口径”，不写历史讨论。
> 任何任务包、代码改动、审查结论，都必须以本文件为第一优先级。
> 若与历史文档冲突，以本文件 + 当前冻结验收口径为准。

---

## 0. Meta

- Repo: `buddy-client`
- Phase: `MVP 主链路收口阶段`
- Updated At: `2026-04-15`
- Owner: `<your-name>`
- Effective Until: `被下一版 CURRENT-SOURCE-OF-TRUTH 替代前持续有效`

---

## 1. Current Project Goal

当前目标不是扩新模块，而是把现有主链路收口到：

- 可验收
- 可回归
- 可交付

本轮唯一总目标：

**把当前最关键主链路收口到可验收状态，并为下一阶段 `Pet 成长/进化 v1` 做好实施边界准备。**

---

## 2. In Scope Now

当前允许推进的内容只有：

1. `Homework` 收口
   - 提交
   - 草稿
   - 切科目
   - 提交后刷新
   - 返回总览

2. 家长端最小冒烟
   - 绑定孩子
   - 查看孩子状态
   - 查看周报
   - 刷新
   - 退出登录
   - 重新登录

3. `Pet 成长/进化 v1` 实施准备
   - 明确成长节点边界
   - 明确状态字段落地范围
   - 明确演出与正式业务的边界

4. 入口与主链路回归
   - `Login`
   - `Main`
   - `Parent`
   - `Homework`
   - `First-pet`

---

## 3. Explicitly Out of Scope Now

本轮明确不碰：

- `AI 对话 / 宠物对话`
- 更复杂的宠物演出和抽卡包装
- 非必要视觉扩展
- 横向性能和监控大改
- 新增入口层需求
- 多 Scene 登录入口拆分
- 多账号管理与多账号切换

---

## 4. Mainline Priority

所有工作优先保证这条主链路不被破坏：

`注册/登录 -> 创建宠物 -> 提交作业 -> 奖励/状态变化 -> 家长查看结果`

任何新改动若影响主链路稳定性，应优先回退或延期，而不是继续叠加功能。

---

## 5. Current Operational Truths

### 5.1 Login Truth

当前登录入口按第一阶段新模型执行：

`restore -> brandEntry -> roleSelect -> authForm(role, mode)`

固定规则：

1. `roleSelect -> authForm` 默认进入 `mode=login`
2. 注册通过 `authForm` 内显式切换
3. 登录成功后的真实身份以后端返回 `user.role` 为准
4. `restore` 无会话或恢复失败，统一回到 `brandEntry`
5. `restoreSuccess` 第一阶段不自动进 `Main`，而是回到 `brandEntry` 并带可续用账号
6. `authForm` 点击返回时，统一回到 `brandEntry`

当前第一阶段：
- 不新增后端接口
- 不改 `Main.scene` 内部逻辑
- 不拆多个 Cocos Scene

### 5.2 Parent Binding Truth

当前正式联调口径按以下规则执行：

- `1 个家长 <-> 1 个孩子`
- 双家长绑定同一孩子 **不是当前已支持能力**
- 状态码语义：
  - `404`: 孩子不存在
  - `409`: 孩子已被其他家长绑定，或当前家长已绑定其他孩子
  - `403`: 当前登录用户不是家长

说明：
- 若历史文档出现“双家长可绑定同一孩子”，本轮不作为执行标准。
- 该能力如需恢复，必须先重新冻结业务权威与验收口径。

### 5.3 First Pet Truth

当前 MVP 对首次宠物创建的正式业务结果只有一个：

`无宠物学生首次进入 -> 创建宠物 -> 进入成长主链路`

只承诺：
- 无宠物判定
- 首次创建入口
- 输入名称
- 调用创建接口
- 创建成功进入主链路
- 创建失败可提示 / 回退 / 重试

当前不承诺：
- 蛋型
- 稀有度
- 物种
- hatchSeed
- 孵化结果可复现
- 选蛋决定最终结果

任何已有“选蛋 / 孵化”演出，统一视为：
- 原型演出
- 默认关闭，或挂在 feature flag 下
- 不进入正式验收
- 不得反向定义正式数据模型

### 5.4 Module Boundary Truth

- `LoginController` 保持薄控制器，不继续堆认证细节和布局细节
- `LoginFlowCoordinator` 负责流程迁移与 step / role / mode 管理
- `LoginAuthCoordinator` 负责登录 / 注册 / 恢复会话
- 首次宠物创建流程不得继续堆进 `MainController`
- 首次宠物流程应独立为 `PetOnboarding` / `FirstPetFlow` 或同级模块

---

## 6. Current Acceptance Floor

本轮最低完成标准：

1. `Homework` 主链路验证通过
2. 家长端最小冒烟验证通过
3. `Pet 成长/进化 v1` 边界冻结清楚
4. 入口与主链路没有新增阻断问题
5. 不再新增入口层需求，不再扩散到非必要模块

---

## 7. Risk Rules

以下改动默认高风险，必须在任务包中显式说明：

- 会写回共享单例并可能跨会话污染状态的改动
- 会改变登录态恢复逻辑的改动
- 会改变家长绑定口径的改动
- 会把前端演出升格为正式业务的改动
- 会让 `MainController` 继续承担 onboarding 逻辑的改动
- 会新增接口、改字段语义、改状态码语义的改动

---

## 8. Allowed Decision Pattern

Codex / Agent 遇到不明确时，按下面顺序决策：

1. 先看本文件
2. 再看当前任务包
3. 再看当前验收清单
4. 仍不明确时：
   - 不脑补需求
   - 不扩范围
   - 在交付中标注 `Needs Owner Decision`

---

## 9. Forbidden Behaviors

禁止：

- 把历史讨论当当前标准
- 顺手扩视觉
- 顺手重构无关模块
- 顺手补新交互分支
- 用前端演出反推业务真相
- 在未冻结契约上自行新增字段
- 因为“顺手更合理”而跨模块改动

---

## 10. Active Test Data Requirement

所有联调 / 回归必须优先使用固定测试数据：

- 学生端正常登录账号
- 学生端已有宠物账号
- 学生端无宠物账号
- 家长端未绑定账号
- 家长端已绑定账号
- 绑定冲突验证账号

若环境切换、数据重建、账号失效，先更新测试数据表，再执行回归。

---

## 11. Change Protocol

以下情况必须更新本文件后，任务才可继续：

- 家长绑定正式口径变化
- 登录入口状态机变化
- 首次宠物创建正式语义变化
- Sprint 重点变化
- 验收标准变化
- Out of Scope 列表变化

---

## 12. Current Owner Notes

本轮 Codex 执行原则：

- 以收口为目标，不以“更漂亮 / 更完整 / 更通用”为目标
- 以验收通过为目标，不以“理论最优架构”为目标
- 以局部最小改动完成任务，不搞横向清扫式重构