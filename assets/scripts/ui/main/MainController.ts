import { _decorator, Button, Color, EditBox, Node, UITransform } from "cc";
import { appState } from "../../app/AppState";
import {
  HOMEWORK_SUBJECT_LABELS,
  HOMEWORK_SUBJECTS,
  type DashboardTab,
  type HomeworkSubject,
} from "../../domain/models/app";
import { sceneRouter } from "../../navigation/SceneRouter";
import { STORAGE_KEYS, storage } from "../../core/storage";
import { authService } from "../../services/AuthService";
import { homeworkService } from "../../services/HomeworkService";
import { parentService } from "../../services/ParentService";
import { petService } from "../../services/PetService";
import {
  formatHomeworkHistory,
  formatParentOverview,
  formatPetSummary,
  formatWeeklyReportSummary,
} from "../../utils/format";
import { ScreenController } from "../common/base/ScreenController";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import type { ChildPetPayload, WeeklyReportPayload } from "../../types/api";

const { ccclass } = _decorator;

@ccclass("MainController")
export class MainController extends ScreenController {
  private activeTab: DashboardTab = "overview";
  private selectedSubject: HomeworkSubject = "chinese";
  private pageMessage = "";
  private homeworkInput: EditBox | null = null;
  private bindChildInput: EditBox | null = null;
  private homeworkDrafts: Record<HomeworkSubject, string> = {
    chinese: "",
    math: "",
    english: "",
  };
  private bindChildDraft = "";
  private parentOverview: ChildPetPayload | null = null;
  private parentWeeklyReport: WeeklyReportPayload | null = null;
  private parentOverviewError = "";
  private parentWeeklyError = "";

  onLoad(): void {
    const savedTab = storage.get(STORAGE_KEYS.activeTab);
    if (savedTab === "overview" || savedTab === "homework") {
      this.activeTab = savedTab;
    }
  }

  async start(): Promise<void> {
    await this.bootstrapAndRender();
  }

  private async bootstrapAndRender(): Promise<void> {
    const user = appState.getCurrentUser() ?? (await authService.bootstrapSession());
    if (!user) {
      sceneRouter.goToLogin();
      return;
    }

    if (user.role === "CHILD") {
      const petId = appState.getPetId();
      if (petId) {
        appState.setPetId(petId);
        await petService.refreshCurrentPet();
      }
      await homeworkService.refreshHistory();
      await homeworkService.refreshTodayStatus();
    } else {
      await this.loadParentDashboardData();
    }

    await this.render();
  }

  private async render(): Promise<void> {
    this.persistHomeworkDraft();
    this.bindChildDraft = this.bindChildInput?.string ?? this.bindChildDraft;

    const root = this.ensureManagedRoot("MainRoot");
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(1280, 720);
    RuntimeUI.clear(root);

    RuntimeUI.createBox(root, {
      name: "Backdrop",
      x: 0,
      y: 0,
      width: 1220,
      height: 680,
      color: new Color(16, 21, 31, 255),
    });

    const user = appState.getCurrentUser();
    if (!user) {
      sceneRouter.goToLogin();
      return;
    }

    RuntimeUI.createLabel(root, {
      name: "Title",
      text: `学伴精灵客户端 · ${user.role === "PARENT" ? "家长端" : "学生端"}`,
      x: 0,
      y: 300,
      width: 940,
      height: 48,
      fontSize: 30,
    });

    RuntimeUI.createLabel(root, {
      name: "Subtitle",
      text: `当前账号：${user.username}`,
      x: -350,
      y: 258,
      width: 360,
      height: 32,
      fontSize: 18,
      color: new Color(171, 183, 200, 255),
    });

    const refreshAction = RuntimeUI.createButton(root, {
      name: "RefreshAction",
      text: "刷新",
      x: 420,
      y: 258,
      width: 110,
      height: 44,
      color: new Color(60, 122, 255, 255),
      fontSize: 18,
    });
    refreshAction.button.node.on(
      Button.EventType.CLICK,
      () => void this.handleRefresh(),
      this
    );

    const logoutAction = RuntimeUI.createButton(root, {
      name: "LogoutAction",
      text: "退出登录",
      x: 545,
      y: 258,
      width: 130,
      height: 44,
      color: new Color(204, 88, 88, 255),
      fontSize: 18,
    });
    logoutAction.button.node.on(
      Button.EventType.CLICK,
      () => this.handleLogout(),
      this
    );

    if (this.pageMessage) {
      RuntimeUI.createLabel(root, {
        name: "PageMessage",
        text: this.pageMessage,
        x: 0,
        y: -280,
        width: 980,
        height: 48,
        fontSize: 18,
        color: new Color(255, 210, 120, 255),
      });
    }

    if (user.role === "PARENT") {
      await this.renderParentDashboard(root);
      return;
    }

    this.renderChildTabs(root);
    if (this.activeTab === "homework") {
      await this.renderHomeworkTab(root);
    } else {
      await this.renderChildOverview(root);
    }
  }

