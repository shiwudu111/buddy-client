import { sys } from "cc";
import { devActionLogger } from "../core/DevActionLogger";
import { nativeCapabilityService } from "./NativeCapabilityService";

export type HomeworkImagePickerResult = {
  success: boolean;
  image?: PickedHomeworkImage | null;
  title?: string;
  message?: string;
};

export type PickedHomeworkImage = {
  source: "web" | "android-native";
  fileName: string;
  mimeType: string;
  size: number;
  file?: File | Blob;
  bytes?: Uint8Array;
};

type NativePickerPayload = {
  status?: "pending" | "success" | "cancelled" | "error";
  fileName?: string;
  mimeType?: string;
  base64?: string;
  compressionApplied?: boolean;
  originalSize?: number;
  compressedSize?: number;
  message?: string;
};

class HomeworkImagePickerService {
  async pickImage(): Promise<HomeworkImagePickerResult> {
    if (sys.isNative) {
      devActionLogger.info("homework.imagePicker.native.start");
      return this.pickNativeImage();
    }
    devActionLogger.info("homework.imagePicker.web.start");
    return this.pickWebImage();
  }

  private pickWebImage(): Promise<HomeworkImagePickerResult> {
    if (typeof document === "undefined" || !document.body) {
      return Promise.resolve({
        success: false,
        title: "图片上传不可用",
        message: "当前运行环境暂不支持选择本地图片。",
      });
    }

    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.style.display = "none";

      let settled = false;
      const cleanup = (): void => {
        if (input.parentElement) {
          input.parentElement.removeChild(input);
        }
        window.removeEventListener("focus", handleFocus);
      };
      const settle = (file: File | null): void => {
        if (settled) {
          return;
        }
        settled = true;
        cleanup();
        resolve({
          success: Boolean(file),
          image: file
            ? {
                source: "web",
                fileName: file.name || "homework-image.jpg",
                mimeType: file.type || "image/jpeg",
                size: file.size,
                file,
              }
            : null,
        });
      };
      const handleFocus = (): void => {
        window.setTimeout(() => settle(input.files?.[0] ?? null), 250);
      };

      input.addEventListener("change", () => settle(input.files?.[0] ?? null), {
        once: true,
      });
      window.addEventListener("focus", handleFocus, { once: true });
      document.body.appendChild(input);
      input.click();
    });
  }

  private async pickNativeImage(): Promise<HomeworkImagePickerResult> {
    if (!nativeCapabilityService.hasBridge()) {
      devActionLogger.warn("homework.imagePicker.native.noBridge");
      return {
        success: false,
        title: "图片上传不可用",
        message: "当前原生环境未提供相册选择桥。",
      };
    }

    const permission = await this.ensurePhotoLibraryPermission();
    if (!permission.success) {
      return permission;
    }

    try {
      const started = nativeCapabilityService.callBoolean(
        "startHomeworkImagePicker",
        "()Z"
      );
      if (!started) {
        devActionLogger.warn("homework.imagePicker.native.notStarted");
        return {
          success: false,
          title: "图片选择未启动",
          message: "手机相册暂时无法打开，请稍后重试。",
        };
      }
    } catch (error) {
      devActionLogger.warn("homework.imagePicker.native.startFailed", this.stringifyError(error));
      return {
        success: false,
        title: "图片选择未启动",
        message: "手机相册暂时无法打开，请稍后重试。",
      };
    }

    const payload = await this.waitForNativeResult();
    if (!payload || payload.status === "cancelled") {
      devActionLogger.warn("homework.imagePicker.native.cancelled");
      return { success: false, image: null };
    }
    if (payload.status === "error") {
      return {
        success: false,
        title: "图片选择失败",
        message: payload.message ?? "读取手机相册图片失败。",
      };
    }
    if (!payload.base64) {
      return {
        success: false,
        title: "图片选择失败",
        message: "没有读取到图片内容。",
      };
    }

    try {
      return {
        success: true,
        image: this.createImage(payload),
      };
    } catch (error) {
      devActionLogger.warn("homework.imagePicker.native.decodeFailed", this.stringifyError(error));
      return {
        success: false,
        title: "图片选择失败",
        message: "手机图片读取后无法用于上传。",
      };
    }
  }

  private waitForNativeResult(): Promise<NativePickerPayload | null> {
    const startedAt = Date.now();
    const timeoutMs = 60000;
    const pollIntervalMs = 300;

    return new Promise((resolve) => {
      const poll = (): void => {
        let raw = "";
        try {
          raw = nativeCapabilityService.callString(
            "getHomeworkImagePickerResult",
            "()Ljava/lang/String;"
          );
        } catch (error) {
          devActionLogger.warn("homework.imagePicker.native.pollFailed", this.stringifyError(error));
          resolve({ status: "error", message: "读取手机相册结果失败。" });
          return;
        }

        if (raw) {
          try {
            const payload = JSON.parse(raw) as NativePickerPayload;
            if (payload.status && payload.status !== "pending") {
              resolve(payload);
              return;
            }
          } catch {
            resolve({ status: "error", message: "手机相册返回结果格式异常。" });
            return;
          }
        }

        if (Date.now() - startedAt >= timeoutMs) {
          resolve({ status: "error", message: "选择图片超时，请重新尝试。" });
          return;
        }
        window.setTimeout(poll, pollIntervalMs);
      };

      poll();
    });
  }

  private async ensurePhotoLibraryPermission(): Promise<HomeworkImagePickerResult> {
    const status = nativeCapabilityService.getPermissionStatus("photoLibrary");
    devActionLogger.info("homework.imagePicker.permission.status", status.status);
    if (status.status === "granted") {
      return { success: true };
    }

    const requested = nativeCapabilityService.requestPermission("photoLibrary");
    devActionLogger.info("homework.imagePicker.permission.request", requested.status);
    if (requested.status === "granted") {
      return { success: true };
    }
    if (requested.status === "denied") {
      return {
        success: false,
        title: "相册权限未开启",
        message: "需要允许访问相册后，才能选择作业图片。",
      };
    }

    const result = await this.waitForPermissionResult();
    if (result === "granted") {
      return { success: true };
    }
    return {
      success: false,
      title: "相册权限未开启",
      message: "需要允许访问相册后，才能选择作业图片。",
    };
  }

  private waitForPermissionResult(): Promise<string> {
    const startedAt = Date.now();
    const timeoutMs = 30000;
    const pollIntervalMs = 250;

    return new Promise((resolve) => {
      const poll = (): void => {
        const result = nativeCapabilityService.getPermissionRequestResult("photoLibrary");
        if (result.status === "granted" || result.status === "denied") {
          devActionLogger.info("homework.imagePicker.permission.result", result.status);
          resolve(result.status);
          return;
        }
        if (Date.now() - startedAt >= timeoutMs) {
          devActionLogger.warn("homework.imagePicker.permission.timeout");
          resolve("unknown");
          return;
        }
        window.setTimeout(poll, pollIntervalMs);
      };

      poll();
    });
  }

  private createImage(payload: NativePickerPayload): PickedHomeworkImage {
    const bytes = this.decodeBase64ToBytes(payload.base64 ?? "");
    const mimeType = payload.mimeType || "image/jpeg";
    const fileName = payload.fileName || "homework-image.jpg";
    devActionLogger.info("homework.imagePicker.native.compression", {
      applied: Boolean(payload.compressionApplied),
      originalSize: payload.originalSize ?? bytes.byteLength,
      compressedSize: payload.compressedSize ?? bytes.byteLength,
      finalSize: bytes.byteLength,
      mimeType,
      fileName,
    });
    return {
      source: "android-native",
      fileName,
      mimeType,
      size: bytes.byteLength,
      bytes,
    };
  }

  private decodeBase64ToBytes(base64: string): Uint8Array {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const clean = base64.replace(/\s+/g, "");
    const bytes: number[] = [];

    for (let index = 0; index < clean.length; index += 4) {
      const first = alphabet.indexOf(clean.charAt(index));
      const second = alphabet.indexOf(clean.charAt(index + 1));
      const thirdChar = clean.charAt(index + 2);
      const fourthChar = clean.charAt(index + 3);
      const third = thirdChar === "=" ? -1 : alphabet.indexOf(thirdChar);
      const fourth = fourthChar === "=" ? -1 : alphabet.indexOf(fourthChar);

      if (first < 0 || second < 0 || (thirdChar !== "=" && third < 0) || (fourthChar !== "=" && fourth < 0)) {
        throw new Error("Invalid base64 image data");
      }

      bytes.push((first << 2) | (second >> 4));
      if (third >= 0) {
        bytes.push(((second & 15) << 4) | (third >> 2));
      }
      if (third >= 0 && fourth >= 0) {
        bytes.push(((third & 3) << 6) | fourth);
      }
    }

    return new Uint8Array(bytes);
  }

  private stringifyError(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
  }
}

export const homeworkImagePickerService = new HomeworkImagePickerService();
