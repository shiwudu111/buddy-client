import { native, sys } from "cc";
import { devActionLogger } from "../core/DevActionLogger";

export type NativePermissionName = "microphone" | "photoLibrary";
export type NativePermissionStatus = "granted" | "denied" | "unavailable" | "unknown" | "error";

export type NativePermissionResult = {
  status: NativePermissionStatus;
  message?: string;
};

type ReflectionBridge = {
  callStaticMethod: (...args: unknown[]) => unknown;
};

class NativeCapabilityService {
  isNative(): boolean {
    return sys.isNative;
  }

  hasBridge(): boolean {
    return Boolean(this.resolveBridge());
  }

  callBoolean(methodName: string, methodSignature: string, ...args: unknown[]): boolean {
    const bridge = this.resolveBridge();
    if (!bridge) {
      return false;
    }
    try {
      return Boolean(bridge.callStaticMethod("com/cocos/game/AppActivity", methodName, methodSignature, ...args));
    } catch (error) {
      devActionLogger.warn(`native.capability.${methodName}.failed`, this.stringifyError(error));
      return false;
    }
  }

  callString(methodName: string, methodSignature: string, ...args: unknown[]): string {
    const bridge = this.resolveBridge();
    if (!bridge) {
      return "";
    }
    try {
      return String(bridge.callStaticMethod("com/cocos/game/AppActivity", methodName, methodSignature, ...args) ?? "");
    } catch (error) {
      devActionLogger.warn(`native.capability.${methodName}.failed`, this.stringifyError(error));
      return "";
    }
  }

  getPermissionStatus(permission: NativePermissionName): NativePermissionResult {
    if (!this.isNative()) {
      return { status: "unavailable", message: "当前环境不是原生应用。" };
    }
    if (permission === "photoLibrary") {
      return { status: "granted" };
    }

    const raw = this.callString(
      "getNativePermissionStatus",
      "(Ljava/lang/String;)Ljava/lang/String;",
      permission
    );
    return this.parsePermissionResult(raw);
  }

  requestPermission(permission: NativePermissionName): NativePermissionResult {
    if (!this.isNative()) {
      return { status: "unavailable", message: "当前环境不是原生应用。" };
    }
    if (permission === "photoLibrary") {
      return { status: "granted" };
    }

    const raw = this.callString(
      "requestNativePermission",
      "(Ljava/lang/String;)Ljava/lang/String;",
      permission
    );
    return this.parsePermissionResult(raw);
  }

  getPermissionRequestResult(permission: NativePermissionName): NativePermissionResult {
    if (!this.isNative()) {
      return { status: "unavailable", message: "当前环境不是原生应用。" };
    }
    if (permission === "photoLibrary") {
      return { status: "granted" };
    }

    const raw = this.callString(
      "getNativePermissionRequestResult",
      "(Ljava/lang/String;)Ljava/lang/String;",
      permission
    );
    return this.parsePermissionResult(raw);
  }

  private resolveBridge(): ReflectionBridge | null {
    const runtimeGlobal = globalThis as typeof globalThis & {
      jsb?: { reflection?: { callStaticMethod?: (...args: unknown[]) => unknown } };
    };
    const nativeBridge = native as typeof native & {
      reflection?: { callStaticMethod?: (...args: unknown[]) => unknown };
    };
    const bridge = nativeBridge.reflection ?? runtimeGlobal.jsb?.reflection;
    return bridge?.callStaticMethod ? { callStaticMethod: bridge.callStaticMethod.bind(bridge) } : null;
  }

  private parsePermissionResult(raw: string): NativePermissionResult {
    if (!raw) {
      return { status: "unavailable", message: "当前原生能力不可用。" };
    }
    try {
      const result = JSON.parse(raw) as NativePermissionResult;
      return {
        status: result.status ?? "unknown",
        message: result.message,
      };
    } catch {
      return { status: "error", message: "原生权限结果格式异常。" };
    }
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export const nativeCapabilityService = new NativeCapabilityService();