  private renderChildTabs(root: Node): void {
    const overviewButton = RuntimeUI.createButton(root, {
      name: "OverviewTab",
      text: "宠物总览",
      x: -420,
      y: 205,
      width: 160,
      height: 44,
      color:
        this.activeTab === "overview"
          ? new Color(76, 128, 255, 255)
          : new Color(52, 61, 82, 255),
      fontSize: 18,
    });
    overviewButton.button.node.on(
      Button.EventType.CLICK,
      () => {
        this.activeTab = "overview";
        storage.set(STORAGE_KEYS.activeTab, this.activeTab);
        void this.render();
      },
      this
    );

    const homeworkButton = RuntimeUI.createButton(root, {
      name: "HomeworkTab",
      text: "作业中心",
      x: -240,
      y: 205,
      width: 160,
      height: 44,
      color:
        this.activeTab === "homework"
          ? new Color(76, 128, 255, 255)
          : new Color(52, 61, 82, 255),
      fontSize: 18,
    });
    homeworkButton.button.node.on(
      Button.EventType.CLICK,
      () => {
        this.activeTab = "homework";
        storage.set(STORAGE_KEYS.activeTab, this.activeTab);
        void this.render();
      },
      this
    );
  }

  private async renderChildOverview(root: Node): Promise<void> {
    const petCard = RuntimeUI.createBox(root, {
      name: "PetCard",
      x: -250,
      y: -10,
      width: 470,
      height: 420,
      color: new Color(28, 35, 48, 255),
    });
    const sideCard = RuntimeUI.createBox(root, {
      name: "SideCard",
      x: 280,
      y: -10,
      width: 520,
      height: 420,
      color: new Color(28, 35, 48, 255),
    });

    RuntimeUI.createLabel(petCard, {
      name: "PetCardTitle",
      text: "宠物核心状态",
      x: 0,
      y: 170,
      width: 380,
      height: 36,
      fontSize: 24,
    });

    const pet = appState.getCurrentPet();
    const knownPetId = appState.getPetId();
    const petSummary = formatPetSummary(pet).join("\n");
    RuntimeUI.createLabel(petCard, {
      name: "PetSummary",
      text: petSummary,
      x: 0,
      y: 48,
      width: 380,
      height: 220,
      fontSize: 20,
      color: new Color(221, 229, 238, 255),
    });

    if (!pet && !knownPetId) {
      const createButton = RuntimeUI.createButton(petCard, {
        name: "CreatePetButton",
        text: "创建默认宠物",
        x: 0,
        y: -138,
        width: 240,
        height: 56,
        color: new Color(49, 180, 113, 255),
      });
      createButton.button.node.on(
        Button.EventType.CLICK,
        () => void this.handleCreatePet(),
        this
      );
    } else if (!pet && knownPetId) {
      RuntimeUI.createLabel(petCard, {
        name: "PetSyncHint",
        text: "已检测到宠物关联，正在等待刷新宠物状态",
        x: 0,
        y: -120,
        width: 320,
        height: 60,
        fontSize: 18,
        color: new Color(255, 194, 107, 255),
      });
    } else {
      const feedButton = RuntimeUI.createButton(petCard, {
        name: "FeedPetButton",
        text: "喂养宠物",
        x: -90,
        y: -138,
        width: 160,
        height: 56,
        color: new Color(255, 158, 76, 255),
      });
      feedButton.button.node.on(
        Button.EventType.CLICK,
        () => void this.handleFeedPet(),
        this
      );

      const homeworkButton = RuntimeUI.createButton(petCard, {
        name: "OpenHomeworkButton",
        text: "去做作业",
        x: 95,
        y: -138,
        width: 160,
        height: 56,
        color: new Color(76, 128, 255, 255),
      });
      homeworkButton.button.node.on(
        Button.EventType.CLICK,
        () => {
          this.activeTab = "homework";
          storage.set(STORAGE_KEYS.activeTab, this.activeTab);
          void this.render();
        },
        this
      );
    }

    RuntimeUI.createLabel(sideCard, {
      name: "SideCardTitle",
      text: "今日作业与近期记录",
      x: 0,
      y: 170,
      width: 420,
      height: 36,
      fontSize: 24,
    });

    const today = appState.getTodayHomeworkStatus();
    const todaySummary = [
      `语文：${today?.chinese?.submitted ? `已提交(${today.chinese.score ?? "-"})` : "未提交"}`,
      `数学：${today?.math?.submitted ? `已提交(${today.math.score ?? "-"})` : "未提交"}`,
      `英语：${today?.english?.submitted ? `已提交(${today.english.score ?? "-"})` : "未提交"}`,
    ].join("\n");
    RuntimeUI.createLabel(sideCard, {
      name: "TodaySummary",
      text: todaySummary,
      x: 0,
      y: 90,
      width: 420,
      height: 110,
      fontSize: 20,
      color: new Color(210, 219, 230, 255),
    });

    RuntimeUI.createLabel(sideCard, {
      name: "HistoryTitle",
      text: "最近 5 条作业",
      x: 0,
      y: -5,
      width: 420,
      height: 30,
      fontSize: 22,
    });

    RuntimeUI.createLabel(sideCard, {
      name: "HistorySummary",
      text: formatHomeworkHistory(appState.getHomeworkHistory(), { limit: 5 }),
      x: 0,
      y: -120,
      width: 430,
      height: 220,
      fontSize: 18,
      color: new Color(171, 183, 200, 255),
    });
  }

