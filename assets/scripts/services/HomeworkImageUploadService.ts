import { getApiBaseUrl } from "../core/config";
import { devActionLogger } from "../core/DevActionLogger";
import { apiClient } from "../network/ApiClient";
import type { ApiResponse, HomeworkUploadResult } from "../types/api";
import type { PickedHomeworkImage } from "./HomeworkImagePickerService";

const HOMEWORK_UPLOAD_TIMEOUT_MS = 15000;
const UTF8_ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

class HomeworkImageUploadService {
  async upload(image: PickedHomeworkImage): Promise<ApiResponse<HomeworkUploadResult>> {
    devActionLogger.info("homework.imageUpload.request", {
      source: image.source,
      size: image.size,
      type: image.mimeType,
    });

    if (image.source === "android-native" && image.bytes) {
      return this.uploadMultipartBytes(image);
    }

    if (!image.file) {
      return {
        success: false,
        message: "No image file is available for upload.",
      };
    }
    return this.uploadWithFormData(image);
  }

  private async uploadWithFormData(
    image: PickedHomeworkImage
  ): Promise<ApiResponse<HomeworkUploadResult>> {
    try {
      const formData = new FormData();
      formData.append("file", image.file as Blob, image.fileName);
      return await apiClient.postMultipart<HomeworkUploadResult>("/homeworks/uploads", formData);
    } catch (error) {
      devActionLogger.warn(
        "homework.imageUpload.formData.failed",
        error instanceof Error ? error.message : String(error)
      );
      if (image.bytes) {
        return this.uploadMultipartBytes(image);
      }
      throw error;
    }
  }

  private uploadMultipartBytes(
    image: PickedHomeworkImage
  ): Promise<ApiResponse<HomeworkUploadResult>> {
    if (!UTF8_ENCODER || !image.bytes) {
      return Promise.resolve({
        success: false,
        message: "Current runtime cannot encode the selected image.",
      });
    }

    const boundary = `----BuddyHomework${Date.now().toString(16)}`;
    const safeFileName = image.fileName.replace(/"/g, "_");
    const head = UTF8_ENCODER.encode(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${safeFileName}"\r\n` +
        `Content-Type: ${image.mimeType}\r\n\r\n`
    );
    const tail = UTF8_ENCODER.encode(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(head.byteLength + image.bytes.byteLength + tail.byteLength);
    body.set(head, 0);
    body.set(image.bytes, head.byteLength);
    body.set(tail, head.byteLength + image.bytes.byteLength);

    devActionLogger.info("homework.imageUpload.multipart.start", {
      source: image.source,
      fileName: safeFileName,
      mimeType: image.mimeType,
      size: image.bytes.byteLength,
    });

    return this.uploadWithXhr(body.buffer, boundary);
  }

  private uploadWithXhr(
    body: ArrayBuffer,
    boundary: string
  ): Promise<ApiResponse<HomeworkUploadResult>> {
    const path = "/homeworks/uploads";
    const method = "POST";
    const startedAt = Date.now();
    const url = `${getApiBaseUrl()}${path}`;

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = HOMEWORK_UPLOAD_TIMEOUT_MS;
      xhr.open(method, url, true);
      xhr.setRequestHeader("Content-Type", `multipart/form-data; boundary=${boundary}`);
      const token = apiClient.getToken();
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      devActionLogger.info("homework.imageUpload.xhr.start", `${method} ${path}`);

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) {
          return;
        }
        const raw = xhr.responseText ?? "";
        devActionLogger.info(
          xhr.status >= 200 && xhr.status < 300
            ? "homework.imageUpload.xhr.ok"
            : "homework.imageUpload.xhr.fail",
          `${method} ${path} status=${xhr.status} ${Date.now() - startedAt}ms`
        );
        resolve(this.parseApiResponse(raw, xhr.status));
      };

      xhr.onerror = () => {
        devActionLogger.error("homework.imageUpload.xhr.error", `status=${xhr.status}`);
        resolve({
          success: false,
          message: `Image upload failed: ${xhr.status || "XHR error"}`,
          statusCode: xhr.status || undefined,
        });
      };

      xhr.ontimeout = () => {
        devActionLogger.error(
          "homework.imageUpload.xhr.timeout",
          `timeout=${HOMEWORK_UPLOAD_TIMEOUT_MS}ms`
        );
        resolve({
          success: false,
          message: "Image upload timed out. Please try again.",
        });
      };

      try {
        xhr.send(body);
      } catch (error) {
        devActionLogger.error(
          "homework.imageUpload.xhr.sendError",
          error instanceof Error ? error.message : String(error)
        );
        resolve({
          success: false,
          message: error instanceof Error ? error.message : "Image upload send failed.",
        });
      }
    });
  }

  private parseApiResponse(raw: string, status: number): ApiResponse<HomeworkUploadResult> {
    const ok = status >= 200 && status < 300;
    let payload: ApiResponse<HomeworkUploadResult> = { success: ok };
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ApiResponse<HomeworkUploadResult> | HomeworkUploadResult;
        payload =
          parsed && typeof parsed === "object" && "success" in parsed
            ? (parsed as ApiResponse<HomeworkUploadResult>)
            : { success: ok, data: parsed as HomeworkUploadResult };
      } catch {
        payload = {
          success: ok,
          message: ok ? undefined : `HTTP ${status}`,
        };
      }
    }

    if (!ok) {
      if (status === 401) {
        apiClient.clearToken();
      }
      return {
        success: false,
        message: payload.message ?? `HTTP ${status}`,
        code: payload.code,
        data: payload.data,
        statusCode: status,
      };
    }

    return {
      ...payload,
      statusCode: status,
    };
  }
}

export const homeworkImageUploadService = new HomeworkImageUploadService();
