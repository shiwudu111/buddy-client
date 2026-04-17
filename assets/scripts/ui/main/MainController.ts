import { _decorator, Button, Color, EditBox, Node, UITransform } from "cc";
import { appState } from "../../app/AppState";
import { type DashboardTab, type HomeworkSubject } from "../../domain/models/app";
import { sceneRouter } from "../../navigation/SceneRouter";
import { STORAGE_KEYS, storage } from "../../core/storage";
import { authService } from "../../services/AuthService";
import { homeworkService } from "../../services/HomeworkService";
import { parentService } from "../../services/ParentService";
import { chatService } from "../../services/ChatService";
import { petService } from "../../services/PetService";
import {
  formatHomeworkHistory,
  formatParentOverview,
  formatPetSummary,
  formatWeeklyReportSummary,
} from "../../utils/format";
import { ScreenController } from "../common/base/ScreenController";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import { HomeworkCenterCoordinator } from "../homework/HomeworkCenterCoordinator";
import { renderHomeworkCenter } from "../homework/HomeworkCenterView";
import { ChatConversationCoordinator } from "../chat/ChatConversationCoordinator";
import { renderPetChatPanel } from "../chat/ChatConversationView";
import { PetCreationCoordinator } from "../pet/PetCreationCoordinator";
import { renderPetGrowthView } from "../pet/PetGrowthView";
import { renderPetCreationFlow } from "../pet/PetCreationView";
import type {
  ChildPetPayload,
  PetEvolutionPayload,
  WeeklyReportPayload,
} from "../../types/api";

// 文件整体作用：
// 这是学生端 / 家长端主界面的总控制器。
// 登录成功进入主界面后，大多数主页面内容都会从这里决定显示什么、刷新什么、切到哪一页。
const { ccclass } = _decorator;

@ccclass("MainController")
export class MainController extends ScreenController {
  private activeTab: DashboardTab = "overview";
  private pageMessage = "";
  private homeworkInput: EditBox | null = null;
  private homeworkInputSubject: HomeworkSubject | null = null;
  private chatInput: EditBox | null = null;
  private bindChildInput: EditBox | null = null;
  private petNameInput: EditBox | null = null;
  private readonly homeworkCoordinator = new HomeworkCenterCoordinator();
  private readonly chatCoordinator = new ChatConversationCoordinator();
  private readonly petCreationCoordinator = new PetCreationCoordinator();
  private homeworkSubmissionSessionId = 0;
  private activeHomeworkSubmissionSessionId = 0;
  private chatSubmissionSessionId = 0;
  private activeChatSubmissionSessionId = 0;
  private bootstrapSessionId = 0;
  private activeBootstrapSessionId = 0;
  private bindChildSessionId = 0;
  private activeBindChildSessionId = 0;
  private dashboardRefreshSessionId = 0;
  private activeDashboardRefreshSessionId = 0;
  private petGrowthRefreshSessionId = 0;
  private activePetGrowthRefreshSessionId = 0;
  private petFeedSessionId = 0;
  private activePetFeedSessionId = 0;
  private petCreationSessionId = 0;
  private activePetCreationSessionId = 0;
  private bindChildDraft = "";
  private petEvolution: PetEvolutionPayload | null = null;
  private petEvolutionError = "";
  private parentOverview: ChildPetPayload | null = null;
  private parentWeeklyReport: WeeklyReportPayload | null = null;
  private parentOverviewError = "";
  private parentWeeklyError = "";

  onLoad(): void {
    const savedTab = storage.get(STORAGE_KEYS.activeTab);
    if (savedTab === "overview" || savedTab === "homework" || savedTab === "growth") {
      this.activeTab = savedTab;
    }
  }

  async start(): Promise<void> {
    await this.bootstrapAndRender();
  }

