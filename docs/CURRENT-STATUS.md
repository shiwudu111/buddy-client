# buddy-client 当前状态

**更新日期**：2026-04-20  
**面向对象**：只查看 `buddy-client` 仓库的协作者

---

## 当前阶段

项目当前处于 **学生端主界面改版 + 口粮资源系统联调准备 / 前端落地推进阶段**。

当前重点不是继续横向扩新模块，而是：
- 保持学生端与家长端主链路稳定
- 把主界面改版与后端资源系统的口径先冻结清楚
- 让当前状态、执行真相、验收清单和联调文档保持一致
- 在不破坏主链路的前提下推进学生端主页改版与资源系统联调

---

## 当前已完成

### 1. 主链路
- `Login + Main` 主链路已跑通
- 学生端和家长端都可进入主界面
- 退出登录、重新登录、刷新等关键会话边界已收口

### 2. Login 模块
- 登录入口重构已完成
- 当前执行口径为：`restore -> brandEntry -> roleSelect -> authForm`
- 默认账号、其他账号、返回、登录/注册切换、状态清理等关键路径已收口
- Login 关键冒烟已通过

### 3. 家长端主链路
- 家长端绑定孩子链路已稳定
- `绑定孩子 -> 查看孩子状态 -> 查看周报 -> 刷新 -> 退出登录 -> 重新登录` 已作为稳定联调基线通过
- `bootstrap / refresh / bind / logout` 的会话边界已统一成“有效才提交，失效就静默丢弃”

### 4. 学生端聊天 v1
- 学生端聊天功能已完成并收口
- 已完成：
  - `Main` 内聊天 UI
  - 本地预设回复
  - 会话内聊天状态保留
  - 空输入拦截
  - 防重复提交
  - 登录退出清空
  - 浏览器关闭后重新启动不回灌旧聊天
- 当前口径：
  - 聊天只在当前运行会话内保留
  - 聊天不会影响宠物成长
  - 历史接口可用，但当前不作为启动自动恢复主流程

### 5. Homework 模块
- Homework 当前已完成收口
- 已确认：
  - 学科切换后的草稿隔离
  - 提交成功后的历史 / 今日状态 / 宠物状态刷新
  - 刷新与退出重登后的会话边界
  - 学生端 Homework 手工点测通过

### 6. Pet 成长/进化 v1
- 已进入第一版功能落地阶段
- 当前已完成：
  - 学生端 `宠物成长` 页签正式展示
  - 当前状态展示：阶段、等级、经验、饥饿、心情、状态
  - 进化条件展示：当前阶段、下一阶段、等级要求、进化时机、保守判断
  - 最近成长反馈展示：仅接 `喂养成功` 与 `作业提交成功` 两个触点
- 当前限制：
  - 聊天不会影响成长
  - 不做历史作业回放
  - 不做后端假接口或伪造增量字段

### 7. 学生端主界面改版准备
- 已明确主界面视觉参考以 `index.html` 为准
- 主界面将从“文档式宠物状态”改为更接近宠物主页的暖色场景壳子
- 当前主页第一版已接入：状态卡、宠物场景、最近事件、选粮喂养弹层、底部动作区
- 当前宠物场景已继续细化，朝 `index.html` 的圆润暖色风格收拢
- 新阶段需要后端配合的真实能力包括：
  - `energy / health`
  - 口粮库存
  - 作业奖励口粮
  - 选粮喂养
- 这部分能力需要单独的联调文档和冻结规则，不再混在旧聊天 / 成长文档里

---

## 当前验收结论

### 学生端聊天 v1
- **功能验收：通过**
- **视觉最终验收：不作为本阶段收口标准**

### Pet 成长/进化 v1
- **功能实现：已落地，可继续验收**
- **界面观感：当前仅达到功能版，不作为 MVP 最终视觉定版**
- 后续如需作为正式最终界面交付，必须单独开 `UI/视觉优化` 任务，不在当前功能任务内继续扩修

