import { appState } from "../app/AppState";
import type { HomeworkSubject } from "../domain/models/app";
import { apiClient } from "../network/ApiClient";
import type {
  ApiResponse,
  HomeworkHistoryPayload,
  HomeworkTodayStatus,
  HomeworkSubmitPayload,
} from "../types/api";

class HomeworkService {
  async submit(input: HomeworkSubmitPayload): Promise<ApiResponse<{ expReward: number }>> {
    const result = await apiClient.submitHomework(input);
    if (result.success) {
      await this.refreshHistory();
      await this.refreshTodayStatus();
    }
    return result;
  }

  async refreshHistory(
    page = 1,
    limit = 10
  ): Promise<ApiResponse<HomeworkHistoryPayload>> {
    const result = await apiClient.getHomeworkHistory(page, limit);
    if (result.success && result.data) {
      appState.setHomeworkHistory(result.data);
    }
    return result;
  }

  async refreshTodayStatus(): Promise<ApiResponse<HomeworkTodayStatus>> {
    const result = await apiClient.getHomeworkStatus();
    if (result.success && result.data) {
      appState.setTodayHomeworkStatus(result.data);
    }
    return result;
  }

  isSubmittedToday(subject: HomeworkSubject): boolean {
    const status = appState.getTodayHomeworkStatus();
    return Boolean(status?.[subject]?.submitted);
  }
}

export const homeworkService = new HomeworkService();