  private async bootstrapAndRender(): Promise<void> {
    this.bootstrapSessionId += 1;
    this.activeBootstrapSessionId = this.bootstrapSessionId;
    const bootstrapSessionId = this.activeBootstrapSessionId;
    const canCommit = () =>
      this.activeBootstrapSessionId === bootstrapSessionId &&
      this.bootstrapSessionId === bootstrapSessionId;

    const user = appState.getCurrentUser() ?? (await authService.bootstrapSession(canCommit));
    if (!canCommit()) {
      return;
    }
    if (!user) {
      sceneRouter.goToLogin();
      return;
    }

    if (user.role === "CHILD") {
      const petId = appState.getPetId();
      if (petId) {
        appState.setPetId(petId);
        await petService.refreshCurrentPet(canCommit);
        if (!canCommit()) {
          return;
        }
        await this.loadPetEvolutionData(canCommit);
        if (!canCommit()) {
          return;
        }
      } else {
        this.petEvolution = null;
        this.petEvolutionError = "";
      }
      await homeworkService.refreshHistory(1, 10, canCommit);
      if (!canCommit()) {
        return;
      }
      await homeworkService.refreshTodayStatus(canCommit);
      if (!canCommit()) {
        return;
      }
    } else {
      await this.loadParentDashboardData(canCommit);
      if (!canCommit()) {
        return;
      }
    }

    if (!canCommit()) {
      return;
    }
    await this.render();
  }

  private async render(): Promise<void> {
    this.persistHomeworkDraft();
    this.persistChatDraft();
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

    const showPageMessageAtRoot =
      !(user.role === "CHILD" && this.activeTab === "overview" && Boolean(appState.getCurrentPet()));
    if (this.pageMessage && showPageMessageAtRoot) {
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
      this.clearHomeworkInputRef();
      this.clearChatInputRef();
      this.renderGlobalActions(root);
      await this.renderParentDashboard(root);
      return;
    }

    if (this.shouldShowPetCreationFlow()) {
      this.clearHomeworkInputRef();
      this.clearChatInputRef();
      this.renderPetOnboarding(root);
      return;
    }

    this.renderGlobalActions(root);
    this.renderChildTabs(root);
    if (this.activeTab === "homework") {
      this.clearChatInputRef();
      await this.renderHomeworkTab(root);
    } else if (this.activeTab === "growth") {
      this.clearHomeworkInputRef();
      this.clearChatInputRef();
      await this.renderGrowthTab(root);
    } else {
      this.clearHomeworkInputRef();
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

    const growthButton = RuntimeUI.createButton(root, {
      name: "GrowthTab",
      text: "宠物成长",
      x: -60,
      y: 205,
      width: 160,
      height: 44,
      color:
        this.activeTab === "growth"
          ? new Color(76, 128, 255, 255)
          : new Color(52, 61, 82, 255),
      fontSize: 18,
    });
    growthButton.button.node.on(
      Button.EventType.CLICK,
      () => {
        this.activeTab = "growth";
        storage.set(STORAGE_KEYS.activeTab, this.activeTab);
        void this.render();
      },
      this
    );
  }

  private renderGlobalActions(root: Node): void {
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
    if (!pet) {
      this.clearChatInputRef();
    }
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
        text: "创建宠物",
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
        text: "已检测到宠物关联，正在等待刷新宠物状态。",
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

      RuntimeUI.createLabel(petCard, {
        name: "GrowthEntryHint",
        text: "成长阶段和进化提示已经放到“宠物成长”页签中查看。",
        x: 0,
        y: -188,
        width: 380,
        height: 26,
        fontSize: 15,
        color: new Color(171, 183, 200, 255),
      });
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
      `语文：${today?.chinese?.submitted ? `已提交(${today.chinese.score ?? '-'})` : '未提交'}`,
      `数学：${today?.math?.submitted ? `已提交(${today.math.score ?? '-'})` : '未提交'}`,
      `英语：${today?.english?.submitted ? `已提交(${today.english.score ?? '-'})` : '未提交'}`,
    ].join("\n");

    RuntimeUI.createScrollText(sideCard, {
      // 这里收回成一整块连续阅读：先看今日作业状态，再往下读最近 5 条作业。
      // 不再拆成两块分开的阅读区，避免阅读顺序被打断。
      name: "HomeworkSummaryScroll",
      text: `今日作业状态：\n${todaySummary}\n\n最近 5 条作业：\n${formatHomeworkHistory(
        appState.getHomeworkHistory(),
        { limit: 5 }
      )}`,
      x: 0,
      y: -24,
      width: 430,
      height: 310,
      fontSize: 18,
      color: new Color(171, 183, 200, 255),
      backgroundColor: new Color(23, 29, 40, 255),
      padding: 16,
    });

    if (pet) {
      const chatMessages = appState.getChatHistory();
      const chatRefs = renderPetChatPanel(
        root,
        {
          messages: chatMessages,
          draft: this.chatCoordinator.getDraft(),
          notice:
            this.pageMessage ||
            this.chatCoordinator.buildHint(pet.name, chatMessages.length, pet.mood, this.chatSending),
          sending: this.chatSending,
        },
        {
          onSend: () => void this.handleSendPetChat(),
        },
        this
      );

      this.chatInput = chatRefs.input;
    }
  }