  private async renderHomeworkTab(root: Node): Promise<void> {
    const workCard = RuntimeUI.createBox(root, {
      name: "HomeworkCard",
      x: -220,
      y: -10,
      width: 540,
      height: 420,
      color: new Color(28, 35, 48, 255),
    });

    const historyCard = RuntimeUI.createBox(root, {
      name: "HomeworkHistoryCard",
      x: 320,
      y: -10,
      width: 450,
      height: 420,
      color: new Color(28, 35, 48, 255),
    });

    RuntimeUI.createLabel(workCard, {
      name: "HomeworkTitle",
      text: "提交作业",
      x: 0,
      y: 170,
      width: 420,
      height: 36,
      fontSize: 24,
    });

    HOMEWORK_SUBJECTS.forEach((subject, index) => {
      const button = RuntimeUI.createButton(workCard, {
        name: `${subject}Button`,
        text: HOMEWORK_SUBJECT_LABELS[subject],
        x: -145 + index * 145,
        y: 115,
        width: 120,
        height: 44,
        color:
          this.selectedSubject === subject
            ? new Color(76, 128, 255, 255)
            : new Color(52, 61, 82, 255),
        fontSize: 18,
      });

      button.button.node.on(
        Button.EventType.CLICK,
        () => {
          this.persistHomeworkDraft();
          this.selectedSubject = subject;
          void this.render();
        },
        this
      );
    });

    this.homeworkInput = RuntimeUI.createEditBox(workCard, {
      name: "HomeworkInput",
      placeholder: "输入本次作业内容或备注，例如：今天完成了数学口算 2 页",
      x: 0,
      y: 10,
      width: 460,
      height: 150,
      defaultValue: this.homeworkDrafts[this.selectedSubject],
      maxLength: 200,
    }).editBox;

    const submitButton = RuntimeUI.createButton(workCard, {
      name: "SubmitHomeworkButton",
      text: "提交作业",
      x: -90,
      y: -130,
      width: 160,
      height: 52,
      color: new Color(49, 180, 113, 255),
      fontSize: 18,
    });
    submitButton.button.node.on(
      Button.EventType.CLICK,
      () => void this.handleSubmitHomework(),
      this
    );

    const backButton = RuntimeUI.createButton(workCard, {
      name: "BackOverviewButton",
      text: "返回总览",
      x: 95,
      y: -130,
      width: 160,
      height: 52,
      color: new Color(93, 102, 122, 255),
      fontSize: 18,
    });
    backButton.button.node.on(
      Button.EventType.CLICK,
      () => {
        this.persistHomeworkDraft();
        this.activeTab = "overview";
        storage.set(STORAGE_KEYS.activeTab, this.activeTab);
        void this.render();
      },
      this
    );

    const submitted = homeworkService.isSubmittedToday(this.selectedSubject);
    RuntimeUI.createLabel(workCard, {
      name: "HomeworkHint",
      text: submitted
        ? `今日${HOMEWORK_SUBJECT_LABELS[this.selectedSubject]}已提交，再次提交可能会被后端拦截`
        : `当前选择：${HOMEWORK_SUBJECT_LABELS[this.selectedSubject]}`,
      x: 0,
      y: -70,
      width: 430,
      height: 36,
      fontSize: 17,
      color: submitted
        ? new Color(255, 194, 107, 255)
        : new Color(171, 183, 200, 255),
    });

    RuntimeUI.createLabel(historyCard, {
      name: "HistoryCardTitle",
      text: "作业历史",
      x: 0,
      y: 170,
      width: 320,
      height: 36,
      fontSize: 24,
    });
    RuntimeUI.createLabel(historyCard, {
      name: "HistoryCardContent",
      text: formatHomeworkHistory(appState.getHomeworkHistory()),
      x: 0,
      y: 0,
      width: 380,
      height: 300,
      fontSize: 18,
      color: new Color(210, 219, 230, 255),
    });
  }

