import { appState } from "../app/AppState";
import { devActionLogger } from "../core/DevActionLogger";
import { apiClient } from "../network/ApiClient";
import { homeworkImageUploadService } from "./HomeworkImageUploadService";
import type { PickedHomeworkImage } from "./HomeworkImagePickerService";
import { petService } from "./PetService";
import type {
  ApiResponse,
  HomeworkHistoryPayload,
  HomeworkRewardStatus,
  HomeworkSubject,
  HomeworkTodayStatus,
  HomeworkSubmitResultPayload,
  HomeworkSubmitPayload,
  HomeworkUploadResult,
} from "../types/api";

export type HomeworkSubmitServiceResponse = ApiResponse<HomeworkSubmitResultPayload> & {
  inventorySynced?: boolean;
  logsSynced?: boolean;
  shouldRefreshDashboard?: boolean;
};

class HomeworkService {
  async uploadImage(image: PickedHomeworkImage): Promise<ApiResponse<HomeworkUploadResult>> {
    devActionLogger.info("homework.upload.request", {
      source: image.source,
      size: image.size,
      type: image.mimeType,
    });
    return homeworkImageUploadService.upload(image);
  }

  async submit(input: HomeworkSubmitPayload): Promise<HomeworkSubmitServiceResponse> {
    devActionLogger.info("homework.submit.request", {
      petId: input.petId,
      subject: input.subject,
      hasImage: Boolean(input.imageUrl),
    });
    const result = await apiClient.submitHomework(input);
    let inventorySynced = false;
    let logsSynced = false;
    let shouldRefreshDashboard = false;

    if (result.success && result.data) {
      this.normalizeSubmitPayload(result.data);
      const rewardStatus = this.resolveRewardStatus(result.data);
      devActionLogger.info("homework.submit.apply", {
        rewardStatus,
        hasRewardItems: Boolean(result.data.reward?.items?.length),
        hasLogs: Array.isArray(result.data.logs),
      });
      const hasGrantedRewardItems =
        rewardStatus === "granted" && Boolean(result.data.reward?.items?.length);
      const inventory = petService.normalizeFoodInventoryPayload(result.data);
      const shouldApplyInventory =
        inventory !== null && !(hasGrantedRewardItems && inventory.length === 0);
      if (shouldApplyInventory) {
        appState.setPetFoodInventory(inventory);
        inventorySynced = true;
        devActionLogger.info("homework.submit.inventorySynced", {
          count: inventory.length,
        });
      }

      if (Array.isArray(result.data.logs)) {
        appState.setMainEvents(result.data.logs);
        logsSynced = true;
        devActionLogger.info("homework.submit.logsSynced", {
          count: result.data.logs.length,
        });
      }

      shouldRefreshDashboard = rewardStatus === "granted" && !inventorySynced;
    } else {
      devActionLogger.warn("homework.submit.failure", {
        statusCode: result.statusCode,
        message: result.message,
      });
    }

    return {
      ...result,
      inventorySynced,
      logsSynced,
      shouldRefreshDashboard,
    };
  }

  async refreshHistory(
    page = 1,
    limit = 10,
    canCommit?: () => boolean
  ): Promise<ApiResponse<HomeworkHistoryPayload>> {
    devActionLogger.info("homework.history.request", { page, limit });
    const result = await apiClient.getHomeworkHistory(page, limit);
    if (result.success && result.data && (!canCommit || canCommit())) {
      appState.setHomeworkHistory(this.normalizeHomeworkHistory(result.data));
      devActionLogger.info("homework.history.apply", {
        count: result.data.list.length,
        statusCode: result.statusCode,
      });
    }
    return result;
  }

  async refreshTodayStatus(
    canCommit?: () => boolean
  ): Promise<ApiResponse<HomeworkTodayStatus>> {
    devActionLogger.info("homework.status.request");
    const result = await apiClient.getHomeworkStatus();
    if (result.success && result.data && (!canCommit || canCommit())) {
      appState.setTodayHomeworkStatus(this.normalizeTodayStatus(result.data));
      devActionLogger.info("homework.status.apply", {
        statusCode: result.statusCode,
      });
    }
    return result;
  }

  async resetTodayForDev(petId?: string | null): Promise<ApiResponse<{ message?: string }>> {
    devActionLogger.info("homework.devReset.request", { petId });
    const result = await apiClient.resetTodayHomeworkForDev(petId);
    if (result.success) {
      appState.setHomeworkHistory(null);
      appState.setTodayHomeworkStatus(null);
      devActionLogger.info("homework.devReset.apply");
    }
    return result;
  }

  isSubmittedToday(subject: HomeworkSubject): boolean {
    const status = appState.getTodayHomeworkStatus();
    if (!status) {
      return false;
    }

    const normalizedSubject = this.normalizeHomeworkSubject(subject);
    return Boolean(status.subjects?.[normalizedSubject]?.submitted ?? status[normalizedSubject]?.submitted);
  }

  private normalizeHomeworkSubject(subject: string): HomeworkSubject {
    const normalized = subject.trim().toLowerCase();
    return normalized === "other" ? "general" : (normalized as HomeworkSubject);
  }

  private normalizeHomeworkHistory(history: HomeworkHistoryPayload): HomeworkHistoryPayload {
    return {
      ...history,
      list: history.list.map((item) => ({
        ...item,
        subject: this.normalizeHomeworkSubject(String(item.subject)),
      })),
    };
  }

  private normalizeTodayStatus(status: HomeworkTodayStatus): HomeworkTodayStatus {
    const raw = status as unknown as Record<string, { submitted: boolean; score?: number | null } | undefined>;
    const rawSubjects = status.subjects as unknown as Record<string, { submitted: boolean; score?: number | null; rewardAvailable?: boolean; reason?: string } | undefined> | undefined;
    const pickSubject = (key: HomeworkSubject): { submitted: boolean; score?: number | null; rewardAvailable?: boolean; reason?: string } | undefined => {
      const upperKey = key.toUpperCase();
      const legacyKey = key === "general" ? "other" : key;
      const legacyUpperKey = legacyKey.toUpperCase();
      return (
        rawSubjects?.[key] ??
        rawSubjects?.[upperKey] ??
        rawSubjects?.[legacyKey] ??
        rawSubjects?.[legacyUpperKey] ??
        raw[key] ??
        raw[upperKey] ??
        raw[legacyKey] ??
        raw[legacyUpperKey]
      );
    };

    const chinese = pickSubject("chinese") ?? { submitted: false };
    const math = pickSubject("math") ?? { submitted: false };
    const english = pickSubject("english") ?? { submitted: false };
    const general = pickSubject("general");
    const normalized: HomeworkTodayStatus = {
      ...(status.dailyReward ? { dailyReward: status.dailyReward } : {}),
      subjects: {
        chinese,
        math,
        english,
        ...(general ? { general } : {}),
      },
      chinese,
      math,
      english,
    };
    if (general) {
      normalized.general = general;
    }
    return normalized;
  }

  private normalizeSubmitPayload(payload: HomeworkSubmitResultPayload): void {
    if (payload.submission?.subject) {
      payload.submission.subject = this.normalizeHomeworkSubject(String(payload.submission.subject));
    }
  }

  private resolveRewardStatus(
    payload: HomeworkSubmitResultPayload
  ): HomeworkRewardStatus | undefined {
    return payload.submission?.rewardStatus;
  }
}

export const homeworkService = new HomeworkService();
