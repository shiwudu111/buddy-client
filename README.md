# 学伴精灵客户端

## 一、项目说明
本仓库是“学伴精灵”项目的客户端工程，使用 **Cocos Creator 3.8.7** 开发，当前处于 **MVP 阶段**。

客户端当前重点是围绕以下主链路推进联调与修复：

`登录 -> 学生端首页 -> 宠物 -> 作业 -> 家长查看`

## 二、开发环境
- **引擎版本**：Cocos Creator 3.8.7
- **仓库目录**：`buddy-client/`（位于父级工作区下）
- **版本管理**：当前目录是独立 Git 仓库

## 三、主要目录
- `assets/scenes`
  - Cocos Creator 场景文件
- `assets/scripts/app`
  - 应用状态与会话状态
- `assets/scripts/core`
  - 配置、存储、基础工具
- `assets/scripts/network`
  - 后端接口访问层
- `assets/scripts/types`
  - 共享类型定义
- `assets/scripts/services`
  - 业务服务层
- `assets/scripts/ui`
  - 页面控制器与界面逻辑
- `../docs/client`
  - 项目文档、联调基线、阶段说明、归档资料

## 四、当前工作重点
1. 保持工程可被 Cocos Creator 3.8.7 正常识别和运行。
2. 在 `assets/scripts` 下持续收敛为一套清晰、可维护的客户端实现。
3. 按当前联调基线对齐 `buddy-server` 接口。
4. 优先保证 MVP 主链路稳定，再逐步扩展其余页面与能力。

## 五、文档入口
详细文档请查看：

- [../docs/client/README.md](../docs/client/README.md)

建议优先阅读：
- `../docs/client/05-决策记录/DECISION-RESULT-FROZEN-V1.0.md`
- `../docs/client/03-API接口/API-MVP-BASELINE-V1.0.md`
- `../docs/client/06-开发规范/客户端架构设计-V1.0.md`
- `../docs/client/90-archive/2026-04-14-阶段报告归档/开发进度报告-2026-04-02-学生端修复说明.md`

## 六、说明
- 根目录 `README.md` 用于说明“这个仓库是什么、怎么定位”。
- `../docs/client/README.md` 用于说明“项目文档怎么查、当前以哪份为准”。
- 若代码与文档口径冲突，优先回看冻结决策与当前有效基线文档。