  private async renderHomeworkTab(root: Node): Promise<void> {
    const selectedSubject = this.homeworkCoordinator.getSelectedSubject();
    const hint = this.homeworkCoordinator.getCurrentHint();
    const refs = renderHomeworkCenter(
      root,
      {
        selectedSubject,
        draft: this.homeworkCoordinator.getCurrentDraft(),
        historySummary: formatHomeworkHistory(appState.getHomeworkHistory()),
        hint: hint.message,
        hintIsWarning: hint.isWarning,
      },
      {
        onSelectSubject: (subject) => {
          this.persistHomeworkDraft();
          this.homeworkCoordinator.setSelectedSubject(subject);
          void this.render();
        },
        onSubmit: () => this.handleSubmitHomework(),
        onBackToOverview: () => {
          this.persistHomeworkDraft();
          this.activeTab = "overview";
          storage.set(STORAGE_KEYS.activeTab, this.activeTab);
          void this.render();
        },
      },
      this
    );

    this.homeworkInput = refs.input;
    this.homeworkInputSubject = selectedSubject;
  }

  private async renderGrowthTab(root: Node): Promise<void> {
    renderPetGrowthView(
      root,
      {
        pet: appState.getCurrentPet(),
        evolution: this.petEvolution,
        evolutionError: this.petEvolutionError,
      },
      {
        onRefresh: () => this.handleRefreshGrowth(),
        onBackToOverview: () => {
          this.activeTab = "overview";
          storage.set(STORAGE_KEYS.activeTab, this.activeTab);
          void this.render();
        },
        onPreviewModeChange: () => {
          void this.render();
        },
      },
      this
    );
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
      placeholder: "输入孩子 User.id 或孩子账号",
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
      : this.parentWeeklyError || "周报接口暂未完成";

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

    if (pet) {
      const chatMessages = appState.getChatHistory();
      const chatRefs = renderPetChatPanel(
        root,
        {
          messages: chatMessages,
          draft: this.chatCoordinator.getDraft(),
          notice:
            this.pageMessage ||
            this.chatCoordinator.buildHint(pet.name, chatMessages.length, pet.mood, this.chatSending),
          sending: this.chatSending,
        },
        {
          onSend: () => void this.handleSendPetChat(),
        },
        this
      );

      this.chatInput = chatRefs.input;
    }
  }

