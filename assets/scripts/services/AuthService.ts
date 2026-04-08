import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type { ApiResponse, AuthPayload, AuthUser } from "../types/api";

function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    childId: user.childId ?? null,
    petId: user.petId ?? null,
  };
}

class AuthService {
  async bootstrapSession(): Promise<AuthUser | null> {
    if (!apiClient.getToken()) {
      return null;
    }

    const result = await apiClient.getCurrentUser();
    if (!result.success || !result.data) {
      this.logout();
      return null;
    }

    const user = normalizeUser(result.data);
    appState.setCurrentUser(user);
    return user;
  }

  async login(username: string, password: string): Promise<ApiResponse<AuthPayload>> {
    const result = await apiClient.login({ username, password });
    if (result.success && result.data?.user) {
      appState.setCurrentUser(normalizeUser(result.data.user));
    }
    return result;
  }

  async register(
    username: string,
    password: string
  ): Promise<ApiResponse<AuthPayload>> {
    const result = await apiClient.register({ username, password, role: "CHILD" });
    if (result.success && result.data?.user) {
      appState.setCurrentUser(normalizeUser(result.data.user));
    }
    return result;
  }

  logout(): void {
    apiClient.clearToken();
    appState.clearSession();
  }
}

export const authService = new AuthService();
