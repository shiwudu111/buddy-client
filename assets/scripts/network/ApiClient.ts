import { getApiBaseUrl } from "../core/config";
import { devActionLogger } from "../core/DevActionLogger";
import { STORAGE_KEYS, storage } from "../core/storage";
import type {
  ApiResponse,
  AuthPayload,
  AuthUser,
  ChatHistoryPayload,
  ChatReplyPayload,
  ChatSendPayload,
  DiaryPayload,
  HomeworkSubmitPayload,
  HomeworkSubmitResultPayload,
  HomeworkUploadResult,
  ChildPetPayload,
  HomeworkHistoryPayload,
  HomeworkTodayStatus,
  ParentBindPayload,
  PetDashboardPayload,
  PetFeedPayload,
  PetEvolutionPayload,
  PetActionResultPayload,
  PetEventsPayload,
  PetFeedResultPayload,
  PetResourcesPayload,
  PetStatus,
  UseInventoryItemPayload,
  UseInventoryItemResultPayload,
  WeeklyReportPayload,
} from "../types/api";

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

type ApiTransportResponse = {
  status: number;
  ok: boolean;
  text: () => Promise<string>;
};

const DASHBOARD_REQUEST_TIMEOUT_MS = 8000;
const HOMEWORK_UPLOAD_TIMEOUT_MS = 15000;
const UTF8_ENCODER = typeof TextEncoder !== "undefined" ? new TextEncoder() : null;

type HomeworkUploadFile = (File | Blob) & {
  name?: string;
  __buddyBytes?: Uint8Array;
};

function isFormDataRequestBody(body: BodyInit | null | undefined): boolean {
  if (!body || typeof FormData === "undefined") {
    return false;
  }
  try {
    return body instanceof FormData;
  } catch {
    return Object.prototype.toString.call(body) === "[object FormData]";
  }
}

type PetResourceReason =
  | "manual_feed"
  | "manual_play"
  | "homework_reward"
  | "daily_decay"
  | "system_adjust";

function looksLikeChildId(identifier: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    identifier.trim()
  );
}

type QueryValue = string | number | boolean | null | undefined;

function buildQuery(params: Record<string, QueryValue>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join("&");
}

