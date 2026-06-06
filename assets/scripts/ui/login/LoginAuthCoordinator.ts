import { devActionLogger } from "../../core/DevActionLogger";
import { authService } from "../../services/AuthService";
import type { ApiResponse, AuthPayload, UserRole } from "../../types/api";

// 文件整体作用：
// 这是登录页真正负责“登录 / 注册 / 恢复会话”业务判断的协调器。
// 它不直接操作界面节点，而是把结果整理成“该显示什么状态、要不要跳场景”。
//
// 一句话版本：
// 这段代码的核心意思就是：统一处理登录、注册和恢复登录态，并告诉界面现在该提示成功、失败还是处理中。
//
// 美术需要关注的重点：
// 1. 登录页底部那一行状态文案，大多来自这里定义的状态集合。
// 2. 这里会决定按钮什么时候进入“正在提交”的锁定状态。
// 3. 如果出现“界面显示成功但没跳转”或“状态文字不对”，常常和这里有关。
export type LoginStatusTone = "neutral" | "success" | "error";

export type LoginStatusKey =
  | "idle"
  | "restorePending"
  | "restoreSuccess"
  | "restoreNoSession"
  | "restoreFailure"
  | "loginMissingFields"
  | "loginPending"
  | "loginSuccess"
  | "loginFailure"
  | "registerMissingFields"
  | "registerInvalidFields"
  | "registerPasswordMismatch"
  | "registerPending"
  | "registerSuccess"
  | "registerFailure"
  | "networkError";

export type LoginStatusState = {
  // key：内部识别用的状态名。
  // message：界面上真正显示给用户看的文案。
  // tone：决定文案应该用普通色、成功色还是失败色。
  key: LoginStatusKey;
  message: string;
  tone: LoginStatusTone;
};

export type LoginAuthOutcome = {
  status: LoginStatusState;
  shouldNavigate: boolean;
  resolvedRole: UserRole | null;
};

export type LoginRestoreOutcomeKind = "restoreSuccess" | "restoreNoSession" | "restoreFailure";

export type LoginRestoreOutcome = LoginAuthOutcome & {
  kind: LoginRestoreOutcomeKind;
};

type LoginStatusListener = (status: LoginStatusState) => void;

export const LOGIN_STATUS_STATES: Record<LoginStatusKey, LoginStatusState> = {
  idle: { key: "idle", message: "\u8bf7\u8f93\u5165\u8d26\u53f7\u5bc6\u7801", tone: "neutral" },
  restorePending: {
    key: "restorePending",
    message: "\u6b63\u5728\u6062\u590d\u767b\u5f55\u72b6\u6001...",
    tone: "neutral",
  },
  restoreSuccess: {
    key: "restoreSuccess",
    message: "\u68c0\u6d4b\u5230\u5df2\u767b\u5f55\u72b6\u6001\uff0c\u53ef\u7ee7\u7eed\u8fdb\u5165",
    tone: "success",
  },
  restoreNoSession: {
    key: "restoreNoSession",
    message: "\u8bf7\u9009\u62e9\u767b\u5f55\u65b9\u5f0f",
    tone: "neutral",
  },
  restoreFailure: {
    key: "restoreFailure",
    message: "\u767b\u5f55\u6001\u6062\u590d\u5931\u8d25",
    tone: "error",
  },
  loginMissingFields: {
    key: "loginMissingFields",
    message: "\u8bf7\u586b\u5199\u8d26\u53f7\u548c\u5bc6\u7801",
    tone: "error",
  },
  loginPending: {
    key: "loginPending",
    message: "\u6b63\u5728\u767b\u5f55...",
    tone: "neutral",
  },
  loginSuccess: {
    key: "loginSuccess",
    message: "\u767b\u5f55\u6210\u529f\uff0c\u6b63\u5728\u8fdb\u5165\u4e3b\u754c\u9762...",
    tone: "success",
  },
  loginFailure: {
    key: "loginFailure",
    message: "\u767b\u5f55\u5931\u8d25",
    tone: "error",
  },
  registerMissingFields: {
    key: "registerMissingFields",
    message: "\u8bf7\u5148\u8f93\u5165\u8d26\u53f7\u3001\u5bc6\u7801\u548c\u786e\u8ba4\u5bc6\u7801",
    tone: "error",
  },
  registerInvalidFields: {
    key: "registerInvalidFields",
    message: "\u8d26\u53f7\u81f3\u5c11 3 \u4f4d\uff0c\u5bc6\u7801\u81f3\u5c11 6 \u4f4d",
    tone: "error",
  },
  registerPasswordMismatch: {
    key: "registerPasswordMismatch",
    message: "\u4e24\u6b21\u8f93\u5165\u7684\u5bc6\u7801\u4e0d\u4e00\u81f4",
    tone: "error",
  },
  registerPending: {
    key: "registerPending",
    message: "\u6b63\u5728\u6ce8\u518c...",
    tone: "neutral",
  },
  registerSuccess: {
    key: "registerSuccess",
    message: "\u6ce8\u518c\u6210\u529f\uff0c\u6b63\u5728\u8fdb\u5165\u4e3b\u754c\u9762...",
    tone: "success",
  },
  registerFailure: {
    key: "registerFailure",
    message: "\u6ce8\u518c\u5931\u8d25",
    tone: "error",
  },
  networkError: {
    key: "networkError",
    message: "\u7f51\u7edc\u5f02\u5e38",
    tone: "error",
  },
};

