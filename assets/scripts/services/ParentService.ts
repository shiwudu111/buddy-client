import { appState } from "../app/AppState";
import { apiClient } from "../network/ApiClient";
import type {
  ApiResponse,
  ChildPetPayload,
  ParentBindPayload,
  WeeklyReportPayload,
} from "../types/api";

function normalizeParentMessage(result: ApiResponse<unknown>): string | undefined {
  const message = result.message?.trim();
  const statusCode = result.statusCode;

  if (statusCode === 403) {
    return "当前账号没有查看该孩子的权限。";
  }
  if (statusCode === 404) {
    return "未找到对应的孩子账号。";
  }
  if (statusCode === 409) {
    if (message?.toLowerCase().includes("another parent")) {
      return "该孩子账号已绑定到其他家长。";
    }
    return "当前家长账号已绑定其他孩子。";
  }

  if (!message) {
    return undefined;
  }

  const lowerMessage = message.toLowerCase();
  if (lowerMessage.includes("child account not found")) {
    return "未找到对应的孩子账号。";
  }
  if (lowerMessage.includes("already bound to another parent")) {
    return "该孩子账号已绑定到其他家长。";
  }
  if (lowerMessage.includes("already bound")) {
    return "当前家长账号已绑定其他孩子。";
  }

  return message;
}

class ParentService {
  async bindChild(childIdentifier: string): Promise<ApiResponse<ParentBindPayload>> {
    const result = await apiClient.bindChild(childIdentifier);
    return result.success
      ? result
      : {
          ...result,
          message: normalizeParentMessage(result) ?? "绑定失败。",
        };
  }

  async getChildOverview(): Promise<ApiResponse<ChildPetPayload>> {
    const childId = appState.getLinkedChildId();
    if (!childId) {
      return {
        success: false,
        message: "当前家长账号尚未绑定孩子。",
      };
    }

    const result = await apiClient.getChildPetStatus(childId);
    if (result.success) {
      return result;
    }

    return {
      ...result,
      message:
        result.statusCode === 404
          ? "孩子尚未创建宠物，暂时无法查看宠物状态。"
          : normalizeParentMessage(result) ?? result.message ?? "孩子状态加载失败。",
    };
  }

  async getWeeklyReport(): Promise<ApiResponse<WeeklyReportPayload>> {
    const childId = appState.getLinkedChildId();
    if (!childId) {
      return {
        success: false,
        message: "当前家长账号尚未绑定孩子。",
      };
    }
    const result = await apiClient.getWeeklyReport(childId);
    if (result.success) {
      return result;
    }

    return {
      ...result,
      message:
        result.statusCode === 404
          ? "当前孩子暂未生成周报。"
          : normalizeParentMessage(result) ?? result.message ?? "周报加载失败。",
    };
  }
}

export const parentService = new ParentService();
