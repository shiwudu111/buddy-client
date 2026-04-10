import { authService } from "../../services/AuthService";
import type { ApiResponse, AuthPayload } from "../../types/api";

export type LoginStatusTone = "neutral" | "success" | "error";

export type LoginStatusKey =
  | "idle"
  | "restorePending"
  | "restoreSuccess"
  | "restoreFailure"
  | "loginMissingFields"
  | "loginPending"
  | "loginSuccess"
  | "loginFailure"
  | "registerMissingFields"
  | "registerInvalidFields"
  | "registerPending"
  | "registerSuccess"
  | "registerFailure"
  | "networkError";

export type LoginStatusState = {
  key: LoginStatusKey;
  message: string;
  tone: LoginStatusTone;
};

export type LoginAuthOutcome = {
  status: LoginStatusState;
  shouldNavigate: boolean;
};

type LoginStatusListener = (status: LoginStatusState) => void;

export const LOGIN_STATUS_STATES: Record<LoginStatusKey, LoginStatusState> = {
  idle: { key: "idle", message: "请输入账号密码", tone: "neutral" },
  restorePending: {
    key: "restorePending",
    message: "正在恢复登录状态...",
    tone: "neutral",
  },
  restoreSuccess: {
    key: "restoreSuccess",
    message: "检测到已登录状态，正在进入主界面...",
    tone: "success",
  },
  restoreFailure: {
    key: "restoreFailure",
    message: "登录态恢复失败",
    tone: "error",
  },
  loginMissingFields: {
    key: "loginMissingFields",
    message: "请填写账号和密码",
    tone: "error",
  },
  loginPending: {
    key: "loginPending",
    message: "正在登录...",
    tone: "neutral",
  },
  loginSuccess: {
    key: "loginSuccess",
    message: "登录成功，正在进入主界面...",
    tone: "success",
  },
  loginFailure: {
    key: "loginFailure",
    message: "登录失败",
    tone: "error",
  },
  registerMissingFields: {
    key: "registerMissingFields",
    message: "请先输入要注册的账号和密码",
    tone: "error",
  },
  registerInvalidFields: {
    key: "registerInvalidFields",
    message: "账号至少 3 位，密码至少 6 位",
    tone: "error",
  },
  registerPending: {
    key: "registerPending",
    message: "正在注册...",
    tone: "neutral",
  },
  registerSuccess: {
    key: "registerSuccess",
    message: "注册成功，正在进入主界面...",
    tone: "success",
  },
  registerFailure: {
    key: "registerFailure",
    message: "注册失败",
    tone: "error",
  },
  networkError: {
    key: "networkError",
    message: "网络异常",
    tone: "error",
  },
};

function createErrorStatus(message: string, fallback: LoginStatusState): LoginStatusState {
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
  private isSubmitting = false;
  private isBootstrappingSession = false;

  constructor(private readonly auth: LoginAuthService = authService) {}

  hasStoredSession(): boolean {
    return this.auth.hasStoredSession();
  }

  canRestoreSession(): boolean {
    return !this.isSubmitting && !this.isBootstrappingSession && this.hasStoredSession();
  }

  canSubmit(): boolean {
    return !this.isSubmitting && !this.isBootstrappingSession;
  }

  async restoreSessionIfNeeded(onStatusChange?: LoginStatusListener): Promise<LoginAuthOutcome | null> {
    if (!this.canRestoreSession()) {
      return null;
    }

    this.isBootstrappingSession = true;
    onStatusChange?.(LOGIN_STATUS_STATES.restorePending);
    try {
      const user = await this.auth.bootstrapSession();
      if (user) {
        return {
          status: LOGIN_STATUS_STATES.restoreSuccess,
          shouldNavigate: true,
        };
      }

      return {
        status: LOGIN_STATUS_STATES.idle,
        shouldNavigate: false,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : LOGIN_STATUS_STATES.restoreFailure.message;
      return {
        status: createErrorStatus(message, LOGIN_STATUS_STATES.restoreFailure),
        shouldNavigate: false,
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
    if (!this.canSubmit()) {
      return null;
    }

    if (!username || !password) {
      return {
        status: LOGIN_STATUS_STATES.loginMissingFields,
        shouldNavigate: false,
      };
    }

    return this.runAuthAction({
      pendingStatus: LOGIN_STATUS_STATES.loginPending,
      fallbackErrorStatus: LOGIN_STATUS_STATES.loginFailure,
      successStatus: LOGIN_STATUS_STATES.loginSuccess,
      invalidSuccessMessage: "登录结果不完整，请重试",
      action: () => this.auth.login(username, password),
      onStatusChange,
    });
  }

  async register(
    username: string,
    password: string,
    onStatusChange?: LoginStatusListener
  ): Promise<LoginAuthOutcome | null> {
    if (!this.canSubmit()) {
      return null;
    }

    if (!username || !password) {
      return {
        status: LOGIN_STATUS_STATES.registerMissingFields,
        shouldNavigate: false,
      };
    }

    if (username.length < 3 || password.length < 6) {
      return {
        status: LOGIN_STATUS_STATES.registerInvalidFields,
        shouldNavigate: false,
      };
    }

    return this.runAuthAction({
      pendingStatus: LOGIN_STATUS_STATES.registerPending,
      fallbackErrorStatus: LOGIN_STATUS_STATES.registerFailure,
      successStatus: LOGIN_STATUS_STATES.registerSuccess,
      invalidSuccessMessage: "注册结果不完整，请重试",
      action: () => this.auth.register(username, password),
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
    this.isSubmitting = true;
    options.onStatusChange?.(options.pendingStatus);
    try {
      const result = await options.action();
      if (!result.success) {
        return {
          status: createErrorStatus(
            result.message ?? options.fallbackErrorStatus.message,
            options.fallbackErrorStatus
          ),
          shouldNavigate: false,
        };
      }

      if (!hasCompleteAuthPayload(result)) {
        this.auth.logout();
        return {
          status: createErrorStatus(
            result.message ?? options.invalidSuccessMessage,
            options.fallbackErrorStatus
          ),
          shouldNavigate: false,
        };
      }

      return {
        status: options.successStatus,
        shouldNavigate: true,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : LOGIN_STATUS_STATES.networkError.message;
      return {
        status: createErrorStatus(message, LOGIN_STATUS_STATES.networkError),
        shouldNavigate: false,
      };
    } finally {
      this.isSubmitting = false;
    }
  }
}
