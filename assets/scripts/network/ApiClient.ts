import { API_CONFIG } from "../core/config";
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
    try {
      const isFormDataBody =
        typeof FormData !== "undefined" && options.body instanceof FormData;
      const headers: Record<string, string> = {
        ...(isFormDataBody ? {} : { "Content-Type": "application/json" }),
        ...(options.headers as Record<string, string> | undefined),
      };

      if (!options.skipAuth && this.token) {
        headers.Authorization = `Bearer ${this.token}`;
      }

      const response = await fetch(`${API_CONFIG.baseUrl}${path}`, {
        ...options,
        headers,
      });

      const raw = await response.text();
      let payload: ApiResponse<T> = { success: response.ok };
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as ApiResponse<T> | T;
          payload =
            parsed && typeof parsed === "object" && "success" in parsed
              ? (parsed as ApiResponse<T>)
              : { success: response.ok, data: parsed as T };
        } catch {
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

  async register(input: {
    username: string;
    password: string;
    email?: string;
    role?: "CHILD" | "PARENT";
  }): Promise<ApiResponse<AuthPayload>> {
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
    return this.request<PetDashboardPayload>(`/pets/${petId}/dashboard`);
  }

  async getPetEvents(petId: string, limit = 20): Promise<ApiResponse<PetEventsPayload>> {
    const query = new URLSearchParams({
      limit: String(limit),
    });
    return this.request<PetEventsPayload>(
      `/pets/${encodeURIComponent(petId)}/events?${query.toString()}`
    );
  }

  async getPetLogs(petId: string, options: { days: number }): Promise<ApiResponse<DiaryPayload>> {
    const query = new URLSearchParams({
      days: String(options.days),
    });
    return this.request<DiaryPayload>(
      `/pets/${encodeURIComponent(petId)}/logs?${query.toString()}`
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
    const query = new URLSearchParams({
      limit: String(limit),
    });
    return this.request<ChatHistoryPayload>(
      `/chat/${encodeURIComponent(petId)}/history?${query.toString()}`
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
    const formData = new FormData();
    formData.append("file", file);
    return this.request<HomeworkUploadResult>("/homeworks/uploads", {
      method: "POST",
      body: formData,
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
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    return this.request<HomeworkHistoryPayload>(
      `/homeworks/history?${query.toString()}`
    );
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
