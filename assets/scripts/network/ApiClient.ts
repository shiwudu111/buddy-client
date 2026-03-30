import { API_CONFIG } from "../core/config";
import { STORAGE_KEYS, storage } from "../core/storage";
import type {
  ApiResponse,
  AuthPayload,
  AuthUser,
  ChildPetPayload,
  HomeworkHistoryPayload,
  PetResourcesPayload,
  PetStatus,
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

    const payload = (await response.json()) as ApiResponse<T>;

    if (!response.ok) {
      return {
        success: false,
        message: payload.message ?? `HTTP ${response.status}`,
      };
    }

    return payload;
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
      storage.set(STORAGE_KEYS.user, JSON.stringify(result.data.user));
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
      storage.set(STORAGE_KEYS.user, JSON.stringify(result.data.user));
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

  async getChildPetStatus(
    childId: string
  ): Promise<ApiResponse<ChildPetPayload>> {
    return this.request<ChildPetPayload>(`/parent/pet/${childId}`);
  }
}

export const apiClient = new ApiClient();