  private async renderParentDashboard(root: Node): Promise<void> {
    const bindCard = RuntimeUI.createBox(root, {
      name: "ParentBindCard",
      x: -310,
      y: -5,
      width: 400,
      height: 400,
      color: new Color(28, 35, 48, 255),
    });
    const statusCard = RuntimeUI.createBox(root, {
      name: "ParentStatusCard",
      x: 250,
      y: 105,
      width: 530,
      height: 250,
      color: new Color(28, 35, 48, 255),
    });
    const reportCard = RuntimeUI.createBox(root, {
      name: "ParentReportCard",
      x: 250,
      y: -150,
      width: 530,
      height: 200,
      color: new Color(28, 35, 48, 255),
    });

    RuntimeUI.createLabel(bindCard, {
      name: "BindCardTitle",
      text: "家长绑定与孩子状态",
      x: 0,
      y: 155,
      width: 320,
      height: 36,
      fontSize: 22,
    });

    this.bindChildInput = RuntimeUI.createEditBox(bindCard, {
      name: "ChildBindInput",
      placeholder: "输入 child_id 或孩子账号",
      x: 0,
      y: 90,
      width: 320,
      height: 60,
      defaultValue: this.bindChildDraft,
      maxLength: 64,
    }).editBox;

    const bindButton = RuntimeUI.createButton(bindCard, {
      name: "BindChildButton",
      text: "绑定孩子",
      x: 0,
      y: 25,
      width: 180,
      height: 50,
      color: new Color(49, 180, 113, 255),
      fontSize: 18,
    });
    bindButton.button.node.on(
      Button.EventType.CLICK,
      () => void this.handleBindChild(),
      this
    );

    const childId = appState.getLinkedChildId();
    const childDisplayName =
      this.parentOverview?.childNickname ??
      appState.getCurrentUser()?.childNickname ??
      null;
    RuntimeUI.createLabel(bindCard, {
      name: "ChildIdLabel",
      text: childId
        ? childDisplayName
          ? `当前已绑定孩子：${childDisplayName}`
          : "当前已绑定孩子"
        : "当前尚未绑定孩子",
      x: 0,
      y: -35,
      width: 300,
      height: 90,
      fontSize: 16,
      color: new Color(171, 183, 200, 255),
      horizontalAlign: 0,
      verticalAlign: 1,
    });

    const overviewText = this.parentOverview
      ? formatParentOverview(this.parentOverview)
      : this.parentOverviewError || "等待绑定后获取孩子状态";

    RuntimeUI.createLabel(statusCard, {
      name: "StatusCardTitle",
      text: "孩子状态与今日作业",
      x: 0,
      y: 95,
      width: 360,
      height: 36,
      fontSize: 22,
    });

    RuntimeUI.createScrollText(statusCard, {
      name: "ParentOverview",
      text: overviewText,
      x: 0,
      y: -8,
      width: 460,
      height: 185,
      fontSize: 15,
      color: new Color(219, 226, 236, 255),
      backgroundColor: new Color(23, 29, 40, 255),
      padding: 16,
    });

    RuntimeUI.createLabel(reportCard, {
      name: "WeeklyTitle",
      text: "本周周报",
      x: 0,
      y: 78,
      width: 360,
      height: 30,
      fontSize: 22,
    });

    const weeklyText = this.parentWeeklyReport
      ? formatWeeklyReportSummary(this.parentWeeklyReport)
      : this.parentWeeklyError || "周报接口尚未完成";

    RuntimeUI.createScrollText(reportCard, {
      name: "WeeklySummary",
      text: weeklyText,
      x: 0,
      y: -12,
      width: 460,
      height: 135,
      fontSize: 14,
      color: new Color(171, 183, 200, 255),
      backgroundColor: new Color(23, 29, 40, 255),
      padding: 16,
    });
  }

