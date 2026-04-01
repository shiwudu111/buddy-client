# WSL Git 提交流程规范 V1.1

## 文档信息
- **版本**：V1.1
- **更新时间**：2026-03-31
- **创建人**：TA-OpenClaw
- **需求来源**：老板要求建立 WSL 下代码提交规范

---

## 一、协作架构

```
WSL 开发区          Windows 审核区          GitHub 远端
(TA-OpenClaw)         (老板)               (最终仓库)

  写代码
    ↓
  git commit          审核代码              人工 push
    ↓                  ↓
  同步到Windows      确认无误后            正式发布
```

**核心原则**：
- TA-OpenClaw 在 WSL 中开发，只能 commit，不能自行 push 到远端
- 所有改动必须先同步到 Windows 审核区，由老板人工审核
- 只有老板审核通过后，才允许发布到远端仓库
- 遇到权限、认证、GitHub 配置问题，必须立即上报老板

---

## 二、提交格式（Conventional Commits）

### 格式
```
<type>(<scope>): <subject>
```

### 类型 (Type)
| 类型 | 说明 | 示例 |
|------|------|------|
| feat | 新功能 | `feat(api): 添加宠物创建接口` |
| fix | 修复 Bug | `fix(auth): 修复登录 500 错误` |
| docs | 文档更新 | `docs(readme): 更新启动说明` |
| style | 代码格式调整 | `style(ui): 调整按钮间距` |
| refactor | 代码重构 | `refactor(api): 优化请求逻辑` |
| test | 测试相关 | `test(api): 添加接口测试用例` |
| chore | 构建/工具变动 | `chore(deps): 更新依赖版本` |
| perf | 性能优化 | `perf(api): 缓存策略优化` |

### 范围 (Scope)
**后端**：
- `auth` - 认证模块
- `api` - API 接口
- `db` - 数据库相关
- `config` - 配置相关
- `middleware` - 中间件
- `service` - 业务服务
- `model` - 数据模型
- `test` - 测试相关

**前端 / Cocos**：
- `client` - 客户端整体
- `login` - 登录模块
- `main` - 主场景
- `homework` - 作业模块
- `scene` - 场景文件
- `ui` - 用户界面
- `network` - 网络请求
- `storage` - 本地存储

### 示例
```
fix(auth): 删除 JWT_SECRET fallback 防止伪造 token
fix(scene): 修复 Login.scene 挂载错误
fix(login): 修复 LoginController 字符串损坏
feat(homework): 添加作业提交功能
docs规范: 更新 WSL Git 提交流程
```

---

## 三、分支模型

### 仓库结构（每个项目独立）
```
buddy-server/       # 后端（Cipher 负责）
buddy-client/      # Cocos 客户端（TA-OpenClaw 负责）
docs/               # 项目文档（共享）
```

### 分支策略
- **main**：稳定版本，禁止直接 commit
- **develop**：开发集成分支
- **feature/xxx**：功能开发分支
- **hotfix/xxx**：紧急修复分支

### 分支命名
```
feature/功能名-日期    例如：feature/login-api-0330
hotfix/问题-日期      例如：hotfix/api-500-error-0330
```

---

## 四、提交流程（WSL 内）

### 步骤1：开始前 — 检查并同步远端
```bash
# 确认在正确分支
git branch

# 拉取最新代码（仅 fetch，不 push）
git fetch origin
# 检查远端状态，决定是否 merge
git merge origin/develop
```

### 步骤2：开发 — 小步提交
```bash
# 添加更改（按模块分批提交）
git add assets/scripts/ui/login/LoginController.ts

# 提交，使用 Conventional Commits 格式
git commit -m "fix(login): 兼容 LoadingNode/LodingNode 两种命名"
```

### 步骤3：提交后 — 同步到 Windows
```bash
# 工作区同步到 Windows 共享目录
# 方案：cp / rsync 同步
rsync -av --exclude='.git' --exclude='node_modules/' \
  /home/openclaw/.openclaw/workspace-main/buddy-client/ \
  /mnt/d/projects/buddy-client/
```

### 步骤4：Windows 审核
- 老板在 Windows 使用 GitHub Desktop / VS Code 审查代码
- 确认无误后，由老板 push 到 GitHub

### 步骤5：WSL 同步远端状态
```bash
# push 后，在 WSL 中更新远端引用
git fetch origin
```

---

## 五、禁止事项

### 本地禁止操作
- ❌ git push
- ❌ git merge --no-ff（需确认）
- ❌ git reset --hard（不确定时）
- ❌ 手工修改 .scene / .prefab JSON
- ❌ 提交 .env、日志、缓存、临时文件

### 协作禁止事项
- ❌ 不得在 WSL 中直接 push 到 GitHub 远端
- ❌ 不得绕过人工审核流程直接发布
- ❌ 不得在本地 Git 状态不清楚时自行 merge / rebase / reset
- ❌ 遇到权限、认证、GitHub 配置异常时自行反复尝试，必须上报

---

## 六、冲突处理

当 WSL 与 Windows 存在冲突时：
1. 在 WSL 内先 `git stash` 暂存本地更改
2. `git fetch` + `git merge` 拉取远程最新
3. `git stash pop` 恢复本地更改
4. 手动解决冲突（优先保留人工审核过的 Windows 版本）
5. 重新提交，同步到 Windows 再次审核

---

## 七、每日工作流

```
早：git fetch + merge（同步最新代码）
中：小步提交（每完成一个小功能就 commit）
晚：将当天提交同步到 Windows，供老板审核
```

---

## 七、提交版本号说明

### 问题背景
WSL 开发区与 Windows 审核区为两个独立工作区时，如审核流程采用文件同步、手工覆盖、重新提交等方式，而不是直接同步 Git 原始提交对象，则双方 commit SHA 不保证一致。

### 原因
Git commit 版本号由以下信息共同决定：
- 文件树
- 父提交
- 作者与时间
- 提交信息

因此，即使代码内容相同，只要不是同一个原始提交对象，生成的 commit SHA 也会不同。

### 协作约定
- **WSL 本地 commit SHA**：仅作为开发侧提交记录
- **Windows 审核区 commit SHA**：作为正式仓库历史记录
- **默认情况**：正式版本历史以 Windows 审核仓库为准

### 保留原始 commit SHA 的方法
如需保留 WSL 原始 commit SHA，必须使用以下任一方式传递提交：
1. `git format-patch` + `git am`
2. `git bundle` + `git fetch`

### 禁止事项
❌ 禁止仅通过复制文件后重新 commit 的方式要求 commit SHA 对齐

---

## 八、远端仓库信息

| 项目 | 仓库地址 | 状态 |
|------|---------|------|
| buddy-server | https://github.com/shiwudu111/buddy-server.git | ✅ |
| buddy-client | https://github.com/shiwudu111/buddy-client.git | ✅ |

---

**下一步**：请老板提供 Windows 共享目录路径（以便 WSL 与 Windows 之间同步代码）。