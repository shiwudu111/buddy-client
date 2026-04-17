import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type { ApiResponse, AuthPayload, AuthUser, UserRole } from "../types/api";
import { loginAccountStore } from "../ui/login/LoginAccountStore";

function normalizeUser(user: AuthUser): AuthUser {
  return {
    ...user,
    childId: user.childId ?? null,
    petId: user.petId ?? null,
  };
}

class AuthService {
  hasStoredSession(): boolean {
    return Boolean(apiClient.getToken());
  }

  async bootstrapSession(canCommit?: () => boolean): Promise<AuthUser | null> {
    if (!apiClient.getToken()) {
      return null;
    }

    const result = await apiClient.getCurrentUser();
    if (!result.success || !result.data) {
      if (!canCommit || canCommit()) {
        this.logout();
      }
      return null;
    }

    const user = normalizeUser(result.data);
    if (canCommit && !canCommit()) {
      return null;
    }
    loginAccountStore.rememberAccount(user);
    appState.setCurrentUser(user);
    return user;
  }

  async login(username: string, password: string): Promise<ApiResponse<AuthPayload>> {
    const result = await apiClient.login({ username, password });
    if (result.success && result.data?.user) {
      const user = normalizeUser(result.data.user);
      loginAccountStore.rememberAccount(user);
      appState.setCurrentUser(user);
    }
    return result;
  }

  async register(
    username: string,
    password: string,
    role: UserRole = "CHILD"
  ): Promise<ApiResponse<AuthPayload>> {
    const result = await apiClient.register({ username, password, role });
    if (result.success && result.data?.user) {
      const user = normalizeUser(result.data.user);
      loginAccountStore.rememberAccount(user);
      appState.setCurrentUser(user);
    }
    return result;
  }

  logout(): void {
    apiClient.clearToken();
    appState.clearSession();
  }
}

export const authService = new AuthService();