  private async handleRefresh(): Promise<void> {
    this.pageMessage = "正在刷新最新数据...";
    await this.render();

    const result = await this.refreshDashboardData();
    if (!result.sessionReady) {
      return;
    }

    if (result.failedTasks.length === 0 && result.pendingTasks.length === 0) {
      this.pageMessage = "最新数据已刷新";
    } else if (
      result.failedTasks.length === 0 &&
      result.pendingTasks.length === 1 &&
      result.pendingTasks[0] === "未检测到宠物映射"
    ) {
      this.pageMessage = "未检测到宠物映射，请先创建宠物";
    } else if (
      result.failedTasks.length === 0 &&
      result.pendingTasks.length === 1 &&
      result.pendingTasks[0] === "当前尚未绑定孩子"
    ) {
      this.pageMessage = "当前尚未绑定孩子，请先绑定后再刷新";
    } else if (result.successTasks.length === 0) {
      const blockers = [...result.failedTasks, ...result.pendingTasks];
      this.pageMessage = `刷新失败：${blockers.join("、")}`;
    } else {
      const issues = [...result.failedTasks, ...result.pendingTasks];
      this.pageMessage = `部分刷新成功，待处理项：${issues.join("、")}`;
    }
    await this.render();
  }

  private handleLogout(): void {
    authService.logout();
    sceneRouter.goToLogin();
  }

  private async handleCreatePet(): Promise<void> {
    const result = await petService.createPet();
    this.pageMessage = result.success
      ? "宠物已创建，可以开始互动与做作业了"
      : result.message ?? "宠物创建失败";

    if (!result.success && appState.getPetId()) {
      await petService.refreshCurrentPet();
    }

    await this.render();
  }

  private async handleFeedPet(): Promise<void> {
    const result = await petService.feedCurrentPet();
    this.pageMessage = result.success
      ? "喂养完成，宠物状态已刷新"
      : result.message ?? "喂养失败";
    await this.render();
  }

  private async handleSubmitHomework(): Promise<void> {
    const content = this.homeworkInput?.string.trim() ?? "";
    this.homeworkDrafts[this.selectedSubject] = content;
    if (!content) {
      this.pageMessage = "请先输入作业内容";
      await this.render();
      return;
    }

    const result = await homeworkService.submit({
      subject: this.selectedSubject,
      content,
    });

    this.pageMessage = result.success
      ? "作业提交成功，已尝试刷新记录"
      : result.message ?? "作业提交失败";
    if (result.success) {
      this.homeworkDrafts[this.selectedSubject] = "";
    }

    if (appState.getPetId()) {
      await petService.refreshCurrentPet();
    }
    await this.render();
  }

  private async handleBindChild(): Promise<void> {
    const identifier = this.bindChildInput?.string.trim() ?? "";
    this.bindChildDraft = identifier;
    if (!identifier) {
      this.pageMessage = "请输入孩子标识后再绑定";
      await this.render();
      return;
    }

    const result = await parentService.bindChild(identifier);
    this.pageMessage = result.success
      ? "绑定成功，已加载孩子状态"
      : result.message ?? "绑定失败";
    if (result.success) {
      this.bindChildDraft = "";
      await this.loadParentDashboardData();
    }
    await this.render();
  }

  private persistHomeworkDraft(): void {
    if (this.homeworkInput) {
      this.homeworkDrafts[this.selectedSubject] = this.homeworkInput.string;
    }
  }

