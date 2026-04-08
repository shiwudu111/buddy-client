# UI固化执行单 V1.0

## 文档信息
- **整理时间**：2026-04-07
- **适用阶段**：MVP 联调期
- **适用对象**：客户端执行同学、测试同学、项目负责人

## 一、这份文档是干什么的
这份文档不是讲原理，而是讲“下一步具体做什么”。

当前客户端已经把学生端、家长端主链路基本跑通。  
下一步要做的是把现在靠代码临时拼出来的界面，逐步变成 **Cocos 场景里固定存在的节点**，这样后面维护、调样式、挂脚本、查问题都会更容易。

## 二、现在先做什么
当前只做两件事：

1. 先提交最新 UI 固化方案文档
2. 先做 `Login.scene` 的 UI 固化

**现在先不要直接大改 `Main.scene`。**

原因很简单：
- 当前 [MainController.ts](E:/buddy-client/assets/scripts/ui/main/MainController.ts) 还会在渲染时清空 `MainRoot`
- 如果现在直接往 `Main.scene` 的 `MainRoot` 下面放静态节点
- 运行后这些节点还会被删掉

所以当前最稳的顺序是：

1. 先把登录页固化
2. 再处理 `Main.scene` 的结构约束
3. 最后再做主界面固化

## 三、本轮执行目标
本轮完成后，应达到以下结果：

- `Login.scene` 中登录页主要节点都固定在场景里
- `LoginController` 不再负责“补出一套登录页 UI”
- 登录页仍然保持现有可用性
- 不影响当前学生端 / 家长端主链路

## 四、执行范围

### 本轮纳入
- `Login.scene`
- [LoginController.ts](E:/buddy-client/assets/scripts/ui/login/LoginController.ts)

### 本轮不纳入
- `Main.scene` 大规模固化
- 学生端 / 家长端内部卡片精修
- prefab 大拆分
- 动画和视觉升级

## 五、Login.scene 需要固化的节点

场景中应固定存在以下节点：

1. `UsernameInput`
2. `PasswordInput`
3. `LoginButton`
4. `RegisterButton`
5. `StatusLabel`
6. `LoadingNode`

## 六、每个节点的要求

### 1. UsernameInput
用途：
- 输入账号

要求：
- 节点名固定为 `UsernameInput`
- 必须挂 `EditBox`
- 占位文案建议为：`请输入账号`
- `maxLength` 不低于 `64`
- 节点应能稳定输入，不出现“输一半就不能再输入”

### 2. PasswordInput
用途：
- 输入密码

要求：
- 节点名固定为 `PasswordInput`
- 必须挂 `EditBox`
- 占位文案建议为：`请输入密码`
- `maxLength` 不低于 `64`
- 应开启密码显示模式

### 3. LoginButton
用途：
- 提交登录

要求：
- 节点名固定为 `LoginButton`
- 必须挂 `Button`
- 文案为：`登录`
- 点击后由 [LoginController.ts](E:/buddy-client/assets/scripts/ui/login/LoginController.ts) 响应

### 4. RegisterButton
用途：
- 注册并登录

要求：
- 节点名固定为 `RegisterButton`
- 必须挂 `Button`
- 文案为：`注册并登录`

说明：
- 当前代码里如果找不到这个节点，会运行时补一个按钮
- 本轮目标是让它直接固定在场景里，不再依赖运行时补按钮

### 5. StatusLabel
用途：
- 显示登录状态提示

要求：
- 节点名固定为 `StatusLabel`
- 必须是**纯展示节点**
- 不能是可输入框
- 推荐挂 `Label`
- 初始文案可设为：`请输入账号密码`

会显示的典型内容：
- `请输入账号密码`
- `请填写账号和密码`
- `登录中...`
- `登录成功，正在进入主界面...`
- `登录失败`

### 6. LoadingNode
用途：
- 显示加载中状态

要求：
- 节点名固定为 `LoadingNode`
- 必须是**纯展示节点**
- 不能是 `EditBox`
- 默认状态建议为隐藏
- 文案建议为：`加载中...`

## 七、Login.scene 执行步骤

下面按 Creator 里实际操作顺序来做。