function createErrorStatus(message: string, fallback: LoginStatusState): LoginStatusState {
  // 把后端或运行时错误，统一包装成登录页可显示的错误状态。
  return {
    key: fallback.key,
    message,
    tone: "error",
  };
}

type LoginAuthService = Pick<
  typeof authService,
  "hasStoredSession" | "bootstrapSession" | "login" | "register" | "logout"
>;

function hasCompleteAuthPayload(
  result: ApiResponse<AuthPayload>
): result is ApiResponse<AuthPayload> & { data: AuthPayload } {
  return Boolean(result.data?.token && result.data?.user);
}

export class LoginAuthCoordinator {
  // isSubmitting：当前是否正在发登录/注册请求。
  private isSubmitting = false;
  // isBootstrappingSession：当前是否正在恢复旧登录态。
  private isBootstrappingSession = false;

  constructor(private readonly auth: LoginAuthService = authService) {}

  hasStoredSession(): boolean {
    return this.auth.hasStoredSession();
  }

  canRestoreSession(): boolean {
    return !this.isSubmitting && !this.isBootstrappingSession;
  }

  canSubmit(): boolean {
    return !this.isSubmitting && !this.isBootstrappingSession;
  }

  async restoreSessionIfNeeded(
    onStatusChange?: LoginStatusListener
  ): Promise<LoginRestoreOutcome | null> {
    // 登录页刚打开时，优先尝试恢复上一次会话。
    if (!this.canRestoreSession()) {
      return null;
    }

    if (!this.hasStoredSession()) {
      return {
        kind: "restoreNoSession",
        status: LOGIN_STATUS_STATES.restoreNoSession,
        shouldNavigate: false,
        resolvedRole: null,
      };
    }

    this.isBootstrappingSession = true;
    onStatusChange?.(LOGIN_STATUS_STATES.restorePending);
    try {
      const user = await this.auth.bootstrapSession();
      if (user) {
        return {
          kind: "restoreSuccess",
          status: LOGIN_STATUS_STATES.restoreSuccess,
          shouldNavigate: false,
          resolvedRole: user.role,
        };
      }

      return {
        kind: "restoreNoSession",
        status: LOGIN_STATUS_STATES.restoreNoSession,
        shouldNavigate: false,
        resolvedRole: null,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : LOGIN_STATUS_STATES.restoreFailure.message;
      return {
        kind: "restoreFailure",
        status: createErrorStatus(message, LOGIN_STATUS_STATES.restoreFailure),
        shouldNavigate: false,
        resolvedRole: null,
      };
    } finally {
      this.isBootstrappingSession = false;
    }
  }

  async login(
    username: string,
    password: string,
    onStatusChange?: LoginStatusListener
  ): Promise<LoginAuthOutcome | null> {
    // 普通登录入口。
    if (!this.canSubmit()) {
      return null;
    }

    if (!username || !password) {
      return {
        status: LOGIN_STATUS_STATES.loginMissingFields,
        shouldNavigate: false,
        resolvedRole: null,
      };
    }

    return this.runAuthAction({
      pendingStatus: LOGIN_STATUS_STATES.loginPending,
      fallbackErrorStatus: LOGIN_STATUS_STATES.loginFailure,
      successStatus: LOGIN_STATUS_STATES.loginSuccess,
      invalidSuccessMessage:
        "\u767b\u5f55\u7ed3\u679c\u4e0d\u5b8c\u6574\uff0c\u8bf7\u91cd\u8bd5",
      action: () => this.auth.login(username, password),
      onStatusChange,
    });
  }

  async register(
    username: string,
    password: string,
    role: UserRole = "CHILD",
    onStatusChange?: LoginStatusListener
  ): Promise<LoginAuthOutcome | null> {
    devActionLogger.info("login.register.click", {
      username,
      role,
      usernameLength: username.length,
      passwordLength: password.length,
    });
    // 注册入口。学生和家长都复用这里，只是 role 不同。
    if (!this.canSubmit()) {
      devActionLogger.warn("login.register.blocked", "submit disabled");
      return null;
    }

    if (!username || !password) {
      devActionLogger.warn("login.register.validation", "missing fields");
      return {
        status: LOGIN_STATUS_STATES.registerMissingFields,
        shouldNavigate: false,
        resolvedRole: null,
      };
    }

    if (username.length < 3 || password.length < 6) {
      devActionLogger.warn("login.register.validation", "invalid length");
      return {
        status: LOGIN_STATUS_STATES.registerInvalidFields,
        shouldNavigate: false,
        resolvedRole: null,
      };
    }

    return this.runAuthAction({
      pendingStatus: LOGIN_STATUS_STATES.registerPending,
      fallbackErrorStatus: LOGIN_STATUS_STATES.registerFailure,
      successStatus: LOGIN_STATUS_STATES.registerSuccess,
      invalidSuccessMessage:
        "\u6ce8\u518c\u7ed3\u679c\u4e0d\u5b8c\u6574\uff0c\u8bf7\u91cd\u8bd5",
      action: () => this.auth.register(username, password, role),
      onStatusChange,
    });
  }

  private async runAuthAction(options: {
    pendingStatus: LoginStatusState;
    fallbackErrorStatus: LoginStatusState;
    successStatus: LoginStatusState;
    invalidSuccessMessage: string;
    action: () => Promise<ApiResponse<AuthPayload>>;
    onStatusChange?: LoginStatusListener;
  }): Promise<LoginAuthOutcome> {
    // 登录和注册最后都会走到这一个通用提交流程里。
    this.isSubmitting = true;
    options.onStatusChange?.(options.pendingStatus);
    try {
      const result = await options.action();
      devActionLogger.info("login.auth.result", {
        success: result.success,
        code: result.code,
        statusCode: result.statusCode,
      });
      if (!result.success) {
        return {
          status: createErrorStatus(
            result.message ?? options.fallbackErrorStatus.message,
            options.fallbackErrorStatus
          ),
          shouldNavigate: false,
          resolvedRole: null,
        };
      }

      if (!hasCompleteAuthPayload(result)) {
        devActionLogger.warn("login.auth.incompletePayload", result.message);
        this.auth.logout();
        return {
          status: createErrorStatus(
            result.message ?? options.invalidSuccessMessage,
            options.fallbackErrorStatus
          ),
          shouldNavigate: false,
          resolvedRole: null,
        };
      }

      return {
        status: options.successStatus,
        shouldNavigate: true,
        resolvedRole: result.data.user.role,
      };
    } catch (error) {
      devActionLogger.error(
        "login.auth.exception",
        error instanceof Error ? error.message : String(error)
      );
      const message =
        error instanceof Error ? error.message : LOGIN_STATUS_STATES.networkError.message;
      return {
        status: createErrorStatus(message, LOGIN_STATUS_STATES.networkError),
        shouldNavigate: false,
        resolvedRole: null,
      };
    } finally {
      this.isSubmitting = false;
    }
  }
}
