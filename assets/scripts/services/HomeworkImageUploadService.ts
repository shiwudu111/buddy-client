import { getApiBaseUrl } from "../core/config";
import { devActionLogger } from "../core/DevActionLogger";
import { apiClient } from "../network/ApiClient";
import type { ApiResponse, HomeworkUploadResult } from "../types/api";
import type { PickedHomeworkImage } from "./HomeworkImagePickerService";

const HOMEWORK_UPLOAD_TIMEOUT_MS = 15000;
const MAX_HOMEWORK_IMAGE_UPLOAD_BYTES = 9 * 1024 * 1024;
const COMPRESS_IMAGE_ABOVE_BYTES = 2 * 1024 * 1024;
const COMPRESSED_IMAGE_MAX_EDGE = 1600;
const COMPRESSED_IMAGE_QUALITY = 0.82;
const UTF8_ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

class HomeworkImageUploadService {
  async upload(image: PickedHomeworkImage): Promise<ApiResponse<HomeworkUploadResult>> {
    const prepared = await this.prepareImageForUpload(image);
    if (!prepared.success || !prepared.image) {
      return {
        success: false,
        message: prepared.message ?? "图片太大，请换一张更清晰但体积更小的图片。",
      };
    }
    image = prepared.image;

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

  private async prepareImageForUpload(
    image: PickedHomeworkImage
  ): Promise<{ success: boolean; image?: PickedHomeworkImage; message?: string }> {
    const compressed =
      image.size >= COMPRESS_IMAGE_ABOVE_BYTES ? await this.tryCompressImage(image) : null;
    const uploadImage = compressed && compressed.size < image.size ? compressed : image;

    if (uploadImage.size > MAX_HOMEWORK_IMAGE_UPLOAD_BYTES) {
      devActionLogger.warn("homework.imageUpload.tooLarge", {
        originalSize: image.size,
        finalSize: uploadImage.size,
        limit: MAX_HOMEWORK_IMAGE_UPLOAD_BYTES,
      });
      return {
        success: false,
        message: "图片太大，请换一张小于 9MB 的图片，或先截图/压缩后再上传。",
      };
    }

    if (uploadImage !== image) {
      devActionLogger.info("homework.imageUpload.compressed", {
        originalSize: image.size,
        finalSize: uploadImage.size,
        type: uploadImage.mimeType,
      });
    }
    return { success: true, image: uploadImage };
  }

  private async tryCompressImage(image: PickedHomeworkImage): Promise<PickedHomeworkImage | null> {
    if (
      typeof document === "undefined" ||
      typeof Image === "undefined" ||
      typeof URL === "undefined" ||
      typeof Blob === "undefined"
    ) {
      return null;
    }

    const sourceBlob = image.file
      ? image.file
      : image.bytes
        ? new Blob([this.copyBytesToArrayBuffer(image.bytes)], {
            type: image.mimeType || "image/jpeg",
          })
        : null;
    if (!sourceBlob) {
      return null;
    }

    try {
      const bitmap = await this.loadImage(sourceBlob);
      const scale = Math.min(
        1,
        COMPRESSED_IMAGE_MAX_EDGE / Math.max(bitmap.width, bitmap.height)
      );
      const width = Math.max(1, Math.round(bitmap.width * scale));
      const height = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d");
      if (!context) {
        return null;
      }
      context.drawImage(bitmap, 0, 0, width, height);
      const blob = await this.canvasToBlob(canvas, "image/jpeg", COMPRESSED_IMAGE_QUALITY);
      if (!blob || blob.size >= image.size) {
        return null;
      }

      const compressed: PickedHomeworkImage = {
        source: image.source,
        fileName: this.toJpegFileName(image.fileName),
        mimeType: "image/jpeg",
        size: blob.size,
        file: blob,
      };
      if (image.bytes && typeof blob.arrayBuffer === "function") {
        compressed.bytes = new Uint8Array(await blob.arrayBuffer());
      }
      return compressed;
    } catch (error) {
      devActionLogger.warn(
        "homework.imageUpload.compress.failed",
        error instanceof Error ? error.message : String(error)
      );
      return null;
    }
  }

  private loadImage(blob: Blob): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Image decode failed"));
      };
      image.src = url;
    });
  }

  private copyBytesToArrayBuffer(bytes: Uint8Array): ArrayBuffer {
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    return buffer;
  }

  private canvasToBlob(
    canvas: HTMLCanvasElement,
    mimeType: string,
    quality: number
  ): Promise<Blob | null> {
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), mimeType, quality);
    });
  }

  private toJpegFileName(fileName: string): string {
    const baseName = fileName.trim() || "homework-image";
    return /\.(png|jpe?g|webp|heic|heif)$/i.test(baseName)
      ? baseName.replace(/\.(png|jpe?g|webp|heic|heif)$/i, ".jpg")
      : `${baseName}.jpg`;
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
