import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type {
  ApiResponse,
  ChildPetPayload,
  ParentBindPayload,
  WeeklyReportPayload,
} from "../types/api";

class ParentService {
  async bindChild(childIdentifier: string): Promise<ApiResponse<ParentBindPayload>> {
    const result = await apiClient.bindChild(childIdentifier);
    if (result.success && result.data) {
      appState.patchCurrentUser({
        childId: result.data.childId ?? result.data.child_id ?? null,
      });
    }
    return result;
  }

  async getChildOverview(): Promise<ApiResponse<ChildPetPayload>> {
    const childId = appState.getLinkedChildId();
    if (!childId) {
      return {
        success: false,
        message: "当前家长账号尚未绑定孩子",
      };
    }
    return apiClient.getChildPetStatus(childId);
  }

  async getWeeklyReport(): Promise<ApiResponse<WeeklyReportPayload>> {
    const childId = appState.getLinkedChildId();
    if (!childId) {
      return {
        success: false,
        message: "当前家长账号尚未绑定孩子",
      };
    }
    return apiClient.getWeeklyReport(childId);
  }
}

export const parentService = new ParentService();
