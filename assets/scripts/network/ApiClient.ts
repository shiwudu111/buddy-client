import { API_CONFIG } from "../core/config";
import { STORAGE_KEYS, storage } from "../core/storage";
import type {
  ApiResponse,
  AuthPayload,
  AuthUser,
  ChildPetPayload,
  HomeworkHistoryPayload,
  HomeworkTodayStatus,
  ParentBindPayload,
  PetResourcesPayload,
  PetStatus,
  WeeklyReportPayload,
} from "../types/api";

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
};

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
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
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
      const payload = raw
        ? (JSON.parse(raw) as ApiResponse<T>)
        : ({ success: response.ok } as ApiResponse<T>);

      if (!response.ok) {
        if (response.status === 401 && !options.skipAuth) {
          this.clearToken();
        }
        return {
          success: false,
          message: payload.message ?? `HTTP ${response.status}`,
          data: payload.data,
        };
      }

      return payload;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : "请求失败",
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

  async updatePetResources(
    petId: string,
    deltas: {
      fullness_delta?: number;
      mood_delta?: number;
      growth_delta?: number;
    }
  ): Promise<ApiResponse<PetResourcesPayload>> {
    return this.request<PetResourcesPayload>(`/pets/${petId}/resources`, {
      method: "PATCH",
      body: JSON.stringify(deltas),
    });
  }

  async submitHomework(input: {
    subject: string;
    content: string;
    imageUrl?: string;
  }): Promise<ApiResponse<{ expReward: number }>> {
    return this.request<{ expReward: number }>("/homeworks/submit", {
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

  async bindChild(
    childIdentifier: string
  ): Promise<ApiResponse<ParentBindPayload>> {
    return this.request<ParentBindPayload>("/parent/bind", {
      method: "POST",
      body: JSON.stringify({
        child_phone: childIdentifier,
        child_id: childIdentifier,
        child_username: childIdentifier,
      }),
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
