import type { UserRole } from "../../types/api";

// 文件整体作用：
// 这是登录页的流程状态机。
// 它只记住当前走到“品牌入口 / 角色选择 / 账号表单”的哪一步，不处理真实登录请求。
//
// 一句话版本：
// 这段代码的核心意思就是：记住登录页现在走到哪一步，好让界面知道该显示品牌入口、角色选择还是表单。
//
// 美术需要关注的重点：
// 1. 哪块界面显示、哪块隐藏，首先取决于这里的 step。
// 2. 返回键的去向也是这里控制的。
export type LoginFlowStep = "restore" | "brandEntry" | "roleSelect" | "authForm";
export type LoginFlowRole = UserRole | null;
export type LoginFlowMode = "login" | "register";

export type LoginFlowState = {
  // step：当前处于登录流程的哪一步。
  // role：当前选中的身份。
  // mode：当前是登录模式还是注册模式。
  step: LoginFlowStep;
  role: LoginFlowRole;
  mode: LoginFlowMode;
};

const DEFAULT_FLOW_STATE: LoginFlowState = {
  step: "restore",
  role: null,
  mode: "login",
};

export class LoginFlowCoordinator {
  // 登录页也是一个很小的状态机：先看品牌入口，再选角色，再进登录/注册表单。
  private state: LoginFlowState = { ...DEFAULT_FLOW_STATE };

  getState(): LoginFlowState {
    return { ...this.state };
  }

  enterRestore(): LoginFlowState {
    // 启动时先进入恢复态，方便判断要不要直接接回上一次会话。
    return this.setState({
      step: "restore",
      role: null,
      mode: "login",
    });
  }

  enterBrandEntry(): LoginFlowState {
    // 品牌入口就是最外层首页，通常会在恢复流程结束后显示。
    return this.setState({
      step: "brandEntry",
      role: null,
      mode: "login",
    });
  }

  enterRoleSelect(): LoginFlowState {
    // 角色选择页只负责“学生 / 家长”分流，不处理账号细节。
    return this.setState({
      step: "roleSelect",
      role: this.state.role,
      mode: "login",
    });
  }

  enterAuthForm(role: LoginFlowRole, mode: LoginFlowMode): LoginFlowState {
    // 进入账号表单页时，顺便记住当前角色和是登录还是注册模式。
    return this.setState({
      step: "authForm",
      role,
      mode,
    });
  }

  showLoginForRole(role: UserRole): LoginFlowState {
    return this.enterAuthForm(role, "login");
  }

  showRegisterForRole(role: UserRole): LoginFlowState {
    return this.enterAuthForm(role, "register");
  }

  goBack(): LoginFlowState {
    // 返回键的规则很简单：表单页和角色页都回到品牌入口。
    if (this.state.step === "authForm") {
      return this.enterBrandEntry();
    }

    if (this.state.step === "roleSelect") {
      return this.enterBrandEntry();
    }

    return this.getState();
  }

  private setState(nextState: LoginFlowState): LoginFlowState {
    this.state = { ...nextState };
    return this.getState();
  }
}
