# Git协作与分支管理需求 V1.1

## 文档信息
- **版本**：V1.1
- **更新时间**：2026-03-30
- **创建人**：TA-OpenClaw
- **需求来源**：老板要求打通git上传备份和分支处理逻辑
- **背景**：建立 WSL 开发 → Windows 审核 → GitHub 远端的协作流程

---

## 一、当前Git状态分析

### 1. 后端项目状态（buddy-server）
- **仓库地址**：https://github.com/shiwudu111/buddy-server.git
- **当前分支**：develop
- **负责人**：Cipher
- **状态**：API 开发完成，23个测试用例全部通过

### 2. 前端项目状态（buddy-client）
- **仓库地址**：https://github.com/shiwudu111/buddy-client.git
- **当前分支**：develop（本地新建）
- **技术栈**：Cocos Creator 3.8.7 + TypeScript
- **负责人**：TA-OpenClaw
- **状态**：ApiClient + LoginController 完成，其他页面开发中

### 3. 历史项目状态（buddy-mvp）
- **状态**：已归档（2026-03-30）
- **原因**：与 buddy-server 功能重叠，src 目录为空
- **归档位置**：`docs/09-归档/buddy-mvp/`

---

## 二、WSL 协作架构

```
WSL 开发区          Windows 审核区          GitHub 远端
(TA-OpenClaw)         (老板)               (最终仓库)

  写代码
    ↓
  git commit          审核代码              人工 push
    ↓                  ↓
  同步到Windows      确认无误后            正式发布
```

### 核心规则
- **WSL**：只能 commit，不能自行 push 到远端
- **Windows**：老板负责审核并 push 到 GitHub
- **禁止事项**：
  - 不得在 WSL 中直接 push 到 GitHub 远端
  - 不得绕过人工审核流程
  - 遇到权限/认证异常必须上报

---

## 三、分支策略

### 分支命名规范
- **main**：稳定版本，禁止直接 commit
- **develop**：开发集成分支
- **feature/功能名-日期**：功能开发分支
- **hotfix/问题-日期**：紧急修复分支

### 各项目分支状态

| 项目 | main | develop | 说明 |
|------|------|---------|------|
| buddy-server | ✅ 远端存在 | ✅ 远端存在 | Cipher 维护 |
| buddy-client | ✅ 远端存在 | ✅ 本地新建 | TA-OpenClaw 维护 |

---

## 四、远端仓库信息

| 项目 | 仓库地址 | 状态 |
|------|---------|------|
| buddy-server | https://github.com/shiwudu111/buddy-server.git | ✅ 正常 |
| buddy-client | https://github.com/shiwudu111/buddy-client.git | ✅ 已创建（2026-03-30） |

---

## 五、Git 配置（WSL）

### 用户信息配置
```bash
git config --global user.name "TA-OpenClaw"
git config --global user.email "ta-openclaw@example.com"
```

### 本地仓库初始化流程（buddy-client 示例）
```bash
# 1. 进入项目目录
cd /home/openclaw/.openclaw/workspace-main/buddy-client

# 2. 初始化仓库
git init

# 3. 关联远端
git remote add origin https://github.com/shiwudu111/buddy-client.git

# 4. 创建开发分支
git checkout -b develop

# 5. 拉取远端最新（仅 fetch，不 merge）
git fetch origin
```

---

## 六、每日工作流

### 早上：同步最新代码
```bash
git fetch origin          # 拉取远端最新状态
git log origin/develop -3 # 查看最新提交
```

### 开发中：小步提交
```bash
git add <files>
git commit -m "feat(api): 添加xxx接口"
```

### 晚上：同步到 Windows
```bash
# 同步到 Windows 共享目录供老板审核
rsync -av --exclude='.git' --exclude='node_modules/' \
  /home/openclaw/.openclaw/workspace-main/buddy-client/ \
  /mnt/d/projects/buddy-client/
```

### 老板：审核后 push
```bash
# 在 Windows 目录下
git add .
git commit -m "feat(api): 添加xxx接口"
git push origin develop
```

---

## 七、提交规范（Conventional Commits）

### 格式
```
<type>(<scope>): <subject>
```

### Type 类型
| 类型 | 说明 |
|------|------|
| feat | 新功能 |
| fix | 修复 Bug |
| docs | 文档更新 |
| style | 代码格式 |
| refactor | 重构 |
| test | 测试 |
| chore | 构建/工具 |

### 示例
```
feat(api): 添加宠物状态查询接口
fix(auth): 修复登录500错误
docs(readme): 更新启动说明
```

---

## 八、冲突处理

当 WSL 与 Windows 存在冲突时：
1. 先 `git stash` 暂存本地更改
2. `git fetch` + `git merge` 拉取远程最新
3. `git stash pop` 恢复本地更改
4. 手动解决冲突
5. 重新提交，同步到 Windows 再次审核

---

## 九、实施记录

### 2026-03-30 里程碑
- ✅ buddy-client 仓库创建并关联远端
- ✅ WSL Git 拉取测试通过
- ✅ buddy-mvp 归档移除
- ✅ 协作规范文档更新

---

## 十、验收标准

### 功能验收
- ✅ WSL 可正常 fetch 远端代码
- ✅ WSL commit 后可同步到 Windows
- ✅ 老板可正常 push 到 GitHub

### 质量验收
- ✅ 提交信息格式规范
- ✅ 分支命名规范统一
- ✅ 文档与实际操作对齐

---

**文档状态**：V1.1 生效中  
**下次更新**：根据实际使用反馈优化