  private async refreshDashboardData(): Promise<{
    sessionReady: boolean;
    successTasks: string[];
    failedTasks: string[];
    pendingTasks: string[];
  }> {
    const user = appState.getCurrentUser() ?? (await authService.bootstrapSession());
    if (!user) {
      sceneRouter.goToLogin();
      return {
        sessionReady: false,
        successTasks: [],
        failedTasks: ["登录态恢复"],
        pendingTasks: [],
      };
    }

    const successTasks: string[] = [];
    const failedTasks: string[] = [];
    const pendingTasks: string[] = [];

    if (user.role === "CHILD") {
      const petId = appState.getPetId();
      if (petId) {
        const petResult = await petService.refreshCurrentPet();
        if (petResult.success) {
          successTasks.push("宠物状态");
        } else {
          failedTasks.push("宠物状态");
        }
      } else if (!appState.getCurrentPet()) {
        pendingTasks.push("未检测到宠物映射");
      }

      const historyResult = await homeworkService.refreshHistory();
      if (historyResult.success) {
        successTasks.push("作业历史");
      } else {
        failedTasks.push("作业历史");
      }

      const statusResult = await homeworkService.refreshTodayStatus();
      if (statusResult.success) {
        successTasks.push("今日状态");
      } else {
        failedTasks.push("今日状态");
      }
    } else {
      const linkedChildId = appState.getLinkedChildId();
      if (!linkedChildId) {
        appState.patchCurrentUser({
          childNickname: null,
        });
        this.parentOverview = null;
        this.parentWeeklyReport = null;
        this.parentOverviewError = "当前尚未绑定孩子";
        this.parentWeeklyError = "请先绑定孩子后查看周报";
        pendingTasks.push("当前尚未绑定孩子");
        return {
          sessionReady: true,
          successTasks,
          failedTasks,
          pendingTasks,
        };
      }

      const overviewResult = await parentService.getChildOverview();
      if (overviewResult.success && overviewResult.data) {
        this.parentOverview = overviewResult.data;
        this.parentOverviewError = "";
        if (overviewResult.data.childNickname) {
          appState.patchCurrentUser({
            childNickname: overviewResult.data.childNickname,
          });
        }
        successTasks.push("孩子状态");
      } else {
        this.parentOverview = null;
        this.parentOverviewError = overviewResult.message ?? "孩子状态加载失败";
        failedTasks.push("孩子状态");
      }

      const weeklyResult = await parentService.getWeeklyReport();
      if (weeklyResult.success && weeklyResult.data) {
        this.parentWeeklyReport = weeklyResult.data;
        this.parentWeeklyError = "";
        successTasks.push("周报");
      } else {
        this.parentWeeklyReport = null;
        this.parentWeeklyError = weeklyResult.message ?? "周报加载失败";
        failedTasks.push("周报");
      }
    }

    return {
      sessionReady: true,
      successTasks,
      failedTasks,
      pendingTasks,
    };
  }

  private async loadParentDashboardData(): Promise<void> {
    const linkedChildId = appState.getLinkedChildId();
    if (!linkedChildId) {
      appState.patchCurrentUser({
        childNickname: null,
      });
      this.parentOverview = null;
      this.parentWeeklyReport = null;
      this.parentOverviewError = "当前尚未绑定孩子";
      this.parentWeeklyError = "请先绑定孩子后查看周报";
      return;
    }

    const overviewResult = await parentService.getChildOverview();
    if (overviewResult.success && overviewResult.data) {
      this.parentOverview = overviewResult.data;
      this.parentOverviewError = "";
      if (overviewResult.data.childNickname) {
        appState.patchCurrentUser({
          childNickname: overviewResult.data.childNickname,
        });
      }
    } else {
      this.parentOverview = null;
      this.parentOverviewError = overviewResult.message ?? "等待绑定后获取孩子状态";
    }

    const weeklyResult = await parentService.getWeeklyReport();
    if (weeklyResult.success && weeklyResult.data) {
      this.parentWeeklyReport = weeklyResult.data;
      this.parentWeeklyError = "";
    } else {
      this.parentWeeklyReport = null;
      this.parentWeeklyError = weeklyResult.message ?? "周报接口尚未完成";
    }
  }
}
