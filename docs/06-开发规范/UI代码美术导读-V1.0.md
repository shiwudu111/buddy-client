# UI代码美术导读-V1.0

## 文档目的

这份文档用于给不熟编程的美术同学一个快速入口，帮助理解 `assets/scripts/ui` 目录里每个文件在界面里的职责。
本轮已经把主要说明直接写回源码注释里，所以这里不再重复粘贴整份代码，而是按目录顺序说明“去哪里看、先看什么”。

## 阅读建议

1. 先看文件头的“文件整体作用”和“美术需要关注的重点”。
2. 再看类、函数前面的中文注释，理解它控制哪块界面。
3. 如果要找真实节点名、动态节点名、运行时层级，优先看注释里提到的 `name`、`Layer`、`Panel`、`Button`。

## 文件顺序

### common

- [ScreenController.ts](/E:/buddy-client/assets/scripts/ui/common/base/ScreenController.ts)
  作用：动态页面公共父类，负责页面根容器的创建与清空。
  重点：这里的根容器下内容会在重绘时被整体删除重建。

- [RuntimeUI.ts](/E:/buddy-client/assets/scripts/ui/common/runtime/RuntimeUI.ts)
  作用：运行时动态创建按钮、文字、输入框、滚动文本的工具箱。
  重点：这里创建的节点不会长期固定在场景里，页面刷新时可能整体重建。

### homework

- [HomeworkCenterCoordinator.ts](/E:/buddy-client/assets/scripts/ui/homework/HomeworkCenterCoordinator.ts)
  作用：管理科目切换、草稿保存、提交反馈。
  重点：不同科目的草稿分开保存，不会互相覆盖。

- [HomeworkCenterView.ts](/E:/buddy-client/assets/scripts/ui/homework/HomeworkCenterView.ts)
  作用：绘制作业中心界面。
  重点：左右两块卡片、科目按钮、输入框和历史区都由这里动态生成。

- [HomeworkController.ts](/E:/buddy-client/assets/scripts/ui/homework/HomeworkController.ts)
  作用：旧入口跳转壳。
  重点：正式作业界面已经并入主界面，不再单独维护。

### login

- [LoginAccountStore.ts](/E:/buddy-client/assets/scripts/ui/login/LoginAccountStore.ts)
  作用：记录默认账号。
  重点：控制登录页默认账号条显示谁。

- [LoginAuthCoordinator.ts](/E:/buddy-client/assets/scripts/ui/login/LoginAuthCoordinator.ts)
  作用：处理登录、注册、恢复会话。
  重点：状态文案和“正在登录”锁定态主要由这里驱动。

- [LoginBackgroundBuilder.ts](/E:/buddy-client/assets/scripts/ui/login/LoginBackgroundBuilder.ts)
  作用：搭建登录页背景层。
  重点：森林背景、渐变、雾光都由这里动态创建。

- [LoginController.ts](/E:/buddy-client/assets/scripts/ui/login/LoginController.ts)
  作用：登录页总控制器。
  重点：按钮点击后去哪一步、账号弹层开关、登录注册切换都看这里。

- [LoginFeedbackPresenter.ts](/E:/buddy-client/assets/scripts/ui/login/LoginFeedbackPresenter.ts)
  作用：更新状态文案和 loading 锁定。
  重点：提交中会禁用按钮和输入框。

- [LoginFlowCoordinator.ts](/E:/buddy-client/assets/scripts/ui/login/LoginFlowCoordinator.ts)
  作用：记录登录流程当前步骤。
  重点：决定品牌入口、角色选择、表单三段显示哪一段。

- [LoginLayoutCalculator.ts](/E:/buddy-client/assets/scripts/ui/login/LoginLayoutCalculator.ts)
  作用：根据屏幕尺寸计算布局。
  重点：横竖屏错位问题优先看这里。

- [LoginResolutionCoordinator.ts](/E:/buddy-client/assets/scripts/ui/login/LoginResolutionCoordinator.ts)
  作用：进入登录页时切换分辨率，离开时恢复。
  重点：跨场景尺寸异常通常和这里有关。

- [LoginSceneContract.ts](/E:/buddy-client/assets/scripts/ui/login/LoginSceneContract.ts)
  作用：集中声明关键节点名和层级契约。
  重点：这里列出的节点名不能随便改。

- [LoginSceneRefs.ts](/E:/buddy-client/assets/scripts/ui/login/LoginSceneRefs.ts)
  作用：把登录页要用的节点和组件一次性整理出来。
  重点：场景节点缺失时，最容易在这里先报错。

- [LoginSceneStructure.ts](/E:/buddy-client/assets/scripts/ui/login/LoginSceneStructure.ts)
  作用：校验登录页层级结构。
  重点：LoginPage / BackgroundLayer / ContentLayer 是登录页大骨架。

- [LoginViewConfig.ts](/E:/buddy-client/assets/scripts/ui/login/LoginViewConfig.ts)
  作用：集中存放尺寸、偏移、颜色参数。
  重点：调样式和调位置优先看这里，不要先改业务逻辑。

- [LoginViewOrchestrator.ts](/E:/buddy-client/assets/scripts/ui/login/LoginViewOrchestrator.ts)
  作用：把布局、显示隐藏、节点重挂、样式绘制串起来。
  重点：节点跑错层级、某块没显示，通常先看这里。

- [LoginVisualStyler.ts](/E:/buddy-client/assets/scripts/ui/login/LoginVisualStyler.ts)
  作用：给登录页节点补外观。
  重点：按钮阴影、账号条高光、面板层次都主要看这里。

### main

- [MainController.ts](/E:/buddy-client/assets/scripts/ui/main/MainController.ts)
  作用：学生端和家长端主界面总控制器。
  重点：主界面大部分卡片、按钮、标题都是运行时动态生成，首次创建宠物流程也在这里切换。

### pet

- [PetCreationCoordinator.ts](/E:/buddy-client/assets/scripts/ui/pet/PetCreationCoordinator.ts)
  作用：首次创建宠物的小状态机。
  重点：决定 intro / naming / submitting / success 四步切换。

- [PetCreationView.ts](/E:/buddy-client/assets/scripts/ui/pet/PetCreationView.ts)
  作用：首次创建宠物的界面绘制函数。
  重点：各步骤节点会整页重建，不是固定常驻节点。

- [PetGrowthView.ts](/E:/buddy-client/assets/scripts/ui/pet/PetGrowthView.ts)
  作用：宠物成长页签界面。
  重点：成长卡、进化预览卡、本地模拟样本按钮都由这里动态生成。

## 当前交付说明

- 本轮已经按“美术也能看懂”的目标，把主要说明直接补进源码。
- 阅读时优先以源码文件头注释为准，因为那里离真实代码最近。
- 如果下一轮要继续深化，可以再补一版“节点层级截图 + 对照说明”。