  private async handleRefresh(): Promise<void> {
    this.pageMessage = "正在刷新最新数据...";
    this.dashboardRefreshSessionId += 1;
    this.activeDashboardRefreshSessionId = this.dashboardRefreshSessionId;
    const refreshSessionId = this.activeDashboardRefreshSessionId;
    const canCommit = () =>
      this.activeDashboardRefreshSessionId === refreshSessionId &&
      this.dashboardRefreshSessionId === refreshSessionId;
    await this.render();
    if (!canCommit()) {
      return;
    }

    const result = await this.refreshDashboardData(canCommit);
    if (!canCommit() || !result.sessionReady) {
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
    this.activeBootstrapSessionId = 0;
    this.activeBindChildSessionId = 0;
    this.activeHomeworkSubmissionSessionId = 0;
    this.activeChatSubmissionSessionId = 0;
    this.activeDashboardRefreshSessionId = 0;
    this.activePetGrowthRefreshSessionId = 0;
    this.activePetFeedSessionId = 0;
    this.activePetCreationSessionId = 0;
    this.chatSending = false;
    this.chatCoordinator.clearDraft();
    this.clearChatInputRef();
    this.petCreationCoordinator.complete();
    authService.logout();
    sceneRouter.goToLogin();
  }

  private async handleCreatePet(): Promise<void> {
    this.pageMessage = "";
    this.petCreationSessionId += 1;
    this.activePetCreationSessionId = this.petCreationSessionId;
    this.petCreationCoordinator.begin();
    await this.render();
  }

  private async handleFeedPet(): Promise<void> {
    // 喂养完成后再刷新当前宠物状态，让总览卡和成长页保持一致。
    this.petFeedSessionId += 1;
    this.activePetFeedSessionId = this.petFeedSessionId;
    const petFeedSessionId = this.activePetFeedSessionId;
    const canCommit = () =>
      this.activePetFeedSessionId === petFeedSessionId &&
      this.petFeedSessionId === petFeedSessionId;

    const before = appState.getCurrentPet();
    const result = await petService.feedCurrentPet();
    if (!canCommit()) {
      return;
    }
    await this.loadPetEvolutionData(canCommit);
    if (!canCommit()) {
      return;
    }
    const after = appState.getCurrentPet();
    const changed =
      Boolean(before && after) &&
      (before.hunger !== after.hunger ||
        before.mood !== after.mood ||
        before.experience !== after.experience ||
        before.status !== after.status);

    this.pageMessage = result.success
      ? changed
        ? "喂养完成，宠物状态已刷新"
        : "喂养完成，但当前宠物状态已接近上限，数值没有明显变化"
      : result.message ?? "喂养失败";
    await this.render();
  }

  private async handleSendPetChat(): Promise<void> {
    if (this.chatSending) {
      return;
    }

    const pet = appState.getCurrentPet();
    const petId = appState.getPetId();
    const draft = this.chatInput?.string ?? this.chatCoordinator.getDraft();
    const message = draft.trim();
    this.chatCoordinator.setDraft(message);

    if (!petId || !pet) {
      this.pageMessage = "先创建宠物，再来聊天";
      await this.render();
      return;
    }

    if (!message) {
      this.pageMessage = "请先输入想对宠物说的话";
      await this.render();
      return;
    }

    this.chatSubmissionSessionId += 1;
    this.activeChatSubmissionSessionId = this.chatSubmissionSessionId;
    const chatSessionId = this.activeChatSubmissionSessionId;
    const canCommit = () =>
      this.activeChatSubmissionSessionId === chatSessionId &&
      this.chatSubmissionSessionId === chatSessionId;

    this.chatSending = true;
    this.pageMessage = "宠物正在回复...";
    await this.render();

    const result = await chatService.sendMessage({
      petId,
      message,
      petMood: pet.mood,
      canCommit,
    });

    if (!canCommit()) {
      this.chatSending = false;
      return;
    }

    this.chatSending = false;
    if (result.success) {
      this.pageMessage = result.usedFallback
        ? "后端暂时不可用，已使用本地回复"
        : "宠物回复完成";
      if (
        this.chatInput &&
        this.chatInput.node?.isValid &&
        this.chatInput.string.trim() === message
      ) {
        this.chatInput.string = "";
      }
      this.chatCoordinator.clearDraftIfMatch(message);
      await this.render();
      return;
    }

    this.pageMessage = result.message ?? "宠物回复失败";
    await this.render();
  }

  private async handleRefreshGrowth(): Promise<void> {
    this.petGrowthRefreshSessionId += 1;
    this.activePetGrowthRefreshSessionId = this.petGrowthRefreshSessionId;
    const growthSessionId = this.activePetGrowthRefreshSessionId;
    const canCommit = () =>
      this.activePetGrowthRefreshSessionId === growthSessionId &&
      this.petGrowthRefreshSessionId === growthSessionId;

    const result = await petService.refreshCurrentPet(canCommit);
    if (!canCommit()) {
      return;
    }
    await this.loadPetEvolutionData(canCommit);
    if (!canCommit()) {
      return;
    }

    this.pageMessage = result.success
      ? "宠物成长状态已刷新"
      : result.message ?? "宠物成长状态刷新失败";
    await this.render();
  }

  private async handleSubmitHomework(): Promise<void> {
    const subject = this.homeworkCoordinator.getSelectedSubject();
    const content = this.homeworkInput?.string ?? "";
    this.homeworkSubmissionSessionId += 1;
    this.activeHomeworkSubmissionSessionId = this.homeworkSubmissionSessionId;
    const submissionSessionId = this.activeHomeworkSubmissionSessionId;
    const canCommit = () =>
      this.activeHomeworkSubmissionSessionId === submissionSessionId &&
      this.homeworkSubmissionSessionId === submissionSessionId;

    const feedback = await this.homeworkCoordinator.submitCurrent(subject, content);
    if (!canCommit()) {
      return;
    }

    if (feedback.success) {
      await Promise.all([
        homeworkService.refreshHistory(1, 10, canCommit),
        homeworkService.refreshTodayStatus(canCommit),
        appState.getPetId()
          ? petService.refreshCurrentPet(canCommit)
          : Promise.resolve(),
      ]);
      if (!canCommit()) {
        return;
      }
      await this.loadPetEvolutionData(canCommit);
      if (!canCommit()) {
        return;
      }
      const shouldClearDraft = this.homeworkCoordinator.clearDraftForSubjectIfMatch(
        subject,
        content
      );
      if (
        shouldClearDraft &&
        this.homeworkInput &&
        this.homeworkInputSubject === subject &&
        this.homeworkInput.node?.isValid &&
        this.homeworkInput.string === content
      ) {
        this.homeworkInput.string = "";
      }
    }
    this.pageMessage = feedback.message;
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

    this.bindChildSessionId += 1;
    this.activeBindChildSessionId = this.bindChildSessionId;
    const bindSessionId = this.activeBindChildSessionId;
    const canCommit = () =>
      this.activeBindChildSessionId === bindSessionId &&
      this.bindChildSessionId === bindSessionId;

    const result = await parentService.bindChild(identifier);
    if (!canCommit()) {
      return;
    }
    this.pageMessage = result.success
      ? "绑定成功，已加载孩子状态"
      : result.message ?? "绑定失败";
    if (result.success) {
      if (result.data) {
        appState.patchCurrentUser({
          childId: result.data.childId ?? null,
          childNickname: result.data.childNickname ?? null,
        });
      }
      this.bindChildDraft = "";
      await this.loadParentDashboardData(canCommit);
      if (!canCommit()) {
        return;
      }
    }
    await this.render();
  }

  private persistHomeworkDraft(): void {
    if (this.homeworkInput && (!this.homeworkInput.node || !this.homeworkInput.node.isValid)) {
      this.homeworkInput = null;
      this.homeworkInputSubject = null;
      return;
    }

    if (this.homeworkInput && this.homeworkInputSubject) {
      const currentSubject = this.homeworkCoordinator.getSelectedSubject();
      if (currentSubject !== this.homeworkInputSubject) {
        this.homeworkCoordinator.setSelectedSubject(this.homeworkInputSubject);
        this.homeworkCoordinator.syncCurrentDraft(this.homeworkInput.string);
        this.homeworkCoordinator.setSelectedSubject(currentSubject);
        return;
      }

      this.homeworkCoordinator.syncCurrentDraft(this.homeworkInput.string);
    }
  }

  private persistChatDraft(): void {
    if (this.chatInput && (!this.chatInput.node || !this.chatInput.node.isValid)) {
      this.chatInput = null;
      return;
    }

    if (this.chatInput) {
      this.chatCoordinator.setDraft(this.chatInput.string);
    }
  }

  private clearHomeworkInputRef(): void {
    this.homeworkInput = null;
    this.homeworkInputSubject = null;
  }

  private clearChatInputRef(): void {
    this.chatInput = null;
  }

  private async loadPetEvolutionData(canCommit?: () => boolean): Promise<void> {
    const petId = appState.getPetId();
    if (!petId) {
      this.petEvolution = null;
      this.petEvolutionError = "";
      return;
    }

    const result = await petService.getCurrentPetEvolution();
    if (canCommit && !canCommit()) {
      return;
    }

    if (result.success && result.data) {
      this.petEvolution = result.data;
      this.petEvolutionError = "";
      return;
    }

    this.petEvolution = null;
    this.petEvolutionError = result.message ?? "宠物进化信息加载失败";
  }

  private shouldShowPetCreationFlow(): boolean {
    const pet = appState.getCurrentPet();
    const knownPetId = appState.getPetId();
    const started = this.petCreationCoordinator.ensureStartedForNewChild(
      Boolean(pet),
      Boolean(knownPetId)
    );

    if (started) {
      this.petCreationSessionId += 1;
      this.activePetCreationSessionId = this.petCreationSessionId;
      console.info("[FirstPetFlow] hit first-pet onboarding path", {
        hasPet: Boolean(pet),
        hasKnownPetId: Boolean(knownPetId),
      });
    }

    return this.petCreationCoordinator.isActive();
  }

  private renderPetOnboarding(root: Node): void {
    const refs = renderPetCreationFlow(
      root,
      this.petCreationCoordinator.getState(),
      {
        onOpenNaming: () => {
          this.pageMessage = "";
          this.petCreationCoordinator.goToNaming();
          void this.render();
        },
        onBackToIntro: () => {
          this.pageMessage = "";
          this.petCreationCoordinator.returnToIntro();
          void this.render();
        },
        onSubmitCreate: () => this.handleSubmitFirstPetCreate(),
        onEnterPetHome: () => {
          this.pageMessage = "新的宠物已加入，陪你开始成长。";
          this.activePetCreationSessionId = 0;
          this.petCreationCoordinator.complete();
          this.activeTab = "overview";
          storage.set(STORAGE_KEYS.activeTab, this.activeTab);
          void this.render();
        },
      },
      this
    );

    this.petNameInput = refs.nameInput;
  }

  private async handleSubmitFirstPetCreate(): Promise<void> {
    const state = this.petCreationCoordinator.getState();
    const petName = this.petNameInput?.string.trim() ?? state.petName.trim();
    this.petCreationCoordinator.updatePetName(petName);

    if (!petName) {
      this.pageMessage = "请先给宠物起一个名字";
      await this.render();
      return;
    }

    this.pageMessage = "";
    this.petCreationCoordinator.startSubmitting();
    await this.render();

    const submissionSessionId = this.activePetCreationSessionId;
    console.info("[FirstPetFlow] creating first pet", {
      petName,
    });
    const result = await petService.createPet(petName);
    if (
      this.activePetCreationSessionId !== submissionSessionId ||
      !this.petCreationCoordinator.isActive()
    ) {
      return;
    }

    if (!result.success || !result.data) {
      console.warn("[FirstPetFlow] create pet failed", {
        petName,
        message: result.message ?? "unknown error",
        statusCode: result.statusCode,
      });
      this.petCreationCoordinator.goToNaming();
      this.pageMessage = result.message ?? "宠物创建失败";
      await this.render();
      return;
    }

    console.info("[FirstPetFlow] create pet succeeded", {
      petId: result.data.pet_id,
      petName: result.data.name,
    });
    appState.setPetId(result.data.pet_id);
    appState.setCurrentPet(result.data);
    this.petCreationCoordinator.showSuccess();
    await this.render();
  }

  private async refreshDashboardData(
    canCommit?: () => boolean
  ): Promise<{
    sessionReady: boolean;
    successTasks: string[];
    failedTasks: string[];
    pendingTasks: string[];
  }> {
    const user = appState.getCurrentUser() ?? (await authService.bootstrapSession(canCommit));
    if (!user) {
      if (canCommit && !canCommit()) {
        return {
          sessionReady: false,
          successTasks: [],
          failedTasks: [],
          pendingTasks: [],
        };
      }
      sceneRouter.goToLogin();
      return {
        sessionReady: false,
        successTasks: [],
        failedTasks: ["登录态恢复失败"],
        pendingTasks: [],
      };
    }

    const successTasks: string[] = [];
    const failedTasks: string[] = [];
    const pendingTasks: string[] = [];
    const canWrite = () => !canCommit || canCommit();

    if (user.role === "CHILD") {
      const petId = appState.getPetId();
      if (petId) {
        const petResult = await petService.refreshCurrentPet(canCommit);
        if (!canWrite()) {
          return {
            sessionReady: false,
            successTasks: [],
            failedTasks: [],
            pendingTasks: [],
          };
        }
        if (petResult.success) {
          successTasks.push("宠物状态");
          await this.loadPetEvolutionData(canCommit);
          if (!canWrite()) {
            return {
              sessionReady: false,
              successTasks: [],
              failedTasks: [],
              pendingTasks: [],
            };
          }
        } else {
          failedTasks.push("宠物状态");
        }
      } else if (!appState.getCurrentPet()) {
        this.petEvolution = null;
        this.petEvolutionError = "";
        pendingTasks.push("未检测到宠物映射");
      }

      const historyResult = await homeworkService.refreshHistory(1, 10, canCommit);
      if (!canWrite()) {
        return {
          sessionReady: false,
          successTasks: [],
          failedTasks: [],
          pendingTasks: [],
        };
      }
      if (historyResult.success) {
        successTasks.push("作业历史");
      } else {
        failedTasks.push("作业历史");
      }

      const statusResult = await homeworkService.refreshTodayStatus(canCommit);
      if (!canWrite()) {
        return {
          sessionReady: false,
          successTasks: [],
          failedTasks: [],
          pendingTasks: [],
        };
      }
      if (statusResult.success) {
        successTasks.push("今日状态");
      } else {
        failedTasks.push("今日状态");
      }
    } else {
      const linkedChildId = appState.getLinkedChildId();
      if (!linkedChildId) {
        if (!canWrite()) {
          return {
            sessionReady: false,
            successTasks: [],
            failedTasks: [],
            pendingTasks: [],
          };
        }
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
      if (!canWrite()) {
        return {
          sessionReady: false,
          successTasks: [],
          failedTasks: [],
          pendingTasks: [],
        };
      }
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
      if (!canWrite()) {
        return {
          sessionReady: false,
          successTasks: [],
          failedTasks: [],
          pendingTasks: [],
        };
      }
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

  private async loadParentDashboardData(canCommit?: () => boolean): Promise<void> {
    const linkedChildId = appState.getLinkedChildId();
    if (!linkedChildId) {
      if (canCommit && !canCommit()) {
        return;
      }
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
    if (canCommit && !canCommit()) {
      return;
    }
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
    if (canCommit && !canCommit()) {
      return;
    }
    if (weeklyResult.success && weeklyResult.data) {
      this.parentWeeklyReport = weeklyResult.data;
      this.parentWeeklyError = "";
    } else {
      this.parentWeeklyReport = null;
      this.parentWeeklyError = weeklyResult.message ?? "周报接口暂未完成";
    }
  }
}