### 第一步：确认现有节点是否都存在
在 `Login.scene` 中检查：
- 是否存在 `UsernameInput`
- 是否存在 `PasswordInput`
- 是否存在 `LoginButton`
- 是否存在 `RegisterButton`
- 是否存在 `StatusLabel`
- 是否存在 `LoadingNode`

如果名字不一致：
- 优先改名到以上标准名
- 不要自己另起一套新名字

### 第二步：修正输入框类型
检查 `UsernameInput` 和 `PasswordInput`：
- 必须是 `EditBox`
- 不能是 `Label`
- 不能是普通空节点

同时确认：
- `UsernameInput` 占位文案正确
- `PasswordInput` 占位文案正确
- `PasswordInput` 开启密码模式

### 第三步：修正按钮类型
检查 `LoginButton` 和 `RegisterButton`：
- 必须挂 `Button`
- 按钮文字正确
- 可点击

如果原来按钮文字是别的节点承载，也没问题，但最终按钮节点名必须一致。

### 第四步：修正状态提示区
检查 `StatusLabel`：
- 不能是 `EditBox`
- 不能可输入
- 应为纯展示文本

如果当前是旧输入框结构：
- 保留背景没问题
- 但最终展示层必须是 `Label`
- 不要再出现可输入状态

### 第五步：修正加载提示区
检查 `LoadingNode`：
- 不能是 `EditBox`
- 不要与 `StatusLabel` 重叠
- 应只负责显示加载状态

### 第六步：检查 LoginController 挂载
检查 [LoginController.ts](E:/buddy-client/assets/scripts/ui/login/LoginController.ts)：
- 应正常挂在 `Login.scene` 的主控制节点上
- 不要是丢失脚本
- 不要是异常 runtime 引用

### 第七步：保存场景并做最小冒烟
改完后立刻验证：

1. 输入账号密码是否正常
2. 登录按钮是否可点
3. 注册按钮是否可点
4. `StatusLabel` 是否正常显示提示
5. `LoadingNode` 是否只在提交时显示

## 八、冒烟测试标准

### 通过标准
满足以下条件，可认为 `Login.scene` UI 固化完成：

1. 登录页 6 个关键节点都固定存在于场景中
2. `LoginController` 不再需要运行时补 `RegisterButton`
3. `StatusLabel` 和 `LoadingNode` 都是纯展示节点
4. 输入框、按钮、状态提示实际由场景节点承载
5. 登录 / 注册流程不低于当前基线可用性

### 不通过的典型表现
出现以下任一情况，都不能算完成：

1. 场景里虽然有 `RegisterButton`，但运行时其实还在补另一套按钮
2. `StatusLabel` 还能输入
3. `LoadingNode` 是输入框
4. 输入框仍然输入不完整
5. 场景里节点名改了，但脚本实际没用这套节点

## 九、本轮不要做的事

### 不要做 1：不要直接大改 Main.scene
原因：
- 当前 `MainRoot` 仍会被清空
- 现在直接摆静态节点容易白做

### 不要做 2：不要顺手重做整套视觉
原因：
- 当前先求“结构稳定、节点可维护”
- 不是先求美术完成度

### 不要做 3：不要手改 scene/meta 内部序列化字段
要求：
- 场景和节点修改必须在 Cocos Creator 里完成

## 十、Login.scene 固化完成后下一步做什么
`Login.scene` 固化完成后，再进入下一步：

1. 先处理 `Main.scene` 的 `MainRoot` 约束
2. 再固化 `Main.scene` 顶部公共区
3. 再固化学生端 / 家长端一级容器

## 十一、给执行同学的简化版任务

如果要发给执行同学，可以直接发下面这段：

```text
先只做 Login.scene 固化，不要先动 Main.scene。

需要固定的节点：
- UsernameInput
- PasswordInput
- LoginButton
- RegisterButton
- StatusLabel
- LoadingNode

要求：
1. UsernameInput / PasswordInput 必须是 EditBox
2. LoginButton / RegisterButton 必须是 Button
3. StatusLabel / LoadingNode 必须是纯展示节点，不能可输入
4. LoginController 正常挂载
5. 改完后立刻做登录页最小冒烟
```

## 十二、当前阶段一句话结论
现在别急着做整个主界面，**先把登录页固定化做好**。  
登录页做好以后，再去处理 `Main.scene`，这样最稳，不容易返工。