### 学生端主界面改版
- **当前状态：联调准备 / 前端落地推进中**
- **视觉目标：以 `index.html` 为参考进行主页重做**
- **联调目标：先冻结口粮资源系统和新宠物状态字段，再进入实现**
- **视觉审查结论：当前仅达到“暖色三栏主页第一版”，距离 `index.html` 级别还原仍有明显差距**
- **已新增整改清单：后续应按《Main 首页 P0 结构整改执行单（当前版）》分块推进，不再把当前效果误判为接近最终视觉**

---

## 当前未开始或暂不推进

- 正式选蛋 / 孵化系统
- 稀有度 / 物种结果承诺
- 聊天对成长联动
- 更复杂的宠物演出包装
- 自动化测试体系
- 性能 / 监控专项
- 主界面视觉定版以外的扩展花活

---

## 当前风险

1. `Pet 成长/进化 v1` 当前已经达到功能可验收，但界面观感仍偏“功能版”，若不单独拆 UI 优化任务，容易在后续协作中被误判为“最终界面已完成”。
2. 聊天、成长、作业三块当前边界已经冻结，但若后续协作不看最新文档，容易再次把聊天历史恢复、聊天影响成长、历史回放成长等旧讨论带回实现。
3. 当前正在进入学生端主界面改版阶段，如果后端资源系统契约不先冻结，主界面很容易变成前端猜字段的伪实现。
4. 当前仍以手工点测和编译验证为主，自动化回归覆盖不足。

---

## 下一步建议

1. 保持学生端聊天 v1 关闭状态，不再继续扩需求。
2. 开始推进学生端主界面改版与资源系统联调准备。
3. 如需提升成长页交付观感，单独开 `Pet Growth UI/视觉优化` 任务，不混入当前功能验收。
4. 后续任何阶段变化，应优先更新本文件和 `CURRENT-SOURCE-OF-TRUTH.md`。

---

## 快速入口

- 项目背景：[PROJECT-CONTEXT.md](/E:/buddy-client/docs/PROJECT-CONTEXT.md)
- 协作规则：[CLIENT-COLLAB-RULES.md](/E:/buddy-client/docs/CLIENT-COLLAB-RULES.md)
- 当前执行真相：[CURRENT-SOURCE-OF-TRUTH.md](/E:/buddy-client/docs/00-runtime/CURRENT-SOURCE-OF-TRUTH.md)
- 主界面改版联调：[Main 首页 P0 结构整改执行单（当前版）.md](/E:/buddy-client/docs/06-开发规范/Main%20%E9%A6%96%E9%A1%B5%20P0%20%E7%BB%93%E6%9E%84%E6%95%B4%E6%94%B9%E6%89%A7%E8%A1%8C%E5%8D%95%EF%BC%88%E5%BD%93%E5%89%8D%E7%89%88%EF%BC%89.md)
- 冻结总决策：[DECISION-RESULT-FROZEN-V1.0.md](/E:/buddy-client/docs/05-决策记录/DECISION-RESULT-FROZEN-V1.0.md)
- 客户端联调验收：[客户端联调验收清单-V1.0.md](/E:/buddy-client/docs/06-开发规范/客户端联调验收清单-V1.0.md)

## 2026-04-20 Milestone
- Student main shell is now moving onto a viewport-safe, responsive layout foundation.
- Runtime UI primitives were upgraded for card / badge / progress / action tile / speech bubble / mini input usage.
- Student child top bar has been reshaped into a responsive combined shell with pill tabs and compact controls.
- Compact child overview now hides the always-on right event panel instead of keeping the old fixed three-column feel.
- Main child overview panels and action bar now derive sizes and placement from layout metrics instead of pure fixed coordinates.
- Main child scene panel and compact event panel now derive title, card, and summary spacing from layout metrics.
- PetGrowthView is now aligned with the same warm responsive card system and no longer reads like the old dark-theme leftover page.
- MainController's legacy child branch inside renderGlobalActions has been removed so the old header action shell no longer coexists with the new child top bar.
- Main overview scene bubble, name tag, and right-side summary cards are now using the shared product component set instead of bare boxes.
- Main overview scene backdrop layers and the pet hero proportions were tightened again to better match the reference composition.
