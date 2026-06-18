import { appState } from "../../app/AppState";
import { devActionLogger } from "../../core/DevActionLogger";
import {
  HOMEWORK_SUBJECT_LABELS as BASE_HOMEWORK_SUBJECT_LABELS,
  HOMEWORK_SUBJECTS as BASE_HOMEWORK_SUBJECTS,
} from "../../domain/models/app";
import {
  homeworkService,
  type HomeworkSubmitServiceResponse,
} from "../../services/HomeworkService";
import type {
  HomeworkQualityLevel,
  HomeworkRewardItem,
  HomeworkRewardStatus,
  HomeworkSubject,
} from "../../types/api";

export const HOMEWORK_REWARD_SUBJECTS: HomeworkSubject[] = [
  ...BASE_HOMEWORK_SUBJECTS,
  "general",
];

export const HOMEWORK_REWARD_SUBJECT_LABELS: Record<HomeworkSubject, string> = {
  ...BASE_HOMEWORK_SUBJECT_LABELS,
  general: "综合",
};

export type HomeworkCenterHint = {
  message: string;
  isWarning: boolean;
};

export type HomeworkUploadedImage = {
  url: string;
  fileName: string;
};

export type HomeworkSubmitFeedback = {
  success: boolean;
  message: string;
  isWarning: boolean;
  rewardStatus?: HomeworkRewardStatus;
  qualityLevel?: HomeworkQualityLevel;
  rewardItems?: HomeworkRewardItem[];
  inventorySynced?: boolean;
  logsSynced?: boolean;
  shouldRefreshDashboard?: boolean;
};

export type HomeworkUploadFeedback = {
  success: boolean;
  message: string;
};

const EMPTY_NOTE_DRAFTS: Record<HomeworkSubject, string> = {
  chinese: "",
  math: "",
  english: "",
  general: "",
};

export class HomeworkCenterCoordinator {
  private selectedSubject: HomeworkSubject | null = null;
  private noteDrafts: Record<HomeworkSubject, string> = { ...EMPTY_NOTE_DRAFTS };
  private uploadedImages: Record<HomeworkSubject, HomeworkUploadedImage | null> = {
    chinese: null,
    math: null,
    english: null,
    general: null,
  };
  private uploading = false;
  private submitting = false;
  private uploadError: string | null = null;
  private submitError: string | null = null;
  private rewardFeedback: HomeworkSubmitFeedback | null = null;

  getSelectedSubject(): HomeworkSubject | null {
    return this.selectedSubject;
  }

  setSelectedSubject(subject: HomeworkSubject): void {
    this.selectedSubject = subject;
  }

  getCurrentDraft(): string {
    return this.selectedSubject ? this.noteDrafts[this.selectedSubject] : "";
  }

  syncCurrentDraft(value: string): void {
    if (!this.selectedSubject) {
      return;
    }
    this.noteDrafts[this.selectedSubject] = value;
  }

  getCurrentUploadedImage(): HomeworkUploadedImage | null {
    return this.selectedSubject ? this.uploadedImages[this.selectedSubject] : null;
  }

  isUploading(): boolean {
    return this.uploading;
  }

  isSubmitting(): boolean {
    return this.submitting;
  }

  getUploadError(): string | null {
    return this.uploadError;
  }

  getSubmitError(): string | null {
    return this.submitError;
  }

  getRewardFeedback(): HomeworkSubmitFeedback | null {
    return this.rewardFeedback;
  }

  clearUploadedImage(): void {
    if (!this.selectedSubject) {
      return;
    }
    this.uploadedImages[this.selectedSubject] = null;
    this.uploadError = null;
    this.rewardFeedback = null;
  }

  resetForContinue(): void {
    if (this.selectedSubject) {
      this.noteDrafts[this.selectedSubject] = "";
      this.uploadedImages[this.selectedSubject] = null;
    }
    this.uploadError = null;
    this.submitError = null;
    this.rewardFeedback = null;
  }

  isCurrentSubjectSubmittedToday(): boolean {
    return this.selectedSubject
      ? homeworkService.isSubmittedToday(this.selectedSubject)
      : false;
  }

  getCurrentHint(): HomeworkCenterHint {
    if (!this.selectedSubject) {
      return {
        message: "先选择一个作业科目吧。",
        isWarning: true,
      };
    }

    const subjectLabel = HOMEWORK_REWARD_SUBJECT_LABELS[this.selectedSubject];
    if (this.isCurrentSubjectSubmittedToday()) {
      return {
        message: `今日${subjectLabel}已提交，再次提交可能会被后端拦截`,
        isWarning: true,
      };
    }

    return {
      message: `当前选择：${subjectLabel}`,
      isWarning: false,
    };
  }

  async uploadCurrentImage(file: File | Blob): Promise<HomeworkUploadFeedback> {
    if (this.uploading) {
      return {
        success: false,
        message: "图片还在上传中，请稍等一下。",
      };
    }
    if (!this.selectedSubject) {
      this.uploadError = "先选择一个作业科目吧。";
      return {
        success: false,
        message: this.uploadError,
      };
    }

    this.uploading = true;
    this.uploadError = null;
    this.submitError = null;
    this.rewardFeedback = null;

    try {
      const result = await homeworkService.uploadImage(file);
      const imageUrl = result.data?.url?.trim() || result.data?.imageUrl?.trim();
      if (result.success && imageUrl) {
        this.uploadedImages[this.selectedSubject] = {
          url: imageUrl,
          fileName: "name" in file && file.name ? file.name : "作业图片",
        };
        return {
          success: true,
          message: "图片已上传。",
        };
      }

      this.uploadedImages[this.selectedSubject] = null;
      this.uploadError = result.message ?? "图片上传失败，请重新选择。";
      return {
        success: false,
        message: this.uploadError,
      };
    } catch (error) {
      devActionLogger.warn(
        "homework.upload.unhandledError",
        error instanceof Error ? error.message : String(error)
      );
      this.uploadedImages[this.selectedSubject] = null;
      this.uploadError = "图片上传失败，请重新选择。";
      return {
        success: false,
        message: this.uploadError,
      };
    } finally {
      this.uploading = false;
    }
  }