class ApiClient {
  private token: string | null = storage.get(STORAGE_KEYS.token);

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string): void {
    this.token = token;
    storage.set(STORAGE_KEYS.token, token);
  }

  clearToken(): void {
    this.token = null;
    storage.remove(STORAGE_KEYS.token);
  }

  isLoggedIn(): boolean {
    return Boolean(this.token);
  }

  private async request<T>(
    path: string,
    options: RequestOptions = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method ?? "GET";
    const startedAt = Date.now();
    const url = `${getApiBaseUrl()}${path}`;
    const isDashboardRequest = path.includes("/dashboard");
    devActionLogger.info(
      isDashboardRequest ? "api.dashboard.request.start.v21" : "api.request.start",
      `${method} ${path}`
    );
    try {
      const isFormDataBody = isFormDataRequestBody(options.body);
      const headers: Record<string, string> = {
        ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
        ...(options.headers as Record<string, string> | undefined),
      };

      if (!options.skipAuth && this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      if (isDashboardRequest) {
        devActionLogger.info("api.dashboard.xhr.prepare.v21", {
          method,
          url,
          hasToken: Boolean(this.token),
        });
      }

      const response = isDashboardRequest
        ? await this.requestDashboardWithXhr(url, method, headers, options.body)
        : await fetch(url, {
          ...options,
          headers,
        });
      if (isDashboardRequest) {
        devActionLogger.info(
          "api.dashboard.transport.after.v21",
          `status=${response.status} ok=${response.ok} elapsed=${Date.now() - startedAt}ms`
        );
      }
      devActionLogger.info(
        response.ok ? "api.request.ok" : "api.request.fail",
        `${method} ${path} status=${response.status} ${Date.now() - startedAt}ms`
      );

      if (isDashboardRequest) {
        devActionLogger.info("api.dashboard.text.before", `status=${response.status}`);
      }
      const raw = await response.text();
      if (isDashboardRequest) {
        devActionLogger.info("api.dashboard.text.after", `rawLength=${raw.length}`);
      }
      let payload: ApiResponse<T> = { success: response.ok };
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ApiResponse<T> | T;
          if (isDashboardRequest) {
            devActionLogger.info(
              "api.dashboard.json.parsed",
              `wrapped=${Boolean(parsed && typeof parsed === "object" && "success" in parsed)}`
            );
          }
          payload =
            parsed && typeof parsed === "object" && "success" in parsed
              ? (parsed as ApiResponse<T>)
              : { success: response.ok, data: parsed as T };
        } catch (error) {
          if (isDashboardRequest) {
            devActionLogger.error(
              "api.dashboard.json.parseError",
              error instanceof Error ? error.message : String(error)
            );
          }
          payload = {
            success: response.ok,
            message: response.ok ? undefined : `HTTP ${response.status}`,
          };
        }
      }

      if (!response.ok) {
        if (response.status === 401 && !options.skipAuth) {
          this.clearToken();
        }
        return {
          success: false,
          message: payload.message ?? `HTTP ${response.status}`,
          code: payload.code,
          data: payload.data,
          statusCode: response.status,
        };
      }

      return {
        ...payload,
        statusCode: response.status,
      };
    } catch (error) {
      devActionLogger.error(
        "api.request.error",
        `${method} ${path} ${error instanceof Error ? error.message : String(error)}`
      );
      const rawMessage = error instanceof Error ? error.message : "请求失败";
      const message =
        rawMessage === "Failed to fetch"
          ? "网络请求失败，请确认后端服务可访问且已允许当前预览来源跨域访问"
          : rawMessage;

      return {
        success: false,
        message,
      };
    }
  }

  private requestDashboardWithXhr(
    url: string,
    method: string,
    headers: Record<string, string>,
    body?: BodyInit | null
  ): Promise<ApiTransportResponse> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = DASHBOARD_REQUEST_TIMEOUT_MS;
      xhr.open(method, url, true);
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }

      devActionLogger.info("api.dashboard.xhr.before.v21", {
        method,
        url,
        timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
      });

      const timeoutId = setTimeout(() => {
        devActionLogger.error("api.dashboard.xhr.watchdogTimeout.v21", {
          url,
          readyState: xhr.readyState,
          timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
        });
        try {
          xhr.abort();
        } catch {
          // Ignore abort errors; the promise rejection below drives the UI fallback.
        }
        reject(new Error(`Dashboard XHR timeout after ${DASHBOARD_REQUEST_TIMEOUT_MS}ms`));
      }, DASHBOARD_REQUEST_TIMEOUT_MS + 1000);

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) {
          return;
        }
        clearTimeout(timeoutId);
        devActionLogger.info("api.dashboard.xhr.done.v21", {
          status: xhr.status,
          responseLength: xhr.responseText?.length ?? 0,
        });
        resolve({
          status: xhr.status,
          ok: xhr.status >= 200 && xhr.status < 300,
          text: async () => xhr.responseText ?? "",
        });
      };

      xhr.onerror = () => {
        clearTimeout(timeoutId);
        devActionLogger.error("api.dashboard.xhr.error.v21", {
          status: xhr.status,
          readyState: xhr.readyState,
        });
        reject(new Error(`Dashboard XHR failed with status ${xhr.status}`));
      };

      xhr.ontimeout = () => {
        clearTimeout(timeoutId);
        devActionLogger.error("api.dashboard.xhr.timeout.v21", {
          status: xhr.status,
          readyState: xhr.readyState,
          timeoutMs: DASHBOARD_REQUEST_TIMEOUT_MS,
        });
        reject(new Error(`Dashboard XHR timeout after ${DASHBOARD_REQUEST_TIMEOUT_MS}ms`));
      };

      try {
        xhr.send((body as XMLHttpRequestBodyInit | null | undefined) ?? null);
        devActionLogger.info("api.dashboard.xhr.sent.v21", {
          method,
          hasBody: Boolean(body),
        });
      } catch (error) {
        clearTimeout(timeoutId);
        devActionLogger.error(
          "api.dashboard.xhr.sendError.v21",
          error instanceof Error ? error.message : String(error)
        );
        reject(error);
      }
    });
  }

  private requestWithXhr<T>(
    path: string,
    options: RequestOptions & { body?: XMLHttpRequestBodyInit | null } = {}
  ): Promise<ApiResponse<T>> {
    const method = options.method ?? "GET";
    const url = `${getApiBaseUrl()}${path}`;
    const startedAt = Date.now();
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> | undefined),
    };
    if (!options.skipAuth && this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    devActionLogger.info("api.xhr.request.start", `${method} ${path}`);

    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.timeout = HOMEWORK_UPLOAD_TIMEOUT_MS;
      xhr.open(method, url, true);
      for (const [key, value] of Object.entries(headers)) {
        xhr.setRequestHeader(key, value);
      }

      xhr.onreadystatechange = () => {
        if (xhr.readyState !== 4) {
          return;
        }
        const raw = xhr.responseText ?? "";
        devActionLogger.info(
          xhr.status >= 200 && xhr.status < 300 ? "api.xhr.request.ok" : "api.xhr.request.fail",
          `${method} ${path} status=${xhr.status} ${Date.now() - startedAt}ms`
        );
        resolve(this.parseApiResponse<T>(raw, xhr.status));
      };

      xhr.onerror = () => {
        devActionLogger.error("api.xhr.request.error", `${method} ${path} status=${xhr.status}`);
        resolve({
          success: false,
          message: `网络请求失败：${xhr.status || "XHR error"}`,
          statusCode: xhr.status || undefined,
        });
      };

      xhr.ontimeout = () => {
        devActionLogger.error(
          "api.xhr.request.timeout",
          `${method} ${path} timeout=${HOMEWORK_UPLOAD_TIMEOUT_MS}ms`
        );
        resolve({
          success: false,
          message: "图片上传超时，请重新选择后再试。",
        });
      };

      try {
        xhr.send(options.body ?? null);
      } catch (error) {
        devActionLogger.error(
          "api.xhr.request.sendError",
          error instanceof Error ? error.message : String(error)
        );
        resolve({
          success: false,
          message: error instanceof Error ? error.message : "图片上传发送失败。",
        });
      }
    });
  }

  private parseApiResponse<T>(raw: string, status: number): ApiResponse<T> {
    const ok = status >= 200 && status < 300;
    let payload: ApiResponse<T> = { success: ok };
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as ApiResponse<T> | T;
        payload =
          parsed && typeof parsed === "object" && "success" in parsed
            ? (parsed as ApiResponse<T>)
            : { success: ok, data: parsed as T };
      } catch {
        payload = {
          success: ok,
          message: ok ? undefined : `HTTP ${status}`,
        };
      }
    }

    if (!ok) {
      if (status === 401) {
        this.clearToken();
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
  async register(input: {
    username: string;
    password: string;
    email?: string;
    role?: "CHILD" | "PARENT";
  }): Promise<ApiResponse<AuthPayload>> {
    devActionLogger.info("auth.register.api", {
      username: input.username,
      role: input.role ?? "CHILD",
    });
    const result = await this.request<AuthPayload>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    });

    if (result.success && result.data?.token) {
      this.setToken(result.data.token);
      storage.setJson(STORAGE_KEYS.user, result.data.user);
    }

    return result;
  }

  async login(input: {
    username: string;
    password: string;
  }): Promise<ApiResponse<AuthPayload>> {
    devActionLogger.info("auth.login.api", { username: input.username });
    const result = await this.request<AuthPayload>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
      skipAuth: true,
    });

    if (result.success && result.data?.token) {
      this.setToken(result.data.token);
      storage.setJson(STORAGE_KEYS.user, result.data.user);
    }

    return result;
  }

  async getCurrentUser(): Promise<ApiResponse<AuthUser>> {
    return this.request<AuthUser>("/auth/me");
  }

  async createPet(name: string): Promise<ApiResponse<PetStatus>> {
    return this.request<PetStatus>("/pets", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  }

  async getPetStatus(petId: string): Promise<ApiResponse<PetStatus>> {
    return this.request<PetStatus>(`/pets/${petId}`);
  }

  async getPetEvolution(petId: string): Promise<ApiResponse<PetEvolutionPayload>> {
    return this.request<PetEvolutionPayload>(`/pets/${petId}/evolution`);
  }

  async getPetDashboard(petId: string): Promise<ApiResponse<PetDashboardPayload>> {
    const encodedPetId = encodeURIComponent(petId);
    devActionLogger.info("api.petDashboard.path.v21", `petId=${petId}`);
    devActionLogger.info("api.petDashboard.path", { petId, encodedPetId });
    return this.request<PetDashboardPayload>(`/pets/${encodedPetId}/dashboard`);
  }

  async getPetEvents(petId: string, limit = 20): Promise<ApiResponse<PetEventsPayload>> {
    const query = buildQuery({ limit });
    return this.request<PetEventsPayload>(
      `/pets/${encodeURIComponent(petId)}/events?${query}`
    );
  }

  async getPetLogs(petId: string, options: { days: number }): Promise<ApiResponse<DiaryPayload>> {
    const query = buildQuery({ days: options.days });
    return this.request<DiaryPayload>(
      `/pets/${encodeURIComponent(petId)}/logs?${query}`
    );
  }

  async sendChat(input: ChatSendPayload): Promise<ApiResponse<ChatReplyPayload>> {
    return this.request<ChatReplyPayload>("/chat", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getChatHistory(
    petId: string,
    limit = 20
  ): Promise<ApiResponse<ChatHistoryPayload>> {
    const query = buildQuery({ limit });
    return this.request<ChatHistoryPayload>(
      `/chat/${encodeURIComponent(petId)}/history?${query}`
    );
  }

  async updatePetResources(
    petId: string,
    deltas: {
      fullness_delta?: number;
      mood_delta?: number;
      growth_delta?: number;
      reason: PetResourceReason;
    }
  ): Promise<ApiResponse<PetResourcesPayload>> {
    return this.request<PetResourcesPayload>(`/pets/${petId}/resources`, {
      method: "PATCH",
      body: JSON.stringify(deltas),
    });
  }

  async feedPet(
    petId: string,
    payload: PetFeedPayload
  ): Promise<ApiResponse<PetFeedResultPayload>> {
    return this.request<PetFeedResultPayload>(`/pets/${petId}/feed`, {
      method: "POST",
      body: JSON.stringify({
        ...payload,
        count: payload.count ?? 1,
      }),
    });
  }

  async useInventoryItem(
    petId: string,
    payload: UseInventoryItemPayload
  ): Promise<ApiResponse<UseInventoryItemResultPayload>> {
    return this.request<UseInventoryItemResultPayload>(
      `/pets/${encodeURIComponent(petId)}/inventory/use`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      }
    );
  }

  async sleepPet(petId: string): Promise<ApiResponse<PetActionResultPayload>> {
    return this.request<PetActionResultPayload>(`/pets/${petId}/sleep`, {
      method: "POST",
    });
  }

  async playPet(petId: string): Promise<ApiResponse<PetActionResultPayload>> {
    return this.request<PetActionResultPayload>(`/pets/${petId}/play`, {
      method: "POST",
    });
  }

  async carePet(petId: string): Promise<ApiResponse<PetActionResultPayload>> {
    return this.request<PetActionResultPayload>(`/pets/${petId}/care`, {
      method: "POST",
    });
  }

  async uploadHomeworkImage(file: File | Blob): Promise<ApiResponse<HomeworkUploadResult>> {
    const uploadFile = file as HomeworkUploadFile;
    const fileName = uploadFile.name || "homework-image.jpg";
    try {
      const formData = new FormData();
      formData.append("file", file, fileName);
      return await this.request<HomeworkUploadResult>("/homeworks/uploads", {
        method: "POST",
        body: formData,
      });
    } catch (error) {
      devActionLogger.warn(
        "api.homeworkUpload.formData.failed",
        error instanceof Error ? error.message : String(error)
      );
      if (!uploadFile.__buddyBytes) {
        throw error;
      }
      return this.uploadHomeworkImageMultipart(uploadFile, uploadFile.__buddyBytes, fileName);
    }
  }

  private async uploadHomeworkImageMultipart(
    file: HomeworkUploadFile,
    bytes: Uint8Array,
    fileName: string
  ): Promise<ApiResponse<HomeworkUploadResult>> {
    if (!UTF8_ENCODER) {
      return {
        success: false,
        message: "当前环境不支持图片上传编码。",
      };
    }

    const boundary = `----BuddyHomework${Date.now().toString(16)}`;
    const mimeType = file.type || "image/jpeg";
    const safeFileName = fileName.replace(/"/g, "_");
    const head = UTF8_ENCODER.encode(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="file"; filename="${safeFileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
    );
    const tail = UTF8_ENCODER.encode(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(head.byteLength + bytes.byteLength + tail.byteLength);
    body.set(head, 0);
    body.set(bytes, head.byteLength);
    body.set(tail, head.byteLength + bytes.byteLength);

    devActionLogger.info("api.homeworkUpload.multipart.start", {
      fileName: safeFileName,
      mimeType,
      size: bytes.byteLength,
    });

    return this.requestWithXhr<HomeworkUploadResult>("/homeworks/uploads", {
      method: "POST",
      body: body.buffer,
      headers: {
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
    });
  }

  async submitHomework(
    input: HomeworkSubmitPayload
  ): Promise<ApiResponse<HomeworkSubmitResultPayload>> {
    return this.request<HomeworkSubmitResultPayload>("/homeworks/submit", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async getHomeworkHistory(
    page = 1,
    limit = 10
  ): Promise<ApiResponse<HomeworkHistoryPayload>> {
    const query = buildQuery({ page, limit });
    return this.request<HomeworkHistoryPayload>(`/homeworks/history?${query}`);
  }

  async getHomeworkStatus(): Promise<ApiResponse<HomeworkTodayStatus>> {
    return this.request<HomeworkTodayStatus>("/homeworks/status");
  }

  async resetTodayHomeworkForDev(petId?: string | null): Promise<ApiResponse<{ message?: string }>> {
    return this.request<{ message?: string }>("/homeworks/dev/reset-today", {
      method: "POST",
      body: JSON.stringify({
        ...(petId ? { petId } : {}),
      }),
    });
  }

  async bindChild(
    childIdentifier: string
  ): Promise<ApiResponse<ParentBindPayload>> {
    const identifier = childIdentifier.trim();
    const body = looksLikeChildId(identifier)
      ? { child_id: identifier }
      : { child_username: identifier };

    return this.request<ParentBindPayload>("/parent/bind", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  async getChildPetStatus(
    childId: string
  ): Promise<ApiResponse<ChildPetPayload>> {
    return this.request<ChildPetPayload>(`/parent/pet/${childId}`);
  }

  async getWeeklyReport(
    childId: string
  ): Promise<ApiResponse<WeeklyReportPayload>> {
    return this.request<WeeklyReportPayload>(
      `/parent/report/weekly?child_id=${encodeURIComponent(childId)}`
    );
  }
}

export const apiClient = new ApiClient();