  async submitCurrent(petId: string | null): Promise<HomeworkSubmitFeedback> {
    if (!this.selectedSubject) {
      return this.setSubmitFailure("先选择一个作业科目吧。");
    }
    if (this.uploading) {
      return this.setSubmitFailure("图片还在上传中，请稍等一下。");
    }
    if (this.submitting) {
      return this.setSubmitFailure("作业正在提交中，请稍等一下。");
    }
    if (!petId) {
      return this.setSubmitFailure("暂时还没有绑定宠物，先去宠物主页看看吧。");
    }

    const uploadedImage = this.getCurrentUploadedImage();
    if (!uploadedImage?.url) {
      return this.setSubmitFailure(
        this.uploadError ?? "先上传一张作业图片吧。"
      );
    }

    const note = this.getCurrentDraft().trim();
    this.noteDrafts[this.selectedSubject] = note;
    this.submitting = true;
    this.submitError = null;
    this.rewardFeedback = null;

    try {
      const result = await homeworkService.submit({
        subject: this.selectedSubject,
        content: note || "图片作业",
        imageUrl: uploadedImage.url,
        imageUrls: [uploadedImage.url],
        note: note || undefined,
        petId,
      });
      const feedback = this.createSubmitFeedback(result);
      this.rewardFeedback = feedback;
      this.submitError = feedback.success ? null : feedback.message;
      return feedback;
    } catch {
      return this.setSubmitFailure("作业提交失败，请稍后再试。");
    } finally {
      this.submitting = false;
    }
  }

  private createSubmitFeedback(
    result: HomeworkSubmitServiceResponse
  ): HomeworkSubmitFeedback {
    if (!result.success) {
      return {
        success: false,
        message: this.resolveFailureMessage(result.code, result.message),
        isWarning: true,
        inventorySynced: result.inventorySynced,
        logsSynced: result.logsSynced,
        shouldRefreshDashboard: result.shouldRefreshDashboard,
      };
    }

    const payload = result.data;
    const rewardStatus = payload?.submission?.rewardStatus ?? this.resolveLegacyRewardStatus(result);
    const qualityLevel = payload?.submission?.qualityLevel;
    const rewardItems = payload?.reward?.items ?? [];
    const message = this.resolveRewardMessage(rewardStatus, payload?.reward?.message, rewardItems);
    const isWarning = rewardStatus !== "granted";

    return {
      success: true,
      message,
      isWarning,
      rewardStatus,
      qualityLevel,
      rewardItems,
      inventorySynced: result.inventorySynced,
      logsSynced: result.logsSynced,
      shouldRefreshDashboard: result.shouldRefreshDashboard,
    };
  }

  private setSubmitFailure(message: string): HomeworkSubmitFeedback {
    const feedback: HomeworkSubmitFeedback = {
      success: false,
      message,
      isWarning: true,
    };
    this.submitError = message;
    this.rewardFeedback = feedback;
    return feedback;
  }

  private resolveLegacyRewardStatus(
    result: HomeworkSubmitServiceResponse
  ): HomeworkRewardStatus {
    if (result.data?.food_reward || result.data?.reward?.items?.length) {
      return "granted";
    }
    return "none";
  }

  private resolveRewardMessage(
    rewardStatus: HomeworkRewardStatus,
    backendMessage: string | undefined,
    rewardItems: HomeworkRewardItem[]
  ): string {
    if (rewardStatus === "granted") {
      const item = rewardItems[0];
      if (item) {
        return `作业提交成功！获得 ${this.formatFoodName(item)} ×${Math.max(1, item.count)}。`;
      }
      return backendMessage ?? "作业提交成功！奖励已发放。";
    }
    if (rewardStatus === "capped") {
      return "作业已保存，今天的奖励次数已用完，明天再来领取新的口粮吧。";
    }
    if (rewardStatus === "rejected") {
      return "这次还没有识别到有效作业内容，可以补充图片后再提交。";
    }
    return "作业已保存，本次暂无奖励。";
  }

  private resolveFailureMessage(code: string | undefined, message: string | undefined): string {
    switch (code) {
      case "INVALID_SUBJECT":
        return "先选择一个作业科目吧。";
      case "UPLOAD_REQUIRED":
      case "EMPTY_CONTENT":
        return "先上传一张作业图片吧。";
      case "UPLOAD_FAILED":
        return "图片上传失败，请重新选择。";
      case "PET_NOT_FOUND":
      case "INVENTORY_NOT_FOUND":
        return "暂时还没有绑定宠物，先去宠物主页看看吧。";
      case "DAILY_REWARD_LIMIT_REACHED":
        return "作业已保存，今天的奖励次数已用完，明天再来领取新的口粮吧。";
      case "DUPLICATE_SUBMISSION":
        return "这次作业已经提交过啦，可以换个任务再试。";
      default:
        return message ?? "作业提交失败，请稍后再试。";
    }
  }

  private formatFoodName(item: HomeworkRewardItem): string {
    const names: Record<string, string> = {
      expression_fruit: "表达果实",
      logic_cookie: "逻辑饼干",
      star_milk: "星星牛奶",
      meal_box: "营养便当",
      xp: "成长口粮",
      energy: "体力口粮",
    };
    return names[item.food_type] ?? item.food_type;
  }
}
