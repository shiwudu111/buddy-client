import {
  _decorator,
  Button,
  Color,
  EditBox,
  Graphics,
  HorizontalTextAlignment,
  Label,
  Mask,
  Material,
  Node,
  SpriteFrame,
  sys,
  UITransform,
  Vec3,
  Vec4,
  view,
} from "cc";
import { appState } from "../../app/AppState";
import { isDiagnosticsEnabled } from "../../core/config";
import { devActionLogger } from "../../core/DevActionLogger";
import { storage } from "../../core/storage";
import { sceneRouter } from "../../navigation/SceneRouter";
import { authService } from "../../services/AuthService";
import { chatService } from "../../services/ChatService";
import {
  homeworkImagePickerService,
  type PickedHomeworkImage,
} from "../../services/HomeworkImagePickerService";
import { homeworkService } from "../../services/HomeworkService";
import { parentService } from "../../services/ParentService";
import { petService } from "../../services/PetService";
import type {
  ChildPetPayload,
  DailyBasicFoodPayload,
  HomeworkSubject,
  OfflineDecaySummary,
  PetFoodInventoryItem,
  TimeContextPayload,
  WeeklyReportPayload,
} from "../../types/api";
import { formatHomeworkHistory } from "../../utils/format";
import { ChatConversationCoordinator } from "../chat/ChatConversationCoordinator";
import { renderPetChatPanel } from "../chat/ChatConversationView";
import { ScreenController } from "../common/base/ScreenController";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import { UiTokens } from "../theme/UiTokens";
import { HomeworkCenterCoordinator } from "../homework/HomeworkCenterCoordinator";
import {
  renderHomeworkCenter,
  type HomeworkCenterLayoutTuning,
  type HomeworkCenterViewRefs,
} from "../homework/HomeworkCenterView";
import { MainAssetStore } from "./MainAssetStore";
import {
  ART_TUNING_DEFAULTS,
  ART_TUNING_FIELDS,
  ART_TUNING_STORAGE_KEY,
  type ArtDebugHostWindow,
  type ArtTuningField,
  type ArtTuningKey,
  type ArtTuningState,
} from "./MainArtTuning";
import { renderBagPanelContent, renderFoodSelectionPanel } from "./MainBagPanel";
import {
  renderCloudBadge,
  renderCompanionCloudIcon,
  renderDottedDivider,
  renderFlowerCluster,
  renderPawTitleDecor,
} from "./MainDecorations";
import {
  resolveParentColumnAnimationProgress,
  resolveParentColumnLayout as resolveParentDashboardColumnLayout,
} from "./parent/ParentColumnLayout";
import { renderParentDashboardPanel } from "./parent/ParentDashboardPanel";
import {
  renderParentHomeworkPanel,
  renderParentInsightScroll,
  renderParentPetGrowthPanel,
} from "./parent/ParentSectionPanels";
import { ART_DEBUG_PAGE_HTML, REFERENCE_PAGE_HTML } from "./MainDebugPages";
import { renderMainStageBase, type MainStageRendererContext } from "./MainStageRenderer";
import {
  formatOfflineDecayDetail,
  resolveCurrentSeenAt,
  resolveHighPriorityOpeningBubble,
  resolveIdleShowBubbleCopy,
  resolveLastMainSeenAtStorageKey,
  resolveNormalOpeningBubble,
  type OpeningBubblePriority,
  type PetBubble,
  type PetBubbleSource,
} from "./MainLifeFeedback";
import { renderJournalPanelContent } from "./MainJournalPanel";
import { MainPetAnimator } from "./MainPetAnimator";
import { MainPetCreationGateController } from "./MainPetCreationGateController";
import { MainPetInteractionController, type CorePetAction } from "./MainPetInteractionController";
import { MainProceduralTextureFactory } from "./MainProceduralTextureFactory";
import {
  isPetSnapshotSleeping,
  resolveMainViewModel,
  resolveStatusIcon,
  type LocalPetMode,
  type MainPetDisplayStatus,
  type MainViewModel,
  type PetVisualState,
} from "./MainViewModel";

const { ccclass } = _decorator;

// 视口尺寸兜底值。
// 当运行时暂时拿不到真实画布尺寸时，先用这个值避免布局计算失真。
const FALLBACK_VIEWPORT = { width: 1024, height: 768 };

// 视口宽高比的分段参考点。
// 用来根据当前屏幕比例，决定壳层和主舞台更偏横向还是更偏竖向。
const BREAKPOINTS = [0.86, 1, 4 / 3, 16 / 9];

// 右上角调试入口按钮的文案。
// 这个按钮主要用于打开测试面板或参考页。
const REFERENCE_BUTTON_LABEL = "REF";

// 调试入口的小按钮尺寸。
// 右上角那个小圆点测试入口就靠它控制大小。
const DEBUG_ENTRY_SIZE = 18;

// 调试面板的宽度。
// 这个宽度决定弹窗能不能把几个开关完整放下。
const DEBUG_PANEL_WIDTH = 260;

// 调试面板的高度。
// 这个高度控制弹窗整体的纵向占位。
const DEBUG_PANEL_HEIGHT = 300;

// 调试面板中每个切换按钮的宽度。
// 对应“渐变底色 / Shader 测试块”等保留开关。
const DEBUG_TOGGLE_WIDTH = 196;

// 调试面板中每个切换按钮的高度。
// 这个值主要影响按钮的可点面积和文字舒适度。
const DEBUG_TOGGLE_HEIGHT = 34;

// 调试面板中按钮之间的垂直间距。
// 控制开关之间的呼吸感。
const DEBUG_TOGGLE_GAP = 8;
const DEV_LOG_TOP_OFFSET = 64;

const PET_BUBBLE_DURATION_MS = 4000;
const PET_VISUAL_FEED_DURATION_MS = 1800;
const PET_VISUAL_PLAY_DURATION_MS = 2200;
const PET_VISUAL_MUSIC_DURATION_MS = 2000;
const PET_VISUAL_SOOTHED_DURATION_MS = 2000;
const PET_IDLE_SHOW_BUBBLE_COOLDOWN_MS = 45000;
const CORE_ACTION_TAP_LOCK_MS = 1800;
const CORE_ACTION_BLOCK_NOTICE_THROTTLE_MS = 1500;
const RETURN_GREETING_SHORT_MINUTES = 10;
const RETURN_GREETING_NORMAL_MINUTES = 60;
const RETURN_GREETING_LONG_MINUTES = 360;
// 美术调参页的窗口名。
// 固定名字可以避免每次点击都弹出一堆重复窗口。
const ART_DEBUG_WINDOW_NAME = "BuddyMainArtDebug";

// 壳层参考宽度。
// 用来作为壳层整体缩放的基准，不是固定像素母版。
const APP_SHELL_REFERENCE_WIDTH = 1280;

// 壳层外轮廓的圆角语义。
// 这个值决定壳层整体是“硬一点”还是“奶油一点”。
const APP_SHELL_RADIUS = 38;

// 壳层外框和屏幕边缘之间的基础留白。
// 越大越松，越小越紧，能直接影响壳层呼吸感。
const APP_SHELL_PADDING = 18;

// 美术可调参数清单
// - APP_SHELL_PADDING：壳层和内部内容之间的总留白，越大越“透气”，越小越“紧凑”。
// - SHELL_FRAME_PADDING：ShellFrame 相对壳层的内缩，主要影响第一道内框的呼吸感。
// - MAIN_VIEWPORT_PADDING：MainViewport 相对 ShellFrame 的内缩，主要影响视口和主舞台的分层感。
// - MAIN_VIEWPORT_RADIUS：主视口圆角，决定内部内容的“柔和”程度。
// - MAIN_STAGE_RADIUS：主舞台圆角，决定主舞台底板的气质，通常与主视口保持相近但略小。
// 这些参数共同决定“4:3 壳体里再套一层内容框”的感觉，设计同学可以先动它们。

// ShellFrame 相对壳层的内缩。
// 它主要控制主内容第一道内框和外壳之间的距离。
const SHELL_FRAME_PADDING = 22;

// MainViewport 相对 ShellFrame 的内缩。
// 它主要控制主视口和舞台底板之间的留白。
const MAIN_VIEWPORT_PADDING = 16;

// 主舞台圆角相关参数。
// 这里不是为了像素死对齐，而是保留“柔和、奶油感、卡片式”的视觉语义。

// 主视口圆角。
// 这个圆角偏大，让中间承载区看起来更像一张软卡片。
const MAIN_VIEWPORT_RADIUS = 32;

// 主舞台本体圆角。
// 一般会略小于主视口，避免视觉上层次太糊。
const MAIN_STAGE_RADIUS = 28;

// 竖屏时视口比例判断线。
// 低于这个值时，布局会更偏向“竖向收紧”的壳体策略。
const PORTRAIT_VIEWPORT_ASPECT = 0.86;

// 竖屏时壳层比例的起始值。
// 它定义了很窄屏幕下壳层更收的那一端。
const PORTRAIT_SHELL_ASPECT = 0.5;

// 壳层阴影的主色。
// 这里只控制阴影色相，不控制强弱，强弱由透明度和贴图生成逻辑决定。
const SHELL_SHADOW_COLOR = new Color(187, 129, 62, 255);

// 壳层渐变遮罩的 overscan 宽度。
// 这部分是为了防止圆角边缘出现黑线或贴图取样空洞。
const SHELL_SURFACE_GRADIENT_OVERSCAN = 4;

// 动作卡宽高调参的钝化倍率。
// 调参页仍以 1 为默认中心，但实际尺寸只吃一小部分偏移，避免 0.1 的变化过猛。
const BOTTOM_DOCK_TILE_SIZE_TUNING_DAMPING = 0.3;

type MainLayout = {
  viewportWidth: number;
  viewportHeight: number;
  shellWidth: number;
  shellHeight: number;
  buttonSize: number;
  buttonX: number;
  buttonY: number;
};


type TopBarNavTab = "petHome" | "bag" | "journal" | "chat";

type BottomDockAction = "feed" | "play" | "bath" | "sleep" | "music" | "care";

type MainInteractionEntry = {
  title: string;
  detail: string;
  createdAt: string;
};

type MobileMainLayoutProfile = {
  compact: boolean;
  marginRatio: number;
  chromeScale: number;
  sideCardScale: number;
  stageInsetScale: number;
};

@ccclass("MainController")
export class MainController extends ScreenController {
  private referencePageUrl: string | null = null;
  private artDebugPageWindow: Window | null = null;
  private lastReferenceOpenAt = 0;
  private petAnimator = new MainPetAnimator();
  private assetStore = new MainAssetStore(() => this.requestRender());
  private proceduralTextureFactory = new MainProceduralTextureFactory();
  private shellShadowSpriteFrame: SpriteFrame | null = null;
  private mainViewportShadowSpriteFrame: SpriteFrame | null = null;
  private topBarShadowSpriteFrame: SpriteFrame | null = null;
  private bottomDockShadowSpriteFrame: SpriteFrame | null = null;
  private shellShadowLayoutKey = "";
  private mainViewportShadowLayoutKey = "";
  private topBarShadowLayoutKey = "";
  private bottomDockShadowLayoutKey = "";
  private showBackgroundGradient = true;
  private showBackgroundGlowTopLeft = true;
  private showBackgroundGlowBottomRight = true;
  private showBackgroundDebugPanel = false;
  private showShellLayer = true;
  private showShellFrameLayer = true;
  private showMainViewportLayer = true;
  private showShaderDebugBlock = false;
  private artTuning: ArtTuningState = { ...ART_TUNING_DEFAULTS };
  private activeTopBarNavTab: TopBarNavTab = "petHome";
  private interactionEntries: MainInteractionEntry[] = [
    {
      title: "等待主页同步",
      detail: "Main 将优先读取 dashboard / appState 作为正式状态来源。",
      createdAt: new Date().toISOString(),
    },
  ];
  private backendFeedBlocked = false;
  private feedRequestSeq = 0;
  private dashboardRequestSeq = 0;
  private dashboardLoading = false;
  private dashboardRefreshPromise: Promise<boolean> | null = null;
  private dashboardFailureLogged = false;
  private feedRequestInFlight = false;
  private inventoryUseRequestInFlight = false;
  private petInteraction = new MainPetInteractionController();
  private coreActionTapBlockedUntil = 0;
  private coreActionBlockNoticeAt = 0;
  private journalEventsLoading = false;
  private journalEventsLoaded = false;
  private journalSyncMessage: string | null = null;
  private chatCoordinator = new ChatConversationCoordinator();
  private chatInput: EditBox | null = null;
  private chatSending = false;
  private chatRefreshSeq = 0;
  private parentBindInput: EditBox | null = null;
  private parentNotice = "";
  private parentBinding = false;
  private parentOverviewLoading = false;
  private parentReportLoading = false;
  private parentOverviewText = "";
  private parentReportText = "";
  private parentOverviewData: ChildPetPayload | null = null;
  private parentReportData: WeeklyReportPayload | null = null;
  private parentExpandedColumn: "pet" | "insight" | "homework" | null = null;
  private parentColumnAnimationFrom: "pet" | "insight" | "homework" | null = null;
  private parentColumnAnimationTo: "pet" | "insight" | "homework" | null = null;
  private parentColumnAnimationStart = 0;
  private parentColumnAnimationFrame: number | null = null;
  private parentColumnLastToggleAt = 0;
  private isFoodSelectionPanelOpen = false;
  private isHomeworkCenterOpen = false;
  private homeworkCenterRefs: HomeworkCenterViewRefs | null = null;
  private homeworkCenterCoordinator = new HomeworkCenterCoordinator();
  private petCreationGate = new MainPetCreationGateController({
    onGateOpened: () => this.handlePetCreationGateOpened(),
    onPetCreated: (petName) => this.handlePetCreatedFromGate(petName),
    onEnterPetHome: () => this.handleEnterPetHomeFromGate(),
    onRenderRequested: () => this.render(),
    onDashboardRefreshRequested: () => {
      void this.tryRefreshMainDashboard();
    },
  });
  private homeworkDevResetting = false;
  private homeworkDevResetMessage: string | null = null;
  private isDevLogOpen = false;
  private lastOfflineDecay: OfflineDecaySummary | null = null;
  private localPetMode: LocalPetMode = null;
  private timeContext: TimeContextPayload | null = null;
  private currentSeenAt: string | null = null;
  private petBubble: PetBubble | null = null;
  private petBubbleTimer: ReturnType<typeof setTimeout> | null = null;
  private activeVisualState: PetVisualState = "serverDerived";
  private visualStateTimer: ReturnType<typeof setTimeout> | null = null;
  private renderFrameHandle: number | null = null;
  private renderFallbackTimer: ReturnType<typeof setTimeout> | null = null;
  private renderScheduled = false;
  private openingBubbleShownThisSession = false;
  private artDebugNativeSkipLogged = false;
  private highPriorityOpeningBubbleVisible = false;
  private lastIdleShowBubbleAt = 0;
  private idleShowBubbleIndex = 0;
  private handleMainVisibilityChange = (): void => {
    if (typeof document !== "undefined" && document.hidden) {
      this.persistCurrentMainSeenAt();
      this.clearLifeRuntimeState();
    }
  };
  private handleMainPageHide = (): void => {
    this.persistCurrentMainSeenAt();
    this.clearLifeRuntimeState();
  };

  onLoad(): void {
    if (this.shouldDisableArtDebugOnNative()) {
      devActionLogger.warn("main.artDebug.disabled.native", {
        reason: "disable art debug bridge and tuning page on Android native",
      });
    } else {
      this.hydrateArtTuningFromStorage();
      this.installArtDebugBridge();
    }

    view.on("canvas-resize", this.render, this);
    this.installLifeContextListeners();
  }

  onDestroy(): void {
    this.persistCurrentMainSeenAt();
    this.clearLifeRuntimeState();
    this.cancelParentColumnAnimation();
    this.cancelScheduledRender();
    this.assetStore.dispose();
    this.petCreationGate.dispose();
    this.petInteraction.dispose();
    this.uninstallLifeContextListeners();
    view.off("canvas-resize", this.render, this);
    this.releaseArtDebugPage();
    this.uninstallArtDebugBridge();
    this.releaseReferencePageUrl();
  }

  update(deltaTime: number): void {
    const animatorEvent = this.petAnimator.update(deltaTime, this.activeTopBarNavTab === "petHome");
    if (animatorEvent === "idleShowStarted") {
      this.handlePetIdleShowStarted();
    }
  }

  async start(): Promise<void> {
    devActionLogger.info("main.start.begin", {
      userRole: appState.getCurrentUser()?.role,
      hasPetId: Boolean(appState.getPetId()),
    });
    try {
      const hasSession = await this.redirectToLoginWhenSessionMissing();
      if (!hasSession) {
        devActionLogger.warn("main.start.redirectToLogin");
        return;
      }

      if (this.isParentUser()) {
        devActionLogger.info("main.start.parent", {
          hasLinkedChild: Boolean(appState.getLinkedChildId()),
        });
        this.render();
        if (appState.getLinkedChildId()) {
          void this.handleParentLoadOverview();
        }
        return;
      }

      if (this.openFirstPetCreationIfNeeded()) {
        devActionLogger.info("main.start.petCreationGate");
        this.render();
        return;
      }

      this.render();
      await this.tryRefreshMainDashboard();
      if (this.openFirstPetCreationIfNeeded()) {
        devActionLogger.info("main.start.petCreationGateAfterDashboard");
        this.render();
      }
      devActionLogger.info("main.start.done");
    } catch (error) {
      devActionLogger.error(
        "MainController.start failed",
        error instanceof Error ? error.message : String(error)
      );
      throw error;
    }
  }

  private async redirectToLoginWhenSessionMissing(): Promise<boolean> {
    try {
      const user = appState.getCurrentUser() ?? (await authService.bootstrapSession());
      if (!user) {
        devActionLogger.warn("main.session.missing");
        this.persistCurrentMainSeenAt();
        this.clearLifeRuntimeState();
        sceneRouter.goToLogin();
        return false;
      }
      devActionLogger.info("main.session.ready", { role: user.role });
      return true;
    } catch (error) {
      devActionLogger.error(
        "main.session.bootstrap failed",
        error instanceof Error ? error.message : String(error)
      );
      this.persistCurrentMainSeenAt();
      this.clearLifeRuntimeState();
      sceneRouter.goToLogin();
      return false;
    }
  }

  private installLifeContextListeners(): void {
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", this.handleMainVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.addEventListener("pagehide", this.handleMainPageHide);
    }
  }

  private uninstallLifeContextListeners(): void {
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", this.handleMainVisibilityChange);
    }
    if (typeof window !== "undefined") {
      window.removeEventListener("pagehide", this.handleMainPageHide);
    }
  }

  private render(): void {
    // 每次重绘都先算一次当前视口对应的布局参数。
    // 这样切分辨率、旋转设备、调整窗口时，主舞台不会死在固定像素上。
    const layout = this.resolveLayout();
    const root = this.ensureManagedRoot("MainRoot");
    const transform = root.getComponent(UITransform) ?? root.addComponent(UITransform);
    transform.setContentSize(layout.viewportWidth, layout.viewportHeight);

    RuntimeUI.clear(root);
    this.petAnimator.clearSprite();
    this.chatInput = null;
    this.parentBindInput = null;
    this.petCreationGate.clearRefs();

    if (!this.shouldDisableArtDebugOnNative()) {
      this.installArtDebugBridge();
    }
    this.ensureButtonGradientEffectLoaded();
    this.renderBackdrop(root, layout);
    if (this.isParentUser()) {
      this.renderParentHomeV2(root, layout);
      this.renderBackgroundDebugEntry(root, layout);
      this.renderDevLogEntryIfEnabled(root, layout);
      return;
    }
    if (this.petCreationGate.isActive()) {
      this.petCreationGate.render(root, layout);
      this.renderBackgroundDebugEntry(root, layout);
      this.renderDevLogEntryIfEnabled(root, layout);
      return;
    }
    if (this.shouldUsePhoneLandscapeHome(layout)) {
      this.renderPhoneLandscapeHome(root, layout);
      this.renderDevLogEntryIfEnabled(root, layout);
      return;
    }
    this.renderShell(root, layout);
    this.renderBackgroundDebugEntry(root, layout);
    this.renderDevLogEntryIfEnabled(root, layout);
  }

  private requestRender(): void {
    if (this.renderScheduled) {
      return;
    }

    this.renderScheduled = true;
    const flushRender = (): void => {
      this.renderScheduled = false;
      this.renderFrameHandle = null;
      this.renderFallbackTimer = null;
      this.render();
    };

    if (typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
      this.renderFrameHandle = window.requestAnimationFrame(flushRender);
      return;
    }

    this.renderFallbackTimer = setTimeout(flushRender, 0);
  }

  private cancelScheduledRender(): void {
    this.renderScheduled = false;
    if (
      this.renderFrameHandle !== null &&
      typeof window !== "undefined" &&
      typeof window.cancelAnimationFrame === "function"
    ) {
      window.cancelAnimationFrame(this.renderFrameHandle);
    }
    if (this.renderFallbackTimer) {
      clearTimeout(this.renderFallbackTimer);
    }
    this.renderFrameHandle = null;
    this.renderFallbackTimer = null;
  }

  private async tryRefreshMainDashboard(): Promise<boolean> {
    if (this.dashboardLoading) {
      devActionLogger.info("main.dashboard.joinInFlight");
      return this.dashboardRefreshPromise ?? false;
    }
    const currentUser = appState.getCurrentUser();
    const petId = appState.getPetId();
    if (!currentUser || !petId) {
      devActionLogger.warn("main.dashboard.skip", {
        hasUser: Boolean(currentUser),
        hasPetId: Boolean(petId),
      });
      return false;
    }

    const requestSeq = this.dashboardRequestSeq + 1;
    this.dashboardRequestSeq = requestSeq;
    this.dashboardLoading = true;
    devActionLogger.info("main.dashboard.start", {
      requestSeq,
      petId,
    });

    const refreshTask = (async (): Promise<boolean> => {
      try {
        devActionLogger.info("main.dashboard.beforeRefreshDashboard", {
          requestSeq,
        });

        const result = await petService.refreshDashboard(
          () => requestSeq === this.dashboardRequestSeq,
          petId
        );

        devActionLogger.info("main.dashboard.afterRefreshDashboard", {
          requestSeq,
          success: result.success,
          statusCode: result.statusCode,
          hasData: Boolean(result.data),
        });

        devActionLogger.info("main.dashboard.beforeResultHandling", {
          requestSeq,
          currentSeq: this.dashboardRequestSeq,
          success: result.success,
        });
        if (requestSeq !== this.dashboardRequestSeq) {
          devActionLogger.warn("main.dashboard.stale", { requestSeq });
          return false;
        }
        if (result.success) {
          devActionLogger.info("main.dashboard.success", {
            statusCode: result.statusCode,
            hasDailyFood: Boolean(result.dailyBasicFood),
            hasOfflineDecay: Boolean(result.offlineDecay),
          });
          this.localPetMode = null;
          this.activeVisualState = "serverDerived";
          this.lastOfflineDecay = result.offlineDecay ?? null;
          this.handleDashboardLifeContext(result.timeContext ?? null, result.offlineDecay, result.dailyBasicFood);
          this.dashboardFailureLogged = false;
          this.appendMainInteraction(
            result.dailyBasicFood?.granted ? "每日基础口粮" : "主页数据已同步",
            this.resolveDashboardSyncDetail(result.offlineDecay, result.dailyBasicFood)
          );
          devActionLogger.info("main.dashboard.beforeRenderSuccess", { requestSeq });
          this.render();
          devActionLogger.info("main.dashboard.afterRenderSuccess", { requestSeq });
          return true;
        }

        if (!this.dashboardFailureLogged) {
          devActionLogger.warn("main.dashboard.failure", {
            message: result.message,
            statusCode: result.statusCode,
          });
          this.dashboardFailureLogged = true;
          this.appendMainInteraction(
            "主页同步失败",
            result.message ? `${result.message}；当前保留已有状态。` : "dashboard 暂不可用，当前保留已有状态。"
          );
          if (this.openFirstPetCreationIfNeeded()) {
            devActionLogger.info("main.dashboard.beforeRenderFirstPet", { requestSeq });
            this.render();
            devActionLogger.info("main.dashboard.afterRenderFirstPet", { requestSeq });
            return false;
          }
          devActionLogger.info("main.dashboard.beforeRenderFailure", { requestSeq });
          this.render();
          devActionLogger.info("main.dashboard.afterRenderFailure", { requestSeq });
        }
        return false;
      } catch (error) {
        devActionLogger.error(
          "main.dashboard.exception",
          error instanceof Error ? error.message : String(error)
        );
        if (requestSeq === this.dashboardRequestSeq && !this.dashboardFailureLogged) {
          this.dashboardFailureLogged = true;
          this.appendMainInteraction("主页同步失败", "dashboard 请求异常，当前保留已有状态。");
          if (this.openFirstPetCreationIfNeeded()) {
            devActionLogger.info("main.dashboard.beforeRenderExceptionFirstPet", { requestSeq });
            this.render();
            devActionLogger.info("main.dashboard.afterRenderExceptionFirstPet", { requestSeq });
            return false;
          }
          devActionLogger.info("main.dashboard.beforeRenderException", { requestSeq });
          this.render();
          devActionLogger.info("main.dashboard.afterRenderException", { requestSeq });
        }
        return false;
      } finally {
        devActionLogger.info("main.dashboard.finally", {
          requestSeq,
          currentSeq: this.dashboardRequestSeq,
          willClearLoading: requestSeq === this.dashboardRequestSeq,
        });
        if (requestSeq === this.dashboardRequestSeq) {
          this.dashboardLoading = false;
        }
        devActionLogger.info("main.dashboard.finally.done", {
          requestSeq,
          dashboardLoading: this.dashboardLoading,
        });
      }
    })();

    this.dashboardRefreshPromise = refreshTask;
    devActionLogger.info("main.dashboard.promiseStored", { requestSeq });
    try {
      return await refreshTask;
    } finally {
      if (this.dashboardRefreshPromise === refreshTask) {
        this.dashboardRefreshPromise = null;
      }
    }
  }

  private handleDashboardLifeContext(
    timeContext: TimeContextPayload | null,
    offlineDecay: OfflineDecaySummary | undefined,
    dailyBasicFood: DailyBasicFoodPayload | undefined
  ): void {
    this.timeContext = timeContext;
    this.showOpeningBubbleIfNeeded(timeContext, offlineDecay, dailyBasicFood);
    this.currentSeenAt = resolveCurrentSeenAt(timeContext);
  }

  private showOpeningBubbleIfNeeded(
    timeContext: TimeContextPayload | null,
    offlineDecay: OfflineDecaySummary | undefined,
    dailyBasicFood: DailyBasicFoodPayload | undefined
  ): void {
    if (this.openingBubbleShownThisSession) {
      return;
    }

    const highPriorityBubble = resolveHighPriorityOpeningBubble({
      timeContext,
      offlineDecay,
      dailyBasicFood,
      petId: appState.getPetId(),
      storage,
    });
    if (highPriorityBubble) {
      this.openingBubbleShownThisSession = true;
      this.showPetBubble(highPriorityBubble.text, highPriorityBubble.source, {
        priority: "high",
      });
      return;
    }

    const normalBubble = resolveNormalOpeningBubble({
      timeContext,
      pet: appState.getCurrentPet(),
    });
    if (!normalBubble) {
      return;
    }

    this.openingBubbleShownThisSession = true;
    this.showPetBubble(normalBubble.text, normalBubble.source, {
      priority: "normal",
    });
  }

  private persistCurrentMainSeenAt(): void {
    const petId = appState.getPetId();
    if (!petId) {
      return;
    }
    storage.set(resolveLastMainSeenAtStorageKey(petId), this.currentSeenAt ?? new Date().toISOString());
  }

  private showPetBubble(
    text: string,
    source: PetBubbleSource,
    options?: {
      priority?: OpeningBubblePriority;
      allowCoverHighPriority?: boolean;
    }
  ): void {
    if (this.highPriorityOpeningBubbleVisible && options?.allowCoverHighPriority !== true) {
      return;
    }
    this.clearPetBubbleTimer();
    const createdAt = new Date().toISOString();
    this.petBubble = {
      text,
      source,
      createdAt,
    };
    this.highPriorityOpeningBubbleVisible = options?.priority === "high";
    this.petBubbleTimer = setTimeout(() => {
      if (this.petBubble?.createdAt !== createdAt) {
        return;
      }
      this.petBubble = null;
      this.highPriorityOpeningBubbleVisible = false;
      this.petBubbleTimer = null;
      this.render();
    }, PET_BUBBLE_DURATION_MS);
  }

  private handlePetIdleShowStarted(): void {
    if (this.activeTopBarNavTab !== "petHome" || this.activeVisualState !== "serverDerived") {
      return;
    }
    if (this.petBubble || this.highPriorityOpeningBubbleVisible) {
      return;
    }
    const now = Date.now();
    if (now - this.lastIdleShowBubbleAt < PET_IDLE_SHOW_BUBBLE_COOLDOWN_MS) {
      return;
    }

    const copy = resolveIdleShowBubbleCopy(appState.getCurrentPet(), this.idleShowBubbleIndex);
    this.idleShowBubbleIndex += 1;
    this.lastIdleShowBubbleAt = now;
    devActionLogger.info("main.petLife.idleShow", { copyIndex: this.idleShowBubbleIndex });
    this.showPetBubble(copy, "stateBubble");
    this.render();
  }

  private clearPetBubbleTimer(): void {
    if (this.petBubbleTimer) {
      clearTimeout(this.petBubbleTimer);
      this.petBubbleTimer = null;
    }
  }

  private triggerVisualState(
    visualState: Exclude<PetVisualState, "serverDerived">,
    durationMs: number | null
  ): void {
    this.clearVisualStateTimer();
    this.activeVisualState = visualState;
    if (durationMs === null) {
      return;
    }
    this.visualStateTimer = setTimeout(() => {
      if (this.activeVisualState !== visualState) {
        return;
      }
      this.activeVisualState = "serverDerived";
      this.visualStateTimer = null;
      this.render();
    }, durationMs);
  }

  private clearVisualStateTimer(): void {
    if (this.visualStateTimer) {
      clearTimeout(this.visualStateTimer);
      this.visualStateTimer = null;
    }
  }

  private clearLifeRuntimeState(): void {
    this.clearPetBubbleTimer();
    this.clearVisualStateTimer();
    this.petBubble = null;
    this.activeVisualState = "serverDerived";
    this.highPriorityOpeningBubbleVisible = false;
  }

  private createMainViewModel(): MainViewModel {
    return resolveMainViewModel({
      pet: appState.getCurrentPet(),
      foods: appState.getPetFoodInventory(),
      localPetMode: this.localPetMode,
      activeVisualState: this.activeVisualState,
    });
  }
  private shouldDisableArtDebugOnNative(): boolean {
    return sys.isNative && sys.os === sys.OS.ANDROID;
  }
  private reserveCoreActionTapSlot(action: CorePetAction): boolean {
    const now = Date.now();

    if (now >= this.coreActionTapBlockedUntil) {
      this.coreActionTapBlockedUntil = now + CORE_ACTION_TAP_LOCK_MS;
      return true;
    }

    if (now >= this.coreActionBlockNoticeAt) {
      const cooldownRemainingMs = this.coreActionTapBlockedUntil - now;
      this.coreActionBlockNoticeAt = now + CORE_ACTION_BLOCK_NOTICE_THROTTLE_MS;

      devActionLogger.warn("main.petAction.blocked", {
        reason: "tapLock",
        action,
        cooldownRemainingMs,
      });

      this.appendMainInteraction("操作太快啦", "等精灵回应一下，再继续互动。");
      this.render();
    }

    return false;
  }

  private extendCoreActionTapLock(durationMs = CORE_ACTION_TAP_LOCK_MS): void {
    this.coreActionTapBlockedUntil = Math.max(
      this.coreActionTapBlockedUntil,
      Date.now() + durationMs
    );
  }

  private isParentUser(): boolean {
    return appState.getCurrentUser()?.role === "PARENT";
  }

  private openFirstPetCreationIfNeeded(): boolean {
    return this.petCreationGate.openIfNeeded();
  }

  private handlePetCreationGateOpened(): void {
    this.isFoodSelectionPanelOpen = false;
    this.isHomeworkCenterOpen = false;
    this.activeTopBarNavTab = "petHome";
    this.appendMainInteraction("等待创建宠物", "当前孩子账号还没有宠物，请先完成首次创建。");
  }

  private handlePetCreatedFromGate(petName: string): void {
    this.backendFeedBlocked = false;
    this.dashboardFailureLogged = false;
    this.appendMainInteraction("宠物创建成功", `${petName} 已加入你的主页。`);
  }

  private handleEnterPetHomeFromGate(): void {
    this.activeTopBarNavTab = "petHome";
  }

  private hydrateArtTuningFromStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      const raw = window.localStorage.getItem(ART_TUNING_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const parsed = JSON.parse(raw) as Partial<Record<ArtTuningKey, unknown>>;
      ART_TUNING_FIELDS.forEach((field) => {
        const value = parsed[field.key];
        if (typeof value === "number" && Number.isFinite(value)) {
          this.artTuning[field.key] = this.normalizeArtTuningValue(field.key, value);
        }
      });
    } catch (error) {
      console.warn("[MainController] failed to restore art tuning state", error);
    }
  }

  private persistArtTuningToStorage(): void {
    if (typeof window === "undefined" || !window.localStorage) {
      return;
    }

    try {
      window.localStorage.setItem(ART_TUNING_STORAGE_KEY, JSON.stringify(this.artTuning));
    } catch (error) {
      console.warn("[MainController] failed to persist art tuning state", error);
    }
  }

  private installArtDebugBridge(): void {
    if (this.shouldDisableArtDebugOnNative()) {
      return;
    }

    if (typeof window === "undefined") {
      return;
    }

    const hostWindow = window as ArtDebugHostWindow;
    hostWindow.__BUDDY_CLIENT_ART_DEBUG__ = {
      getSnapshot: () => ({
        state: { ...this.artTuning },
        fields: ART_TUNING_FIELDS.map((field) => this.resolveArtTuningFieldSnapshot(field)),
      }),
      setValue: (key, value) => {
        if (this.isArtTuningKey(key)) {
          this.setArtTuningValue(key, value);
        }
      },
      reset: () => this.resetArtTuning(),
      openReferencePage: () => this.openReferencePage(),
    };
  }

  private uninstallArtDebugBridge(): void {
    if (typeof window === "undefined") {
      return;
    }

    const hostWindow = window as ArtDebugHostWindow;
    delete hostWindow.__BUDDY_CLIENT_ART_DEBUG__;
  }

  private isArtTuningKey(key: string): key is ArtTuningKey {
    return ART_TUNING_FIELDS.some((field) => field.key === key);
  }

  private getArtTuningValue(key: ArtTuningKey): number {
    return this.artTuning[key];
  }

  private setArtTuningValue(key: ArtTuningKey, value: number): void {
    const normalized = this.normalizeArtTuningValue(key, value);
    if (this.artTuning[key] === normalized) {
      return;
    }

    this.artTuning[key] = normalized;
    this.persistArtTuningToStorage();
    this.render();
  }

  private resetArtTuning(): void {
    this.artTuning = { ...ART_TUNING_DEFAULTS };
    this.persistArtTuningToStorage();
    this.render();
  }

  private normalizeArtTuningValue(key: ArtTuningKey, value: number): number {
    const field = ART_TUNING_FIELDS.find((item) => item.key === key);
    if (!field) {
      return value;
    }

    const bounds = this.resolveArtTuningFieldBounds(field);
    const clamped = Math.max(bounds.min, Math.min(bounds.max, value));
    const precision = this.resolveStepPrecision(field.step);
    return Number(clamped.toFixed(precision));
  }

  private resolveArtTuningFieldSnapshot(field: ArtTuningField): ArtTuningField {
    const bounds = this.resolveArtTuningFieldBounds(field);
    return {
      ...field,
      min: bounds.min,
      max: bounds.max,
    };
  }

  private resolveArtTuningFieldBounds(field: ArtTuningField): { min: number; max: number } {
    switch (field.key) {
      case "appShellPadding":
      case "shellFramePadding":
        return { min: 0, max: 120 };
      case "mainViewportRadius":
        return { min: 0, max: 120 };
      case "mainViewportAlpha":
      case "mainViewportShadowAlpha":
      case "topBarBorderAlpha":
      case "topBarShadowAlpha":
      case "topBarShellAlpha":
      case "topBarInnerAlpha":
      case "bottomDockBorderAlpha":
      case "bottomDockShadowAlpha":
      case "bottomDockTileBorderAlpha":
      case "bottomDockTileInnerAlpha":
      case "bottomDockShellAlpha":
      case "bottomDockInnerAlpha":
      case "bottomDockGradientTopAlpha":
      case "bottomDockGradientBottomAlpha":
      case "bottomDockIconBorderAlpha":
      case "bottomDockGlyphAlpha":
      case "bottomDockTextAlpha":
      case "bottomDockTextColorR":
      case "bottomDockTextColorG":
      case "bottomDockTextColorB":
      case "foxShadowAlpha":
        return { min: 0, max: 255 };
      case "mainViewportShadowSpreadRatio":
        return { min: 0, max: 0.2 };
      case "topBarShadowSpreadRatio":
      case "bottomDockShadowSpreadRatio":
        return { min: 0, max: 0.3 };
      case "topBarBorderWidth":
      case "bottomDockBorderWidth":
      case "bottomDockTileBorderWidth":
      case "bottomDockIconBorderWidth":
        return { min: 0, max: 24 };
      case "bottomDockIconOffsetX":
      case "bottomDockIconOffsetY":
      case "bottomDockTextOffsetX":
      case "bottomDockTextOffsetY":
      case "bottomDockFeedGlyphOffsetX":
      case "bottomDockFeedGlyphOffsetY":
      case "bottomDockPlayGlyphOffsetX":
      case "bottomDockPlayGlyphOffsetY":
      case "bottomDockBathGlyphOffsetX":
      case "bottomDockBathGlyphOffsetY":
      case "bottomDockSleepGlyphOffsetX":
      case "bottomDockSleepGlyphOffsetY":
      case "bottomDockMusicGlyphOffsetX":
      case "bottomDockMusicGlyphOffsetY":
      case "bottomDockCareGlyphOffsetX":
      case "bottomDockCareGlyphOffsetY":
        return { min: -80, max: 80 };
      case "topBarBrandTextGap":
        return { min: -60, max: 160 };
      case "topBarBrandTitleY":
      case "topBarBrandSubtitleY":
        return { min: -120, max: 120 };
      case "bottomDockIconWidth":
      case "bottomDockIconHeight":
      case "bottomDockTextFontSize":
        return { min: 0, max: 160 };
      case "leftCloudScale":
      case "rightCloudScale":
      case "stageBackgroundScale":
      case "stageBackgroundWidthScale":
      case "stageBackgroundHeightScale":
      case "foxCharacterScale":
      case "foxSpriteWidthScale":
      case "foxSpriteHeightScale":
      case "foxShadowWidthScale":
      case "foxShadowHeightScale":
        return { min: 0, max: 2 };
      case "leftCloudXRatio":
      case "rightCloudXRatio":
      case "cloudYRatio":
      case "rightCloudYOffsetRatio":
      case "stageBackgroundOffsetXRatio":
      case "stageBackgroundOffsetYRatio":
      case "safeZoneYRatio":
      case "foxCharacterOffsetXRatio":
      case "foxCharacterOffsetYRatio":
      case "grassYRatio":
      case "stageGroundLineYRatio":
      case "mainViewportOffsetXRatio":
      case "mainViewportOffsetYRatio":
      case "topBarOffsetXRatio":
      case "topBarOffsetYRatio":
      case "leftCardOffsetXRatio":
      case "leftCardOffsetYRatio":
      case "rightCardOffsetXRatio":
      case "rightCardOffsetYRatio":
      case "bottomDockOffsetXRatio":
      case "bottomDockOffsetYRatio":
        return { min: -1, max: 1 };
      case "topBarBrandTitleFontScale":
      case "topBarBrandSubtitleFontScale":
      case "topBarHeightRatio":
      case "topBarBrandMarkHeightRatio":
      case "topBarNavWidthRatio":
      case "topBarStatusWidthRatio":
      case "bottomDockHeightRatio":
      case "bottomDockTileGapRatio":
      case "bottomDockTileGroupWidthScale":
      case "bottomDockTileWidthScale":
      case "bottomDockTileHeightScale":
      case "bottomDockIconRadiusRatio":
      case "bottomDockIconGlossWidthRatio":
      case "bottomDockIconGlossHeightRatio":
      case "bottomDockIconGlossOffsetYRatio":
      case "bottomDockFeedGlyphSizeScale":
      case "bottomDockPlayGlyphSizeScale":
      case "bottomDockBathGlyphSizeScale":
      case "bottomDockSleepGlyphSizeScale":
      case "bottomDockMusicGlyphSizeScale":
      case "bottomDockCareGlyphSizeScale":
      case "mainViewportWidthScale":
      case "mainViewportHeightScale":
      case "topBarWidthScale":
      case "topBarHeightScale":
      case "leftCardWidthScale":
      case "leftCardHeightScale":
      case "rightCardWidthScale":
      case "rightCardHeightScale":
      case "bottomDockWidthScale":
      case "bottomDockHeightScale":
      case "sideCardStageInsetRatio":
      case "sideCardBaseWidthRatio":
      case "sideCardBaseHeightRatio":
      case "sideCardVerticalGuardRatio":
      case "cloudBaseWidthRatio":
      case "safeZoneWidthRatio":
      case "safeZoneHeightRatio":
      case "stageBaseArcWidthRatio":
      case "stageBaseArcHeightRatio":
      case "stageBaseArcBottomRatio":
        return { min: 0, max: 2 };
      default:
        return { min: field.min, max: field.max };
    }
  }

  private resolveStepPrecision(step: number): number {
    const text = `${step}`;
    const dotIndex = text.indexOf(".");
    return dotIndex === -1 ? 0 : text.length - dotIndex - 1;
  }

  private getGraphicsMaskSubComp(mask: Mask): Graphics | null {
    const subComp = mask.subComp;
    return subComp instanceof Graphics ? subComp : null;
  }

  private resolveMobileMainLayoutProfile(viewportWidth: number, viewportHeight: number): MobileMainLayoutProfile {
    const minSide = Math.min(viewportWidth, viewportHeight);
    const aspect = viewportWidth / Math.max(1, viewportHeight);
    const compact = aspect >= 1 && (sys.isMobile || (aspect >= 1.45 && minSide <= 820));
    if (!compact) {
      return {
        compact: false,
        marginRatio: 0.045,
        chromeScale: 1,
        sideCardScale: 1,
        stageInsetScale: 1,
      };
    }

    const heightPressure = Math.max(0, Math.min(1, (760 - minSide) / 340));
    return {
      compact: true,
      marginRatio: 0.008 + heightPressure * 0.006,
      chromeScale: 0.72 - heightPressure * 0.05,
      sideCardScale: 0.58 - heightPressure * 0.04,
      stageInsetScale: 0.46,
    };
  }

  private resolveLayout(): MainLayout {
    const visible = view.getVisibleSize();
    const viewportWidth = visible.width || FALLBACK_VIEWPORT.width;
    const viewportHeight = visible.height || FALLBACK_VIEWPORT.height;
    const viewportAspect = viewportWidth / Math.max(1, viewportHeight);
    const mobileProfile = this.resolveMobileMainLayoutProfile(viewportWidth, viewportHeight);

    // 根据当前可视区比例，决定壳层在屏幕里的横竖向倾向。
    // 这里的目标不是撑满屏幕，而是先把壳体放到一个“看起来舒服”的上限里。
    const shellAspect = this.resolveShellAspect(viewportAspect);
    const isPortrait = viewportAspect < 1;
    const margin = Math.max(
      isPortrait ? 10 : mobileProfile.compact ? 8 : 20,
      Math.round(Math.min(viewportWidth, viewportHeight) * (isPortrait ? 0.016 : mobileProfile.marginRatio))
    );
    const maxShellWidth = viewportWidth - margin * 2;
    const maxShellHeight = viewportHeight - margin * 2;

    let shellWidth = maxShellWidth;
    let shellHeight = shellWidth / shellAspect;
    if (shellHeight > maxShellHeight) {
      shellHeight = maxShellHeight;
      shellWidth = shellHeight * shellAspect;
    }

    // 这里的 safe inset 是给内部内容预留的“软边界”。
    // 它不是业务安全区，而是为了让舞台里后续摆内容时有缓冲，不会紧贴壳边。
    const safeInsetX = Math.max(20, Math.round(shellWidth * 0.056));
    const safeInsetY = Math.max(18, Math.round(shellHeight * 0.06));
    const safeWidth = shellWidth - safeInsetX * 2;
    const safeHeight = shellHeight - safeInsetY * 2;
    const buttonSize = Math.max(76, Math.min(140, Math.round(Math.min(safeWidth, safeHeight) * 0.16)));
    const buttonInset = Math.max(14, Math.round(buttonSize * 0.22));

    return {
      viewportWidth,
      viewportHeight,
      shellWidth,
      shellHeight,
      buttonSize,
      buttonX: safeWidth * 0.5 - buttonSize * 0.5 - buttonInset,
      buttonY: safeHeight * 0.5 - buttonSize * 0.5 - buttonInset,
    };
  }

  private resolveShellAspect(viewportAspect: number): number {
    if (viewportAspect <= PORTRAIT_VIEWPORT_ASPECT) {
      const progress = Math.max(0, Math.min(1, (viewportAspect - 0.46) / (PORTRAIT_VIEWPORT_ASPECT - 0.46)));
      return PORTRAIT_SHELL_ASPECT + (BREAKPOINTS[0] - PORTRAIT_SHELL_ASPECT) * progress;
    }

    for (let index = 0; index < BREAKPOINTS.length - 1; index += 1) {
      const current = BREAKPOINTS[index];
      const next = BREAKPOINTS[index + 1];
      if (viewportAspect <= next) {
        const progress = (viewportAspect - current) / (next - current);
        return current + (next - current) * progress;
      }
    }

    return BREAKPOINTS[BREAKPOINTS.length - 1];
  }

  private renderBackdrop(root: Node, layout: MainLayout): void {
    this.ensureBackgroundAssetsLoaded();

    // 背景层只负责大画布氛围，不参与主舞台的结构本身。
    // 这里的背景开关是给调试和人工验收用的。
    if (this.showBackgroundGradient && this.assetStore.backgroundGradientSpriteFrame) {
      RuntimeUI.createSpriteFrame(root, {
        name: "CanvasBackdropGradientLut",
        x: 0,
        y: 0,
        width: layout.viewportHeight,
        height: layout.viewportWidth,
        spriteFrame: this.assetStore.backgroundGradientSpriteFrame,
        rotation: -90,
      });
    }

    if (this.showBackgroundGlowTopLeft && this.assetStore.backgroundGlowTopLeftSpriteFrame) {
      const size = Math.max(420, layout.viewportWidth * 0.46);
      RuntimeUI.createSpriteFrame(root, {
        name: "CanvasBackdropGlowTopLeft",
        x: -layout.viewportWidth * 0.34,
        y: layout.viewportHeight * 0.28,
        width: size,
        height: size,
        spriteFrame: this.assetStore.backgroundGlowTopLeftSpriteFrame,
        material: this.createRadialGlowMaterial(),
      });
    }

    if (this.showBackgroundGlowBottomRight && this.assetStore.backgroundGlowBottomRightSpriteFrame) {
      const size = Math.max(480, layout.viewportHeight * 0.72);
      RuntimeUI.createSpriteFrame(root, {
        name: "CanvasBackdropGlowBottomRight",
        x: layout.viewportWidth * 0.36,
        y: -layout.viewportHeight * 0.32,
        width: size,
        height: size,
        spriteFrame: this.assetStore.backgroundGlowBottomRightSpriteFrame,
        material: this.createRadialGlowMaterial(),
      });
    }
  }

  private ensureBackgroundAssetsLoaded(): void {
    this.assetStore.ensureMainAssetsLoaded(this.petAnimator);
  }


  private ensureShellShadowAssetsForLayout(options: {
    shellWidth: number;
    shellHeight: number;
    shellRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.shellWidth,
      options.shellHeight,
      options.shellRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.shellShadowLayoutKey !== layoutKey) {
      this.shellShadowLayoutKey = layoutKey;
      this.shellShadowSpriteFrame = this.proceduralTextureFactory.createLayoutShellShadowSpriteFrame({
        shellWidth: options.shellWidth,
        shellHeight: options.shellHeight,
        spread: options.spread,
        radius: options.shellRadius,
        sigmaFar: Math.max(6, options.spread * 0.34),
        sigmaNear: Math.max(3, options.spread * 0.16),
        strength: 0.22,
      });
    }
  }

  private ensureMainViewportShadowAssetsForLayout(options: {
    viewportWidth: number;
    viewportHeight: number;
    viewportRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.viewportWidth,
      options.viewportHeight,
      options.viewportRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.mainViewportShadowLayoutKey !== layoutKey) {
      this.mainViewportShadowLayoutKey = layoutKey;
      this.mainViewportShadowSpriteFrame = this.proceduralTextureFactory.createLayoutShellShadowSpriteFrame({
        shellWidth: options.viewportWidth,
        shellHeight: options.viewportHeight,
        spread: options.spread,
        radius: options.viewportRadius,
        sigmaFar: Math.max(5, options.spread * 0.3),
        sigmaNear: Math.max(2.5, options.spread * 0.14),
        strength: 0.16,
      });
    }
  }

  private ensureTopBarShadowAssetsForLayout(options: {
    topBarWidth: number;
    topBarHeight: number;
    topBarRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.topBarWidth,
      options.topBarHeight,
      options.topBarRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.topBarShadowLayoutKey !== layoutKey) {
      this.topBarShadowLayoutKey = layoutKey;
      this.topBarShadowSpriteFrame = this.proceduralTextureFactory.createLayoutShellShadowSpriteFrame({
        shellWidth: options.topBarWidth,
        shellHeight: options.topBarHeight,
        spread: options.spread,
        radius: options.topBarRadius,
        sigmaFar: Math.max(5, options.spread * 0.32),
        sigmaNear: Math.max(2.5, options.spread * 0.14),
        strength: 0.16,
      });
    }
  }

  private ensureBottomDockShadowAssetsForLayout(options: {
    bottomDockWidth: number;
    bottomDockHeight: number;
    bottomDockRadius: number;
    spread: number;
  }): void {
    const layoutKey = [
      options.bottomDockWidth,
      options.bottomDockHeight,
      options.bottomDockRadius,
      options.spread,
      "centered",
    ].join(":");
    if (this.bottomDockShadowLayoutKey !== layoutKey) {
      this.bottomDockShadowLayoutKey = layoutKey;
      this.bottomDockShadowSpriteFrame = this.proceduralTextureFactory.createLayoutShellShadowSpriteFrame({
        shellWidth: options.bottomDockWidth,
        shellHeight: options.bottomDockHeight,
        spread: options.spread,
        radius: options.bottomDockRadius,
        sigmaFar: Math.max(5, options.spread * 0.32),
        sigmaNear: Math.max(2.5, options.spread * 0.14),
        strength: 0.16,
      });
    }
  }

  private createRadialGlowMaterial(): Material | undefined {
    if (!this.assetStore.radialGlowEffectAsset) {
      return undefined;
    }

    const material = new Material();
    material.initialize({
      effectAsset: this.assetStore.radialGlowEffectAsset,
    });
    return material;
  }

  private createButtonGradientMaterial(options?: {
    shapeRect?: Vec4;
    topColor?: Color;
    bottomColor?: Color;
    glossColor?: Color;
    glossRange?: Vec4;
  }): Material | undefined {
    if (!this.assetStore.buttonGradientEffectAsset) {
      return undefined;
    }

    const material = new Material();
    material.initialize({
      effectAsset: this.assetStore.buttonGradientEffectAsset,
    });
    const topColor =
      options?.topColor ??
      new Color(
        Math.round(this.getArtTuningValue("topBarNavTopColorR")),
        Math.round(this.getArtTuningValue("topBarNavTopColorG")),
        Math.round(this.getArtTuningValue("topBarNavTopColorB")),
        255
      );
    const bottomColor =
      options?.bottomColor ??
      new Color(
        Math.round(this.getArtTuningValue("topBarNavBottomColorR")),
        Math.round(this.getArtTuningValue("topBarNavBottomColorG")),
        Math.round(this.getArtTuningValue("topBarNavBottomColorB")),
        255
      );
    const glossColor =
      options?.glossColor ??
      new Color(255, 249, 231, Math.round(this.getArtTuningValue("topBarNavMaterialGlossAlpha")));
    material.setProperty("shapeRect", options?.shapeRect ?? new Vec4(-60, -24, 120, 48));
    material.setProperty("topColor", topColor);
    material.setProperty("bottomColor", bottomColor);
    material.setProperty("glossColor", glossColor);
    material.setProperty("glossRange", options?.glossRange ?? new Vec4(0.66, 0.98, 0.15, 0));
    return material;
  }

  private resolveSpriteWorldRect(node: Node, width: number, height: number): Vec4 {
    node.updateWorldTransform();
    const world = node.worldPosition as Readonly<Vec3>;
    return new Vec4(world.x - width * 0.5, world.y - height * 0.5, width, height);
  }

  private getButtonGradientCarrierSpriteFrame(): SpriteFrame | null {
    return this.proceduralTextureFactory.getWhiteSpriteFrame();
  }

  private createCloudSoftMaterial(options: {
    width: number;
    height: number;
    circleA: Vec4;
    circleB: Vec4;
    feather: number;
    color: Color;
  }): Material | undefined {
    if (!this.assetStore.cloudSoftEffectAsset) {
      return undefined;
    }

    const material = new Material();
    material.initialize({
      effectAsset: this.assetStore.cloudSoftEffectAsset,
    });

    material.setProperty("cloudColor", options.color);
    material.setProperty("shapeSize", new Vec4(options.width, options.height, 0, 0));
    material.setProperty("circleA", options.circleA);
    material.setProperty("circleB", options.circleB);
    material.setProperty("cloudParams", new Vec4(options.feather, 0, 0, 0));

    return material;
  }

  private renderBackgroundDebugEntry(root: Node, layout: MainLayout): void {
    if (this.shouldDisableArtDebugOnNative()) {
      if (!this.artDebugNativeSkipLogged) {
        this.artDebugNativeSkipLogged = true;
        devActionLogger.warn("main.renderBackgroundDebugEntry.skip.native", {
          reason: "art debug entry is disabled on Android native",
        });
      }
      return;
    }
    const right = layout.viewportWidth / 2 - 24;
    const top = layout.viewportHeight / 2 - 24;
    const entryX = right - DEBUG_ENTRY_SIZE / 2;
    const entryY = top - DEBUG_ENTRY_SIZE / 2;

    const { node, button } = RuntimeUI.createButton(root, {
      name: "DebugPanelEntry",
      text: "",
      x: entryX,
      y: entryY,
      width: DEBUG_ENTRY_SIZE,
      height: DEBUG_ENTRY_SIZE,
      color: this.showBackgroundDebugPanel
        ? new Color(220, 56, 45, 230)
        : new Color(220, 56, 45, 150),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 1,
      radius: DEBUG_ENTRY_SIZE / 2,
    });

    button.transition = Button.Transition.NONE;
    node.on(
      Button.EventType.CLICK,
      () => {
        this.showBackgroundDebugPanel = !this.showBackgroundDebugPanel;
        this.render();
      },
      this
    );

    if (this.showBackgroundDebugPanel) {
      this.renderBackgroundDebugPanel(root, right, entryY - DEBUG_ENTRY_SIZE / 2 - DEBUG_TOGGLE_GAP);
    }
  }

  private renderDevLogEntryIfEnabled(root: Node, layout: MainLayout): void {
    if (!isDiagnosticsEnabled()) {
      this.isDevLogOpen = false;
      return;
    }
    this.renderDevLogEntry(root, layout);
  }

  private renderDevLogEntry(root: Node, layout: MainLayout): void {
    const left = -layout.viewportWidth / 2 + 24;
    const top = layout.viewportHeight / 2 - 24 - DEV_LOG_TOP_OFFSET;
    const buttonWidth = 74;
    const buttonHeight = 30;
    const panelWidth = Math.max(320, Math.min(620, layout.viewportWidth - 48));
    const panelHeight = Math.max(180, Math.min(300, layout.viewportHeight - 120));

    const { node, button } = RuntimeUI.createButton(root, {
      name: "DevActionLogEntry",
      text: "Log",
      x: left + buttonWidth / 2,
      y: top - buttonHeight / 2,
      width: buttonWidth,
      height: buttonHeight,
      color: this.isDevLogOpen
        ? new Color(18, 74, 118, 230)
        : new Color(18, 34, 54, 190),
      textColor: new Color(232, 246, 255, 255),
      fontSize: 14,
      radius: 8,
    });
    button.transition = Button.Transition.NONE;
    node.on(
      Button.EventType.CLICK,
      () => {
        this.isDevLogOpen = !this.isDevLogOpen;
        devActionLogger.info("main.devLog.toggle", this.isDevLogOpen ? "open" : "close");
        this.render();
      },
      this
    );

    if (!this.isDevLogOpen) {
      return;
    }

    RuntimeUI.createScrollText(root, {
      name: "DevActionLogPanel",
      text: devActionLogger.formatRecent(36),
      x: left + panelWidth / 2,
      y: top - buttonHeight - 12 - panelHeight / 2,
      width: panelWidth,
      height: panelHeight,
      fontSize: 14,
      color: new Color(232, 246, 255, 255),
      backgroundColor: new Color(8, 15, 24, 238),
      padding: 14,
      radius: 8,
      elastic: false,
      startAtTop: true,
    });
  }

  private renderBackgroundDebugPanel(root: Node, right: number, top: number): void {
    const panelX = right - DEBUG_PANEL_WIDTH / 2;
    const panelY = top - DEBUG_PANEL_HEIGHT / 2;

    RuntimeUI.createBox(root, {
      name: "DebugPanelShadow",
      x: panelX + 4,
      y: panelY - 5,
      width: DEBUG_PANEL_WIDTH,
      height: DEBUG_PANEL_HEIGHT,
      color: new Color(103, 67, 42, 45),
      radius: 20,
    });

    const panel = RuntimeUI.createBox(root, {
      name: "DebugPanel",
      x: panelX,
      y: panelY,
      width: DEBUG_PANEL_WIDTH,
      height: DEBUG_PANEL_HEIGHT,
      color: new Color(255, 247, 237, 238),
      radius: 20,
    });

    RuntimeUI.createBox(panel, {
      name: "DebugPanelInner",
      x: 0,
      y: 0,
      width: DEBUG_PANEL_WIDTH - 4,
      height: DEBUG_PANEL_HEIGHT - 4,
      color: new Color(255, 255, 255, 60),
      radius: 18,
    });

    RuntimeUI.createLabel(panel, {
      name: "DebugPanelTitle",
      text: "测试面板",
      x: 0,
      y: DEBUG_PANEL_HEIGHT / 2 - 28,
      width: DEBUG_PANEL_WIDTH - 28,
      height: 28,
      fontSize: 17,
      color: new Color(94, 61, 39, 255),
    });

    RuntimeUI.createLabel(panel, {
      name: "DebugPanelSubtitle",
      text: "背景开关 / shader 调试 / 参考页 / 美术调参",
      x: 0,
      y: DEBUG_PANEL_HEIGHT / 2 - 50,
      width: DEBUG_PANEL_WIDTH - 30,
      height: 18,
      fontSize: 11,
      color: new Color(147, 113, 88, 220),
    });

    const startY = DEBUG_PANEL_HEIGHT / 2 - 84;

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleGradient",
      `渐变底色 ${this.showBackgroundGradient ? "ON" : "OFF"}`,
      0,
      startY,
      this.showBackgroundGradient,
      () => {
        this.showBackgroundGradient = !this.showBackgroundGradient;
        this.render();
      }
    );

    this.renderBackgroundDebugToggle(
      panel,
      "DebugToggleShaderDebugBlock",
      `Shader测试块 ${this.showShaderDebugBlock ? "ON" : "OFF"}`,
      0,
      startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP),
      this.showShaderDebugBlock,
      () => {
        this.showShaderDebugBlock = !this.showShaderDebugBlock;
        this.render();
      }
    );

    const { node, button } = RuntimeUI.createButton(panel, {
      name: "DebugOpenReferencePage",
      text: "参考页面",
      x: 0,
      y: startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 2,
      width: DEBUG_TOGGLE_WIDTH,
      height: DEBUG_TOGGLE_HEIGHT,
      color: new Color(94, 61, 39, 172),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 15,
      radius: 17,
    });

    button.transition = Button.Transition.NONE;
    node.on(Button.EventType.CLICK, this.openReferencePage, this);

    const artDebugButton = RuntimeUI.createButton(panel, {
      name: "DebugOpenArtTuningPage",
      text: "美术调参页",
      x: 0,
      y: startY - (DEBUG_TOGGLE_HEIGHT + DEBUG_TOGGLE_GAP) * 3,
      width: DEBUG_TOGGLE_WIDTH,
      height: DEBUG_TOGGLE_HEIGHT,
      color: new Color(247, 155, 52, 214),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 15,
      radius: 17,
    });

    artDebugButton.button.transition = Button.Transition.NONE;
    artDebugButton.node.on(Button.EventType.CLICK, this.openArtDebugPage, this);
  }

  private renderBackgroundDebugToggles(root: Node, layout: MainLayout): void {
    const right = layout.viewportWidth / 2 - 24;
    const top = layout.viewportHeight / 2 - 24;
    const startY = top - DEBUG_TOGGLE_HEIGHT / 2;
    const centerX = right - DEBUG_TOGGLE_WIDTH / 2;

    this.renderBackgroundDebugToggle(
      root,
      "DebugToggleGradient",
      `渐变底色 ${this.showBackgroundGradient ? "ON" : "OFF"}`,
      centerX,
      startY,
      this.showBackgroundGradient,
      () => {
        this.showBackgroundGradient = !this.showBackgroundGradient;
        this.render();
      }
    );
  }

  private renderBackgroundDebugToggle(
    root: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    enabled: boolean,
    onClick: () => void
  ): void {
    const { node, button } = RuntimeUI.createButton(root, {
      name,
      text,
      x,
      y,
      width: DEBUG_TOGGLE_WIDTH,
      height: DEBUG_TOGGLE_HEIGHT,
      color: enabled ? new Color(247, 155, 52, 235) : new Color(110, 74, 51, 150),
      textColor: new Color(255, 255, 255, 255),
      fontSize: 15,
      radius: 17,
    });

    button.transition = Button.Transition.NONE;
    node.on(Button.EventType.CLICK, onClick, this);
  }

  private renderShell(root: Node, layout: MainLayout): Node {
    const shellWidth = Math.round(layout.shellWidth);
    const shellHeight = Math.round(layout.shellHeight);

    // 壳层本体的缩放跟随视口变化，但会被限制在一个较窄的范围里，
    // 避免它在特别窄或特别宽的屏幕上突然变得太小或太满。
    const shellScale = Math.max(0.72, Math.min(1.16, shellWidth / APP_SHELL_REFERENCE_WIDTH));
    const shellRadius = Math.round(APP_SHELL_RADIUS * shellScale);
    const borderWidth = 2; //边框宽度，shell，mainstage的内外边框都共享这个宽度
    const shellInnerRadius = Math.max(0, shellRadius - borderWidth);
    const shellInnerWidth = Math.max(0, shellWidth - borderWidth * 2);
    const shellInnerHeight = Math.max(0, shellHeight - borderWidth * 2);
    const shadowBase = Math.min(shellWidth, shellHeight);
    const shadowSpread = Math.max(18, Math.round(shadowBase * 0.036));

    const shellContentHost = new Node("AppShellContentHost");
    shellContentHost.setParent(root);
    shellContentHost.setPosition(0, 0, 0);
    const shellContentTransform = shellContentHost.getComponent(UITransform) ?? shellContentHost.addComponent(UITransform);
    shellContentTransform.setContentSize(shellInnerWidth, shellInnerHeight);

    // 先准备整块壳层的阴影贴图。
    // 这一步的目的不是做复杂特效，而是让壳层看起来像“浮在背景上”，
    // 而不是死贴在页面底部。
    this.ensureShellShadowAssetsForLayout({
      shellWidth,
      shellHeight,
      shellRadius,
      spread: shadowSpread,
    });

    if (this.showShellLayer) {
      if (this.shellShadowSpriteFrame) {
        RuntimeUI.createSpriteFrame(root, {
          name: "AppShellShadow",
          x: 0,
          y: 0,
          width: shellWidth + shadowSpread * 2,
          height: shellHeight + shadowSpread * 2,
          spriteFrame: this.shellShadowSpriteFrame,
          color: new Color(SHELL_SHADOW_COLOR.r, SHELL_SHADOW_COLOR.g, SHELL_SHADOW_COLOR.b, 75),
        });
      } else {
        RuntimeUI.createBox(root, {
          name: "AppShellShadowFallback",
          x: 0,
          y: 0,
          width: shellWidth + Math.round(10 * shellScale),
          height: shellHeight + Math.round(10 * shellScale),
          color: new Color(187, 129, 62, 10),
          radius: shellRadius,
        });
      }

      RuntimeUI.createBox(root, {
        name: "AppShellBorder",
        x: 0,
        y: 0,
        width: shellWidth,
        height: shellHeight,
        color: new Color(234, 207, 180, 255),
        radius: shellRadius,
      });

      const shellSurface = RuntimeUI.createBox(root, {
        name: "AppShellSurface",
        x: 0,
        y: 0,
        width: shellInnerWidth,
        height: shellInnerHeight,
        color: new Color(251, 242, 232, 255),
        radius: shellInnerRadius,
      });

      if (this.assetStore.backgroundGradientSpriteFrame) {
        const gradientMask = new Node("AppShellGradientMask");
        gradientMask.setParent(shellSurface);
        const gradientMaskTransform = gradientMask.addComponent(UITransform);
        gradientMaskTransform.setContentSize(shellInnerWidth, shellInnerHeight);
        const gradientMaskComponent = gradientMask.addComponent(Mask);
        gradientMaskComponent.type = Mask.Type.GRAPHICS_STENCIL;
        gradientMaskComponent.inverted = false;
        const maskGraphics = this.getGraphicsMaskSubComp(gradientMaskComponent);
        if (maskGraphics) {
          maskGraphics.clear();
          maskGraphics.fillColor = Color.WHITE;
          maskGraphics.roundRect(
            -shellInnerWidth / 2,
            -shellInnerHeight / 2,
            shellInnerWidth,
            shellInnerHeight,
            shellInnerRadius
          );
          maskGraphics.fill();

          RuntimeUI.createSpriteFrame(gradientMask, {
            name: "AppShellSurfaceGradient",
            x: 0,
            y: 0,
            width: shellInnerHeight + SHELL_SURFACE_GRADIENT_OVERSCAN * 2,
            height: shellInnerWidth + SHELL_SURFACE_GRADIENT_OVERSCAN * 2,
            spriteFrame: this.assetStore.backgroundGradientSpriteFrame,
            rotation: -90,
            color: new Color(255, 255, 255, 110),
          });
        }
      }
    }

    shellContentHost.setSiblingIndex(root.children.length - 1);

    // 主舞台层在壳层内部生成，但骨架内容是否显示是单独控制的。
    // 当前这一步只负责把“承载结构”搭出来，不把舞台骨架塞满。
    this.renderMainStageLayer(shellContentHost, shellWidth, shellHeight, borderWidth);
    return shellContentHost;
  }

  private renderParentHome(root: Node, layout: MainLayout): void {
    const panelWidth = Math.max(620, Math.min(900, Math.round(layout.viewportWidth * 0.72)));
    const panelHeight = Math.max(470, Math.min(620, Math.round(layout.viewportHeight * 0.78)));
    const user = appState.getCurrentUser();
    const childLabel = user?.childNickname || user?.childId || "未绑定";
    const panel = RuntimeUI.createCard(root, {
      name: "ParentHomePanel",
      x: 0,
      y: 0,
      width: panelWidth,
      height: panelHeight,
      color: new Color(235, 207, 180, 238),
      innerColor: new Color(255, 252, 247, 246),
      radius: 28,
      borderThickness: 2,
      innerRadius: 24,
    });

    RuntimeUI.createLabel(panel, {
      name: "ParentHomeTitle",
      text: "家长中心",
      x: -panelWidth / 2 + 96,
      y: panelHeight / 2 - 58,
      width: 180,
      height: 36,
      fontSize: 28,
      color: new Color(98, 66, 46, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createLabel(panel, {
      name: "ParentHomeSubtitle",
      text: `账号：${user?.username ?? "家长"}    已绑定：${childLabel}`,
      x: 0,
      y: panelHeight / 2 - 94,
      width: panelWidth - 86,
      height: 24,
      fontSize: 16,
      color: new Color(126, 93, 69, 232),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    const bindRowY = panelHeight / 2 - 148;
    const input = RuntimeUI.createEditBox(panel, {
      name: "ParentBindChildInput",
      placeholder: "输入孩子用户名或 childId",
      defaultValue: user?.childNickname ?? "",
      x: -panelWidth / 2 + 235,
      y: bindRowY,
      width: Math.max(280, Math.round(panelWidth * 0.45)),
      height: 46,
      maxLength: 64,
      multiline: false,
      radius: 18,
      backgroundColor: new Color(255, 246, 237, 255),
      textColor: new Color(98, 66, 46, 255),
      placeholderColor: new Color(156, 123, 99, 210),
    });
    this.parentBindInput = input.editBox;

    const bindButton = RuntimeUI.createButton(panel, {
      name: "ParentBindChildButton",
      text: this.parentBinding ? "绑定中" : "绑定孩子",
      x: panelWidth / 2 - 135,
      y: bindRowY,
      width: 150,
      height: 44,
      color: this.parentBinding ? new Color(140, 119, 101, 255) : new Color(49, 180, 113, 255),
      fontSize: 17,
      radius: 20,
    });
    bindButton.node.on(Button.EventType.CLICK, () => void this.handleParentBindChild(), this);

    RuntimeUI.createLabel(panel, {
      name: "ParentNotice",
      text: this.parentNotice || "绑定后可查看孩子宠物状态和本周学习概览。",
      x: 0,
      y: bindRowY - 48,
      width: panelWidth - 86,
      height: 28,
      fontSize: 15,
      color: this.parentNotice ? new Color(247, 155, 52, 255) : new Color(156, 123, 99, 220),
    });

    const actionY = bindRowY - 88;
    const overviewButton = RuntimeUI.createButton(panel, {
      name: "ParentOverviewButton",
      text: this.parentOverviewLoading ? "加载中" : "查看孩子宠物",
      x: -165,
      y: actionY,
      width: 170,
      height: 44,
      color: new Color(126, 148, 240, 235),
      fontSize: 16,
      radius: 20,
    });
    overviewButton.node.on(Button.EventType.CLICK, () => void this.handleParentLoadOverview(), this);

    const reportButton = RuntimeUI.createButton(panel, {
      name: "ParentReportButton",
      text: this.parentReportLoading ? "加载中" : "查看周报",
      x: 30,
      y: actionY,
      width: 150,
      height: 44,
      color: new Color(247, 155, 52, 235),
      fontSize: 16,
      radius: 20,
    });
    reportButton.node.on(Button.EventType.CLICK, () => void this.handleParentLoadReport(), this);

    const refreshButton = RuntimeUI.createButton(panel, {
      name: "ParentRefreshButton",
      text: "刷新",
      x: 195,
      y: actionY,
      width: 100,
      height: 44,
      color: new Color(49, 180, 113, 220),
      fontSize: 16,
      radius: 20,
    });
    refreshButton.node.on(Button.EventType.CLICK, () => void this.handleParentRefreshAll(), this);

    const logoutButton = RuntimeUI.createButton(panel, {
      name: "ParentLogoutButton",
      text: "退出登录",
      x: panelWidth / 2 - 100,
      y: -panelHeight / 2 + 42,
      width: 130,
      height: 38,
      color: new Color(140, 119, 101, 230),
      fontSize: 15,
      radius: 18,
    });
    logoutButton.node.on(Button.EventType.CLICK, () => this.handleParentLogout(), this);

    const contentText = [this.parentOverviewText, this.parentReportText].filter(Boolean).join("\n\n");
    RuntimeUI.createScrollText(panel, {
      name: "ParentResultText",
      text: contentText || "暂无数据。请先绑定孩子账号，然后选择要查看的内容。",
      x: 0,
      y: -panelHeight / 2 + 142,
      width: panelWidth - 86,
      height: Math.max(150, panelHeight - 318),
      backgroundColor: new Color(255, 246, 237, 255),
      color: new Color(98, 66, 46, 255),
      fontSize: 16,
      radius: 20,
    });
  }

  private async handleParentBindChild(): Promise<void> {
    if (this.parentBinding) {
      return;
    }
    const childIdentifier = this.parentBindInput?.string.trim() ?? "";
    if (!childIdentifier) {
      this.parentNotice = "请先输入孩子用户名或 childId。";
      this.render();
      return;
    }

    this.parentBinding = true;
    this.parentNotice = "正在绑定孩子账号...";
    this.render();
    try {
      const result = await parentService.bindChild(childIdentifier);
      if (result.success) {
        appState.patchCurrentUser({
          childId: result.data?.childId ?? childIdentifier,
          childNickname: result.data?.childNickname ?? childIdentifier,
        });
        this.parentNotice = "绑定成功，正在刷新孩子信息。";
        this.parentOverviewText = "";
        this.parentReportText = "";
        void this.handleParentLoadOverview();
      } else {
        this.parentNotice = result.message ?? "绑定失败，请检查孩子账号。";
      }
    } catch {
      this.parentNotice = "绑定请求失败，请确认后端服务可访问。";
    } finally {
      this.parentBinding = false;
      this.render();
    }
  }

  private async handleParentLoadOverview(): Promise<void> {
    if (this.parentOverviewLoading) {
      return;
    }
    this.parentOverviewLoading = true;
    this.parentNotice = "正在读取孩子宠物状态...";
    this.render();
    try {
      const result = await parentService.getChildOverview();
      if (result.success && result.data) {
        this.parentOverviewData = result.data;
        this.parentOverviewText = this.formatParentOverviewText(result.data);
        this.parentNotice = "孩子宠物状态已更新。";
      } else {
        this.parentNotice = result.message ?? "孩子宠物状态加载失败。";
      }
    } catch {
      this.parentNotice = "孩子宠物状态请求失败。";
    } finally {
      this.parentOverviewLoading = false;
      this.render();
    }
  }

  private async handleParentLoadReport(): Promise<void> {
    if (this.parentReportLoading) {
      return;
    }
    this.parentReportLoading = true;
    this.parentNotice = "正在读取本周报告...";
    this.render();
    try {
      const result = await parentService.getWeeklyReport();
      if (result.success && result.data) {
        this.parentReportData = result.data;
        this.parentReportText = this.formatParentReportText(result.data);
        this.parentNotice = "本周报告已更新。";
      } else {
        this.parentNotice = result.message ?? "本周报告加载失败。";
      }
    } catch {
      this.parentNotice = "本周报告请求失败。";
    } finally {
      this.parentReportLoading = false;
      this.render();
    }
  }

  private async handleParentRefreshAll(): Promise<void> {
    await this.handleParentLoadOverview();
    await this.handleParentLoadReport();
  }

  private handleParentLogout(): void {
    this.returnToLogin();
  }

  public returnToLogin(): void {
    devActionLogger.info("main.returnToLogin");
    authService.logout();
    sceneRouter.goToLogin();
  }

  private formatParentOverviewText(data: ChildPetPayload): string {
    const pet = data.pet;
    const homework = Object.entries(data.today_homework ?? {})
      .map(([subject, item]) => `${subject}: ${item?.score ?? "未提交"}`)
      .join(" / ");
    return [
      "孩子宠物",
      `昵称：${data.childNickname ?? data.childId ?? "孩子"}`,
      `宠物：${pet.name}  Lv.${pet.level}`,
      `饥饿：${pet.hunger}  心情：${pet.mood}  经验：${pet.experience ?? 0}`,
      `阶段：${pet.stage ?? "未知"}  状态：${pet.status ? "在线" : "离线"}`,
      `今日作业：${homework || "暂无记录"}`,
    ].join("\n");
  }

  private formatParentReportText(data: WeeklyReportPayload): string {
    const breakdown = Object.entries(data.subject_breakdown ?? {})
      .map(([subject, item]) => `${subject}: ${item.count} 次 / 平均 ${Math.round(item.avg)}`)
      .join("；");
    const pet = data.pet_status_summary;
    return [
      "本周报告",
      `周次：${data.week}`,
      `作业总数：${data.total_homework}`,
      `平均分：${Math.round(data.average_score)}`,
      `科目：${breakdown || "暂无科目数据"}`,
      pet ? `宠物概览：饥饿 ${pet.hunger ?? "-"} / 心情 ${pet.mood ?? "-"} / 阶段 ${pet.stage ?? "-"}` : "宠物概览：暂无",
    ].join("\n");
  }

  private renderParentHomeV2(root: Node, layout: MainLayout): void {
    this.parentBindInput = null;
    renderParentDashboardPanel({
      root,
      layout,
      state: {
        user: appState.getCurrentUser(),
        linkedChildId: appState.getLinkedChildId(),
        notice: this.parentNotice,
        overviewLoading: this.parentOverviewLoading,
        reportLoading: this.parentReportLoading,
        completion: this.resolveParentHomeworkCompletion(),
        overviewData: this.parentOverviewData,
        reportData: this.parentReportData,
      },
      callbacks: {
        resolveChildDisplayName: (childLabel) => this.resolveParentChildDisplayName(childLabel),
        resolveChildMetaText: (childLabel) => this.resolveParentChildMetaText(childLabel),
        resolveColumnLayout: (contentWidth, gap) =>
          resolveParentDashboardColumnLayout({
            contentWidth,
            gap,
            expandedColumn: this.parentExpandedColumn,
            animationFrom: this.parentColumnAnimationFrom,
            animationTo: this.parentColumnAnimationTo,
            animationStart: this.parentColumnAnimationStart,
            now: Date.now(),
          }),
        onRefresh: () => void this.handleParentRefreshAll(),
        onLogout: () => this.handleParentLogout(),
        renderRingProgress: (parent, options) => this.renderParentRingProgress(parent, options),
        renderBindEmptyState: (parent, contentWidth, panelHeight, y) =>
          this.renderParentBindEmptyState(parent, contentWidth, panelHeight, y),
        renderPetGrowthPanel: (parent, options) =>
          renderParentPetGrowthPanel(parent, options, {
            overviewData: this.parentOverviewData,
            evolutionHint: this.resolveParentEvolutionHint(),
            formatPetStage: (stage) => this.formatPetStage(stage),
            installColumnClick: (card, column) => this.installParentColumnClick(card, column),
          }),
        renderInsightScroll: (parent, options) =>
          renderParentInsightScroll(parent, options, {
            rows: this.buildParentInsightRows(),
            installColumnClick: (card, column) => this.installParentColumnClick(card, column),
          }),
        renderHomeworkPanel: (parent, options) =>
          renderParentHomeworkPanel(parent, options, {
            reportData: this.parentReportData,
            reportScores: this.resolveParentReportScores(),
            subjectBreakdown: this.resolveParentSubjectBreakdown(),
            installColumnClick: (card, column) => this.installParentColumnClick(card, column),
          }),
      },
    });
  }

  private installParentColumnClick(card: Node, column: "pet" | "insight" | "homework"): void {
    const button = card.getComponent(Button) ?? card.addComponent(Button);
    button.transition = Button.Transition.NONE;
    card.on(Button.EventType.CLICK, () => this.toggleParentColumn(column), this);
  }

  private toggleParentColumn(column: "pet" | "insight" | "homework"): void {
    const now = Date.now();
    if (now - this.parentColumnLastToggleAt < 80) {
      return;
    }
    this.parentColumnLastToggleAt = now;
    const nextColumn = this.parentExpandedColumn === column ? null : column;
    this.startParentColumnAnimation(nextColumn);
  }

  private startParentColumnAnimation(nextColumn: "pet" | "insight" | "homework" | null): void {
    this.cancelParentColumnAnimation();
    this.parentColumnAnimationFrom = this.parentExpandedColumn;
    this.parentColumnAnimationTo = nextColumn;
    this.parentExpandedColumn = nextColumn;
    this.parentColumnAnimationStart = Date.now();
    const step = (): void => {
      const progress = resolveParentColumnAnimationProgress(this.parentColumnAnimationStart, Date.now());
      this.render();
      if (progress < 1 && typeof window !== "undefined" && typeof window.requestAnimationFrame === "function") {
        this.parentColumnAnimationFrame = window.requestAnimationFrame(step);
        return;
      }
      this.parentColumnAnimationFrame = null;
      this.parentColumnAnimationFrom = nextColumn;
      this.parentColumnAnimationTo = nextColumn;
      this.parentColumnAnimationStart = 0;
      this.render();
    };
    step();
  }

  private cancelParentColumnAnimation(): void {
    if (this.parentColumnAnimationFrame !== null && typeof window !== "undefined") {
      window.cancelAnimationFrame(this.parentColumnAnimationFrame);
    }
    this.parentColumnAnimationFrame = null;
  }

  private renderParentBindEmptyState(parent: Node, contentWidth: number, panelHeight: number, y: number): void {
    const cardHeight = Math.max(260, Math.round(panelHeight * 0.38));
    const card = RuntimeUI.createCard(parent, {
      name: "ParentBindEmptyStateV2",
      x: 0,
      y: y - cardHeight / 2,
      width: contentWidth,
      height: cardHeight,
      color: UiTokens.colors.borderSoft,
      innerColor: UiTokens.colors.bgSecondary,
      radius: UiTokens.radii.cardLG,
      borderThickness: 2,
      innerRadius: UiTokens.radii.cardMD,
    });
    renderPawTitleDecor(card, {
      name: "ParentBindPawV2",
      x: -130,
      y: 84,
      mirrored: false,
      scale: 0.82,
    });
    RuntimeUI.createLabel(card, {
      name: "ParentBindEmptyTitleV2",
      text: "先连接孩子账号",
      x: 0,
      y: 72,
      width: contentWidth - 80,
      height: 34,
      fontSize: 26,
      color: UiTokens.colors.textPrimary,
    });
    RuntimeUI.createLabel(card, {
      name: "ParentBindEmptyTextV2",
      text: "绑定后，这里会变成孩子的宠物成长面板和本周学习分析。",
      x: 0,
      y: 34,
      width: contentWidth - 100,
      height: 24,
      fontSize: 15,
      color: UiTokens.colors.textSecondary,
    });
    const input = RuntimeUI.createEditBox(card, {
      name: "ParentBindChildInputV2",
      placeholder: "输入孩子用户名或 childId",
      defaultValue: "",
      x: -86,
      y: -28,
      width: Math.min(440, contentWidth - 280),
      height: 48,
      maxLength: 64,
      multiline: false,
      radius: 18,
      backgroundColor: new Color(255, 255, 255, 255),
      textColor: new Color(45, 74, 62, 255),
      placeholderColor: new Color(112, 137, 123, 220),
    });
    this.parentBindInput = input.editBox;
    const bindButton = RuntimeUI.createButton(card, {
      name: "ParentBindChildButtonV2",
      text: this.parentBinding ? "绑定中" : "绑定孩子",
      x: Math.min(250, contentWidth / 2 - 124),
      y: -28,
      width: 148,
      height: 48,
      color: this.parentBinding ? UiTokens.colors.textSecondary : UiTokens.colors.brand,
      fontSize: 17,
      radius: 20,
    });
    bindButton.node.on(Button.EventType.CLICK, () => void this.handleParentBindChild(), this);
  }

  private renderParentRingProgress(
    parent: Node,
    options: { name: string; x: number; y: number; radius: number; percent: number; title: string; value: string }
  ): void {
    const node = new Node(options.name);
    node.setParent(parent);
    node.setPosition(new Vec3(options.x, options.y, 0));
    const transform = node.addComponent(UITransform);
    transform.setContentSize(options.radius * 2 + 14, options.radius * 2 + 14);
    const graphics = node.addComponent(Graphics);
    graphics.lineWidth = 8;
    graphics.strokeColor = new Color(242, 226, 211, 255);
    graphics.arc(0, 0, options.radius, 0, Math.PI * 2, false);
    graphics.stroke();
    graphics.lineWidth = 8;
    graphics.strokeColor = UiTokens.colors.brand;
    const endAngle = -Math.PI / 2 + Math.PI * 2 * Math.max(0, Math.min(100, options.percent)) / 100;
    graphics.arc(0, 0, options.radius, -Math.PI / 2, endAngle, false);
    graphics.stroke();
    RuntimeUI.createLabel(node, {
      name: `${options.name}Value`,
      text: options.value,
      x: 0,
      y: 4,
      width: options.radius * 2,
      height: 24,
      fontSize: 18,
      color: UiTokens.colors.textPrimary,
    });
    RuntimeUI.createLabel(node, {
      name: `${options.name}Title`,
      text: options.title,
      x: 0,
      y: -18,
      width: options.radius * 2 + 20,
      height: 18,
      fontSize: 11,
      color: UiTokens.colors.textSecondary,
    });
  }

  private resolveParentHomeworkCompletion(): { completed: number; total: number; percent: number; summary: string } {
    const entries = Object.entries(this.parentOverviewData?.today_homework ?? {});
    const total = Math.max(3, entries.length || 0);
    const completed = entries.filter(([, item]) => item && item.score != null).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return {
      completed,
      total,
      percent,
      summary: completed >= total ? "今日作业已完成" : `还有 ${Math.max(0, total - completed)} 项待完成`,
    };
  }

  private resolveParentChildDisplayName(childLabel: string): string {
    if (!childLabel || childLabel === "未绑定") {
      return "孩子";
    }
    if (childLabel.length <= 8) {
      return childLabel;
    }
    return `孩子 ${childLabel.slice(0, 4)}`;
  }

  private resolveParentChildMetaText(childLabel: string): string {
    if (!childLabel || childLabel === "未绑定") {
      return "未绑定";
    }
    if (childLabel.length <= 14) {
      return `已绑定：${childLabel}`;
    }
    return `已绑定：...${childLabel.slice(-8)}`;
  }

  private resolveParentReportScores(): Array<{ label: string; score: number }> {
    return Object.entries(this.parentReportData?.subject_breakdown ?? {}).map(([subject, item]) => ({
      label: this.formatHomeworkSubjectLabel(subject).slice(0, 1),
      score: item.avg,
    }));
  }

  private resolveParentSubjectBreakdown(): Array<{ label: string; avg: number; count: number }> {
    return Object.entries(this.parentReportData?.subject_breakdown ?? {}).map(([subject, item]) => ({
      label: this.formatHomeworkSubjectLabel(subject),
      avg: item.avg,
      count: item.count,
    }));
  }

  private resolveParentEvolutionHint(): string {
    const pet = this.parentOverviewData?.pet;
    if (!pet) {
      return "同步后会显示宠物成长目标。";
    }
    const exp = pet.experience ?? 0;
    const nextTarget = Math.max(20, Math.ceil((exp + 1) / 20) * 20);
    const remaining = Math.max(1, nextTarget - exp);
    return `距离下一次成长约还差 ${remaining} 点作业积分。`;
  }

  private buildParentInsightRows(): Array<{ kind: "title" | "body"; text: string }> {
    const rows: Array<{ kind: "title" | "body"; text: string }> = [];
    const overview = this.parentOverviewData;
    const report = this.parentReportData;
    if (overview) {
      const pet = overview.pet;
      rows.push({ kind: "title", text: "宠物状态洞察" });
      rows.push({ kind: "body", text: `${pet.name} 当前 Lv.${pet.level}，${this.formatPetStage(pet.stage)}。` });
      rows.push({
        kind: "body",
        text: `饥饿 ${pet.hunger} / 体力 ${pet.energy ?? pet.health ?? "-"} / 心情 ${pet.mood} / 清洁 ${pet.cleanliness ?? "-"}`,
      });
      rows.push({ kind: "body", text: this.resolveParentEvolutionHint() });
      const homework = Object.entries(overview.today_homework ?? {})
        .map(([subject, item]) => `${this.formatHomeworkSubjectLabel(subject)} ${item?.score ?? "未提交"}`)
        .join(" · ");
      rows.push({ kind: "title", text: "今日作业" });
      rows.push({ kind: "body", text: homework || "暂无今日作业记录。" });
    }
    if (report) {
      rows.push({ kind: "title", text: "本周学习趋势" });
      rows.push({ kind: "body", text: `${report.week}，共 ${report.total_homework} 次作业，平均分 ${Math.round(report.average_score)}。` });
      const breakdown = Object.entries(report.subject_breakdown ?? {})
        .map(([subject, item]) => `${this.formatHomeworkSubjectLabel(subject)} ${item.count} 次 / 平均 ${Math.round(item.avg)}`)
        .join(" · ");
      rows.push({ kind: "body", text: breakdown || "暂无科目拆解数据。" });
      const pet = report.pet_status_summary;
      if (pet) {
        rows.push({
          kind: "body",
          text: `本周宠物概览：饥饿 ${pet.hunger ?? "-"} / 体力 ${pet.energy ?? "-"} / 心情 ${pet.mood ?? "-"} / 清洁 ${pet.cleanliness ?? "-"}`,
        });
      }
    }
    if (!rows.length) {
      rows.push({ kind: "title", text: "暂无数据" });
      rows.push({ kind: "body", text: "点击刷新后查看孩子宠物成长、今日作业和本周学习趋势。" });
    }
    return rows;
  }

  private renderParentActionButton(
    parent: Node,
    name: string,
    text: string,
    x: number,
    y: number,
    color: Color,
    onClick: () => void
  ): void {
    const button = RuntimeUI.createButton(parent, {
      name,
      text,
      x,
      y,
      width: name.includes("Refresh") ? 128 : name.includes("Report") ? 150 : 170,
      height: 42,
      color,
      fontSize: 16,
      radius: 20,
    });
    button.node.on(Button.EventType.CLICK, onClick, this);
  }

  private renderParentInfoCard(
    parent: Node,
    options: {
      name: string;
      title: string;
      text: string;
      x: number;
      y: number;
      width: number;
      height: number;
      accentColor: Color;
    }
  ): void {
    const card = RuntimeUI.createCard(parent, {
      name: options.name,
      x: options.x,
      y: options.y,
      width: options.width,
      height: options.height,
      color: new Color(219, 174, 135, 245),
      innerColor: new Color(255, 250, 244, 255),
      radius: 18,
      borderThickness: 3,
      innerRadius: 16,
    });
    RuntimeUI.createBox(card, {
      name: `${options.name}Accent`,
      x: -options.width / 2 + 16,
      y: 0,
      width: 6,
      height: options.height - 34,
      color: options.accentColor,
      radius: 3,
    });
    const textWidth = options.width - 64;
    const textX = -options.width / 2 + 38 + textWidth / 2;
    RuntimeUI.createLabel(card, {
      name: `${options.name}Title`,
      text: options.title,
      x: textX,
      y: options.height / 2 - 30,
      width: textWidth,
      height: 24,
      fontSize: 18,
      color: new Color(98, 66, 46, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}Text`,
      text: options.text,
      x: textX,
      y: -14,
      width: textWidth,
      height: options.height - 62,
      fontSize: 14,
      color: new Color(98, 66, 46, 235),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
  }

  private buildParentPetSummaryText(): string {
    const data = this.parentOverviewData;
    if (!data) {
      return "暂无宠物数据\n点击查看或刷新。";
    }
    const pet = data.pet;
    return [
      `${pet.name}  Lv.${pet.level}`,
      `饥饿 ${pet.hunger} / 体力 ${pet.energy ?? pet.health ?? "-"}`,
      `心情 ${pet.mood} / 清洁 ${pet.cleanliness ?? "-"}`,
      `经验 ${pet.experience ?? 0} / 阶段 ${this.formatPetStage(pet.stage)}`,
    ].join("\n");
  }

  private buildParentReportSummaryText(): string {
    const data = this.parentReportData;
    if (!data) {
      return "暂无周报数据\n点击查看周报或刷新。";
    }
    return [
      `周次：${data.week}`,
      `作业总数：${data.total_homework}`,
      `平均分：${Math.round(data.average_score)}`,
      `宠物状态：${data.pet_status_summary?.alive ? "正常" : "暂无"}`,
    ].join("\n");
  }

  private buildParentDetailText(): string {
    const parts: string[] = [];
    if (this.parentOverviewData) {
      const pet = this.parentOverviewData.pet;
      const homework = Object.entries(this.parentOverviewData.today_homework ?? {})
        .map(([subject, item]) => `${this.formatHomeworkSubjectLabel(subject)}：${item?.score ?? "未提交"}`)
        .join(" / ");
      parts.push([
        "孩子宠物详情",
        `孩子：${this.parentOverviewData.childNickname ?? this.parentOverviewData.childId ?? "-"}`,
        `宠物：${pet.name}  Lv.${pet.level}`,
        `饥饿：${pet.hunger}  体力：${pet.energy ?? pet.health ?? "-"}`,
        `心情：${pet.mood}  清洁：${pet.cleanliness ?? "-"}`,
        `经验：${pet.experience ?? 0}  阶段：${this.formatPetStage(pet.stage)}  状态：${pet.status ? "在线" : "离线"}`,
        `今日作业：${homework || "暂无记录"}`,
      ].join("\n"));
    }
    if (this.parentReportData) {
      const breakdown = Object.entries(this.parentReportData.subject_breakdown ?? {})
        .map(([subject, item]) => `${this.formatHomeworkSubjectLabel(subject)}：${item.count} 次 / 平均 ${Math.round(item.avg)}`)
        .join("；");
      const pet = this.parentReportData.pet_status_summary;
      parts.push([
        "本周报告",
        `周次：${this.parentReportData.week}`,
        `作业总数：${this.parentReportData.total_homework}`,
        `平均分：${Math.round(this.parentReportData.average_score)}`,
        `科目：${breakdown || "暂无科目数据"}`,
        pet
          ? `宠物概览：饥饿 ${pet.hunger ?? "-"} / 体力 ${pet.energy ?? "-"} / 心情 ${pet.mood ?? "-"} / 清洁 ${pet.cleanliness ?? "-"} / 阶段 ${this.formatPetStage(pet.stage)}`
          : "宠物概览：暂无",
      ].join("\n"));
    }
    return parts.join("\n\n") || "暂无数据。绑定孩子后可查看宠物状态、今日作业和本周学习概览。";
  }

  private formatHomeworkSubjectLabel(subject: string): string {
    const labels: Record<string, string> = {
      chinese: "语文",
      math: "数学",
      english: "英语",
      general: "综合",
    };
    return labels[subject] ?? subject;
  }

  private formatPetStage(stage: string | undefined): string {
    const labels: Record<string, string> = {
      STAGE_1: "阶段 1",
      STAGE_2: "阶段 2",
      STAGE_3: "阶段 3",
      STAGE_4: "阶段 4",
    };
    return stage ? labels[stage] ?? stage : "-";
  }

  private createMainStageRendererContext(): MainStageRendererContext {
    return {
      assets: {
        stageSceneBackgroundSpriteFrame: this.assetStore.stageSceneBackgroundSpriteFrame,
        stageCloudSpriteFrame: this.assetStore.stageCloudSpriteFrame,
      },
      state: {
        petAnimator: this.petAnimator,
        showShaderDebugBlock: this.showShaderDebugBlock,
        petBubble: this.petBubble,
        activeVisualState: this.activeVisualState,
      },
      tuning: {
        mainStageRadius: MAIN_STAGE_RADIUS,
        getValue: (key) => this.getArtTuningValue(key),
      },
      utils: {
        getGraphicsMaskSubComp: (mask) => this.getGraphicsMaskSubComp(mask),
        getButtonGradientCarrierSpriteFrame: () => this.getButtonGradientCarrierSpriteFrame(),
        createButtonGradientMaterial: (options) => this.createButtonGradientMaterial(options),
        resolveSpriteWorldRect: (node, width, height) => this.resolveSpriteWorldRect(node, width, height),
      },
    };
  }

  private createPhoneMainStageRendererContext(): MainStageRendererContext {
    const baseContext = this.createMainStageRendererContext();
    return {
      ...baseContext,
      tuning: {
        ...baseContext.tuning,
        getValue: (key) => {
          const value = this.getArtTuningValue(key);
          if (key === "foxCharacterScale") {
            return value * 1.45;
          }
          if (key === "foxCharacterOffsetYRatio") {
            return value - 0.035;
          }
          return value;
        },
      },
    };
  }

  private shouldUsePhoneLandscapeHome(layout: MainLayout): boolean {
    return this.resolveMobileMainLayoutProfile(layout.viewportWidth, layout.viewportHeight).compact;
  }

  private renderPhoneLandscapeHome(root: Node, layout: MainLayout): void {
    const margin = Math.max(12, Math.round(Math.min(layout.viewportWidth, layout.viewportHeight) * 0.024));
    const topBarHeight = Math.max(56, Math.min(64, Math.round(layout.viewportHeight * 0.085)));
    const bottomDockHeight = Math.max(74, Math.min(88, Math.round(layout.viewportHeight * 0.125)));
    const verticalGap = Math.max(6, Math.round(layout.viewportHeight * 0.014));
    const topBarY = layout.viewportHeight / 2 - margin - topBarHeight / 2;
    const bottomDockY = -layout.viewportHeight / 2 + margin + bottomDockHeight / 2;
    const stageTop = topBarY - topBarHeight / 2 - verticalGap;
    const stageBottom = bottomDockY + bottomDockHeight / 2 + verticalGap;
    const stageWidth = Math.round(layout.viewportWidth - margin * 2);
    const stageHeight = Math.max(260, Math.round(stageTop - stageBottom));
    const stageY = Math.round((stageTop + stageBottom) / 2);
    const stageRadius = Math.max(22, Math.min(30, Math.round(stageHeight * 0.07)));

    const stageArea = RuntimeUI.createCard(root, {
      name: "PhoneLandscapeStage",
      x: 0,
      y: stageY,
      width: stageWidth,
      height: stageHeight,
      color: new Color(235, 207, 180, 118),
      innerColor: new Color(255, 247, 238, 178),
      radius: stageRadius,
      borderThickness: 1,
      innerRadius: Math.max(0, stageRadius - 1),
    });
    renderMainStageBase(this.createPhoneMainStageRendererContext(), stageArea, stageWidth, stageHeight, {
      borderThickness: 1,
      radius: stageRadius,
    });

    this.renderPhoneTopBar(root, {
      x: 0,
      y: topBarY,
      width: layout.viewportWidth - margin * 2,
      height: topBarHeight,
    });

    const sidePanelInset = Math.max(14, Math.round(stageHeight * 0.04));
    const sidePanelWidth = Math.max(184, Math.min(238, Math.round(stageWidth * 0.16)));
    const sidePanelHeight = Math.max(220, Math.round(stageHeight - sidePanelInset * 2));
    const sidePanelX = stageWidth / 2 - sidePanelInset - sidePanelWidth / 2;
    const sidePanelRadius = Math.max(18, Math.round(sidePanelWidth * 0.1));
    this.renderSideCardStructure(root, {
      name: "PhoneLeftStatus",
      x: -sidePanelX,
      y: stageY,
      width: sidePanelWidth,
      height: sidePanelHeight,
      radius: sidePanelRadius,
      title: "成长概览",
      subtitle: "今日陪伴",
      side: "left",
      summary: true,
    });

    this.renderSideCardStructure(root, {
      name: "PhoneRightStatus",
      x: sidePanelX,
      y: stageY,
      width: sidePanelWidth,
      height: sidePanelHeight,
      radius: sidePanelRadius,
      title: "",
      subtitle: "",
      side: "right",
    });

    this.renderActiveTabPlaceholder(root, {
      stageY,
      stageWidth,
      stageHeight,
    });

    this.renderPhoneBottomDock(root, {
      x: 0,
      y: bottomDockY,
      width: layout.viewportWidth - margin * 2,
      height: bottomDockHeight,
    });

    renderFoodSelectionPanel({
      parent: root,
      stageY,
      stageWidth,
      stageHeight,
      isOpen: this.isFoodSelectionPanelOpen,
      foods: appState.getPetFoodInventory(),
      feedRequestInFlight: this.feedRequestInFlight,
      onClose: () => {
        this.isFoodSelectionPanelOpen = false;
        this.render();
      },
      onSelectFood: (food) => void this.handleFoodSelection(food),
      onOpenHomework: () => this.openHomeworkCenterFromFoodShortage(),
      eventTarget: this,
    });

    this.renderHomeworkCenterOverlay(root, {
      stageY,
      stageWidth,
      stageHeight,
      bottomDockY,
      bottomDockWidth: layout.viewportWidth - margin * 2,
      bottomDockHeight,
    });
  }

  private renderPhoneTopBar(
    parent: Node,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const bar = RuntimeUI.createCard(parent, {
      name: "PhoneTopBar",
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, 166),
      innerColor: new Color(255, 255, 255, 106),
      radius: Math.round(options.height / 2),
      borderThickness: 1,
      innerRadius: Math.max(0, Math.round(options.height / 2) - 1),
    });

    const avatarSize = Math.max(42, Math.min(50, Math.round(options.height * 0.78)));
    const leftInset = Math.max(14, Math.round(options.width * 0.018));
    const avatarX = -options.width / 2 + leftInset + avatarSize / 2;
    const avatar = RuntimeUI.createRoundedClip(bar, {
      name: "PhoneTopAvatar",
      x: Math.round(avatarX),
      y: 0,
      width: avatarSize,
      height: avatarSize,
      radius: Math.round(avatarSize * 0.34),
    });
    const gradientFrame = this.getButtonGradientCarrierSpriteFrame();
    if (gradientFrame) {
      RuntimeUI.createSpriteFrame(avatar, {
        name: "PhoneTopAvatarGradient",
        x: 0,
        y: 0,
        width: avatarSize,
        height: avatarSize,
        spriteFrame: gradientFrame,
      });
    } else {
      RuntimeUI.createBox(avatar, {
        name: "PhoneTopAvatarFill",
        x: 0,
        y: 0,
        width: avatarSize,
        height: avatarSize,
        color: new Color(245, 160, 72, 255),
        radius: Math.round(avatarSize * 0.34),
      });
    }
    RuntimeUI.createLabel(avatar, {
      name: "PhoneTopAvatarIcon",
      text: "🐾",
      x: 0,
      y: 0,
      width: avatarSize,
      height: avatarSize,
      fontSize: Math.round(avatarSize * 0.44),
      color: Color.WHITE,
    });
    RuntimeUI.createLabel(bar, {
      name: "PhoneTopTitle",
      text: "学伴精灵",
      x: Math.round(avatarX + avatarSize / 2 + 78),
      y: 0,
      width: 150,
      height: Math.round(options.height * 0.72),
      fontSize: Math.max(22, Math.min(28, Math.round(options.height * 0.4))),
      color: new Color(86, 52, 35, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    const statusWidth = Math.max(128, Math.min(162, Math.round(options.width * 0.12)));
    const statusHeight = Math.max(40, Math.min(48, Math.round(options.height * 0.74)));
    const statusX = options.width / 2 - leftInset - statusWidth / 2;
    RuntimeUI.createCard(bar, {
      name: "PhoneTopStatusChip",
      x: Math.round(statusX),
      y: 0,
      width: statusWidth,
      height: statusHeight,
      color: new Color(229, 224, 255, 214),
      innerColor: new Color(255, 255, 255, 82),
      radius: Math.round(statusHeight / 2),
      borderThickness: 0,
      innerRadius: Math.round(statusHeight / 2),
    });
    RuntimeUI.createLabel(bar, {
      name: "PhoneTopStatusText",
      text: viewModel.statusValueText,
      x: Math.round(statusX),
      y: 0,
      width: statusWidth - 18,
      height: statusHeight,
      fontSize: Math.max(16, Math.min(20, Math.round(options.height * 0.28))),
      color: new Color(86, 69, 130, 245),
    });

    const navWidth = Math.max(360, Math.min(500, Math.round(options.width * 0.38)));
    const navHeight = Math.max(42, Math.min(50, Math.round(options.height * 0.74)));
    const navX = Math.round(options.width * 0.1);
    const navWrap = RuntimeUI.createCard(bar, {
      name: "PhoneTopNav",
      x: navX,
      y: 0,
      width: navWidth,
      height: navHeight,
      color: new Color(255, 255, 255, 112),
      innerColor: new Color(255, 255, 255, 84),
      radius: Math.round(navHeight / 2),
      borderThickness: 1,
      innerRadius: Math.max(0, Math.round(navHeight / 2) - 1),
    });
    const tabs: Array<{ key: TopBarNavTab; name: string; text: string }> = [
      { key: "petHome", name: "PetHome", text: "宠物主页" },
      { key: "bag", name: "Bag", text: "背包" },
      { key: "journal", name: "Journal", text: "日记" },
      { key: "chat", name: "Chat", text: "聊天" },
    ];
    const gap = 6;
    const itemWidth = Math.round((navWidth - 16 - gap * (tabs.length - 1)) / tabs.length);
    const itemHeight = navHeight - 10;
    tabs.forEach((tab, index) => {
      const itemX = -navWidth / 2 + 8 + itemWidth / 2 + index * (itemWidth + gap);
      const isActive = this.activeTopBarNavTab === tab.key;
      if (isActive) {
        RuntimeUI.createBox(navWrap, {
          name: `PhoneTop${tab.name}Active`,
          x: Math.round(itemX),
          y: 0,
          width: itemWidth,
          height: itemHeight,
          color: new Color(244, 154, 42, 244),
          radius: Math.round(itemHeight / 2),
        });
      }
      RuntimeUI.createLabel(navWrap, {
        name: `PhoneTop${tab.name}Label`,
        text: tab.text,
        x: Math.round(itemX),
        y: 0,
        width: itemWidth - 8,
        height: itemHeight,
        fontSize: Math.max(15, Math.min(18, Math.round(options.height * 0.25))),
        color: isActive ? Color.WHITE : new Color(104, 72, 50, 238),
      });
      const hitArea = RuntimeUI.createBox(navWrap, {
        name: `PhoneTop${tab.name}Hit`,
        x: Math.round(itemX),
        y: 0,
        width: itemWidth,
        height: itemHeight,
        color: new Color(255, 255, 255, 0),
        radius: Math.round(itemHeight / 2),
      });
      const button = hitArea.addComponent(Button);
      button.transition = Button.Transition.NONE;
      hitArea.on(Button.EventType.CLICK, () => this.handleTopBarTabSelect(tab.key), this);
    });
  }

  private renderPhoneFeedbackBubble(
    parent: Node,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const bubble = RuntimeUI.createCard(parent, {
      name: "PhoneFeedbackBubble",
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, 184),
      innerColor: new Color(255, 255, 255, 96),
      radius: 18,
      borderThickness: 1,
      innerRadius: 17,
    });
    RuntimeUI.createLabel(bubble, {
      name: "PhoneFeedbackTitle",
      text: viewModel.displayStatus,
      x: 0,
      y: Math.round(options.height * 0.18),
      width: Math.round(options.width * 0.78),
      height: 24,
      fontSize: Math.max(18, Math.min(22, Math.round(options.width * 0.095))),
      color: new Color(99, 58, 34, 246),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    const detail = RuntimeUI.createLabel(bubble, {
      name: "PhoneFeedbackDetail",
      text: "今日口粮已送达",
      x: 0,
      y: -Math.round(options.height * 0.2),
      width: Math.round(options.width * 0.78),
      height: 22,
      fontSize: Math.max(14, Math.min(17, Math.round(options.width * 0.072))),
      color: new Color(126, 80, 48, 204),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    detail.enableWrapText = false;
    detail.overflow = Label.Overflow.CLAMP;
  }

  private renderPhoneBottomDock(
    parent: Node,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    const dock = RuntimeUI.createCard(parent, {
      name: "PhoneBottomDock",
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, 174),
      innerColor: new Color(255, 255, 255, 76),
      radius: Math.round(options.height * 0.42),
      borderThickness: 1,
      innerRadius: Math.max(0, Math.round(options.height * 0.42) - 1),
    });
    const actions: Array<{
      name: string;
      action: BottomDockAction;
      icon: string;
      text: string;
      topColor: Color;
      bottomColor: Color;
    }> = [
      { name: "Feed", action: "feed", icon: "🍚", text: "喂食", topColor: new Color(249, 206, 104, 255), bottomColor: new Color(238, 157, 50, 255) },
      { name: "Play", action: "play", icon: "◇", text: "玩耍", topColor: new Color(207, 183, 255, 255), bottomColor: new Color(154, 121, 226, 255) },
      { name: "Bath", action: "bath", icon: "≋", text: "洗澡", topColor: new Color(145, 226, 176, 255), bottomColor: new Color(86, 190, 131, 255) },
      { name: "Sleep", action: "sleep", icon: "Zz", text: "睡觉", topColor: new Color(157, 176, 255, 255), bottomColor: new Color(96, 119, 220, 255) },
      { name: "Music", action: "music", icon: "♪", text: "听歌", topColor: new Color(248, 202, 92, 255), bottomColor: new Color(231, 150, 41, 255) },
      { name: "Care", action: "care", icon: "♡", text: "心情", topColor: new Color(251, 179, 199, 255), bottomColor: new Color(226, 111, 148, 255) },
    ];
    const gap = Math.max(8, Math.round(options.width * 0.012));
    const trackWidth = options.width - Math.max(22, options.width * 0.024) * 2;
    const slotWidth = (trackWidth - gap * (actions.length - 1)) / actions.length;
    const iconSize = Math.max(42, Math.min(52, Math.round(options.height * 0.55)));
    const iconY = Math.round(options.height * 0.14);
    actions.forEach((item, index) => {
      const x = -trackWidth / 2 + slotWidth / 2 + index * (slotWidth + gap);
      const palette = this.resolvePhoneDockActionPalette(item.action);
      const iconClip = RuntimeUI.createRoundedClip(dock, {
        name: `PhoneDock${item.name}IconBg`,
        x: Math.round(x),
        y: iconY,
        width: iconSize,
        height: iconSize,
        radius: Math.round(iconSize * 0.34),
      });
      const gradientFrame = this.getButtonGradientCarrierSpriteFrame();
      if (gradientFrame) {
        const sprite = RuntimeUI.createSpriteFrame(iconClip, {
          name: `PhoneDock${item.name}Gradient`,
          x: 0,
          y: 0,
          width: iconSize,
          height: iconSize,
          spriteFrame: gradientFrame,
        });
        const material = this.createButtonGradientMaterial({
          shapeRect: this.resolveSpriteWorldRect(sprite.node, iconSize, iconSize),
          topColor: palette.topColor,
          bottomColor: palette.bottomColor,
          glossColor: new Color(255, 252, 241, 44),
        });
        if (material) {
          sprite.sprite.customMaterial = material;
          sprite.sprite.setMaterial(material, 0);
        }
      } else {
        RuntimeUI.createBox(iconClip, {
          name: `PhoneDock${item.name}Fallback`,
          x: 0,
          y: 0,
          width: iconSize,
          height: iconSize,
          color: palette.bottomColor,
          radius: Math.round(iconSize * 0.34),
        });
      }
      RuntimeUI.createLabel(dock, {
        name: `PhoneDock${item.name}Icon`,
        text: item.icon,
        x: Math.round(x),
        y: iconY,
        width: iconSize,
        height: iconSize,
        fontSize: Math.max(20, Math.round(iconSize * 0.42)),
        color: new Color(94, 59, 40, 238),
      });
      RuntimeUI.createLabel(dock, {
        name: `PhoneDock${item.name}Text`,
        text: item.text,
        x: Math.round(x),
        y: -Math.round(options.height * 0.28),
        width: Math.round(slotWidth),
        height: 26,
        fontSize: Math.max(19, Math.min(23, Math.round(options.height * 0.25))),
        color: new Color(86, 52, 35, 246),
      });
      const hitArea = RuntimeUI.createBox(dock, {
        name: `PhoneDock${item.name}Hit`,
        x: Math.round(x),
        y: 0,
        width: Math.round(slotWidth),
        height: Math.round(options.height),
        color: new Color(255, 255, 255, 0),
        radius: 18,
      });
      const button = hitArea.addComponent(Button);
      button.transition = Button.Transition.NONE;
      hitArea.on(Button.EventType.CLICK, () => this.handleBottomDockAction(item.action), this);
    });
  }

  private resolvePhoneDockActionPalette(action: BottomDockAction): { topColor: Color; bottomColor: Color } {
    if (action === "feed" || action === "music") {
      return {
        topColor: new Color(248, 204, 96, 255),
        bottomColor: new Color(232, 151, 42, 255),
      };
    }
    if (action === "play" || action === "sleep") {
      return {
        topColor: new Color(176, 181, 255, 255),
        bottomColor: new Color(116, 126, 226, 255),
      };
    }
    if (action === "bath") {
      return {
        topColor: new Color(140, 224, 177, 255),
        bottomColor: new Color(80, 188, 132, 255),
      };
    }
    return {
      topColor: new Color(249, 176, 198, 255),
      bottomColor: new Color(224, 108, 148, 255),
    };
  }

  private renderMainStageLayer(shell: Node, shellWidth: number, shellHeight: number, shellBorderWidth: number): void {
    // 主舞台层的尺寸关系是：壳层 -> ShellFrame -> MainViewport -> MainStage。
    // 这四层不是重复绘制，而是每一层负责不同的视觉职责：
    // - ShellFrame：主内容的内边界
    // - MainViewport：内部可视窗口
    // - MainStage：真正的主舞台底板
    // - MainStageShadow：舞台的轻微体积感
    // 尺寸计算顺序：
    // 1. 先从壳层扣出最外侧留白
    // 2. 再从 ShellFrame 扣出主视口留白
    // 3. 最后从主视口扣出 MainStage 留白
    // 这样可以保证每一层都保留独立的呼吸空间，后续美术调参也更直观。
    const mobileProfile = this.resolveMobileMainLayoutProfile(shellWidth, shellHeight);
    const appShellPadding = mobileProfile.compact
      ? Math.max(8, Math.round(Math.min(shellWidth, shellHeight) * 0.018))
      : Math.round(this.getArtTuningValue("appShellPadding"));
    const shellFramePadding = mobileProfile.compact
      ? Math.max(6, Math.round(Math.min(shellWidth, shellHeight) * 0.012))
      : Math.round(this.getArtTuningValue("shellFramePadding"));
    const mainViewportRadius = mobileProfile.compact
      ? Math.max(22, Math.min(30, Math.round(Math.min(shellWidth, shellHeight) * 0.045)))
      : Math.round(this.getArtTuningValue("mainViewportRadius"));
    const mainViewportAlpha = Math.round(this.getArtTuningValue("mainViewportAlpha"));
    const shellFrameWidth = Math.max(0, shellWidth - appShellPadding * 2);
    const shellFrameHeight = Math.max(0, shellHeight - appShellPadding * 2);
    const baseViewportWidth = Math.max(0, shellFrameWidth - shellFramePadding * 2);
    const baseViewportHeight = Math.max(0, shellFrameHeight - shellFramePadding * 2);
    const viewportWidth = Math.max(
      0,
      Math.round(baseViewportWidth * this.getArtTuningValue("mainViewportWidthScale"))
    );
    const viewportHeight = Math.max(
      0,
      Math.round(baseViewportHeight * this.getArtTuningValue("mainViewportHeightScale"))
    );
    const viewportOffsetUnitX = shellFrameWidth * 0.5;
    const viewportOffsetUnitY = shellFrameHeight * 0.5;
    const viewportX = Math.round(this.getArtTuningValue("mainViewportOffsetXRatio") * viewportOffsetUnitX);
    const viewportY = Math.round(this.getArtTuningValue("mainViewportOffsetYRatio") * viewportOffsetUnitY);

    // 主视口拆成两层：
    // - MainViewportHost：整块布局坐标承载层，顶栏 / 底栏 / 中区都按它定位。
    // - MainViewport：真正可见的 stage 底板，只覆盖左卡 + 中心 + 右卡这条中部区域。
    const edgeInset = mobileProfile.compact
      ? Math.max(6, Math.round(Math.min(viewportWidth, viewportHeight) * 0.01))
      : Math.max(12, Math.round(Math.min(viewportWidth, viewportHeight) * 0.018));
    const hostGap = mobileProfile.compact
      ? Math.max(4, Math.round(viewportWidth * 0.004))
      : Math.max(8, Math.round(viewportWidth * 0.01));
    const baseTopBarHeight = Math.max(
      mobileProfile.compact ? 54 : 72,
      Math.min(
        mobileProfile.compact ? 66 : 104,
        Math.round(viewportHeight * this.getArtTuningValue("topBarHeightRatio") * mobileProfile.chromeScale)
      )
    );
    const topBarHeight = Math.max(42, Math.round(baseTopBarHeight * this.getArtTuningValue("topBarHeightScale")));
    const baseBottomDockHeight = Math.max(
      mobileProfile.compact ? 86 : 112,
      Math.min(
        mobileProfile.compact ? 100 : 136,
        Math.round(viewportHeight * this.getArtTuningValue("bottomDockHeightRatio") * mobileProfile.chromeScale)
      )
    );
    const bottomDockHeight = Math.max(
      64,
      Math.round(baseBottomDockHeight * this.getArtTuningValue("bottomDockHeightScale"))
    );
    const mainAreaTop = viewportHeight / 2 - edgeInset - topBarHeight - hostGap * (mobileProfile.compact ? 0.55 : 1.35);
    const mainAreaBottom = -viewportHeight / 2 + edgeInset + bottomDockHeight + hostGap * (mobileProfile.compact ? 0.38 : 1.45);
    const stageWidth = Math.max(1, viewportWidth - edgeInset * 2);
    const stageHeight = Math.max(1, mainAreaTop - mainAreaBottom);
    const stageY = Math.round((mainAreaTop + mainAreaBottom) / 2);

    // ShellFrame 是主舞台的第一道内框。
    // 这里要的是“描边空心”的框感，不是一个有实底的卡片。
    // 如果以后要调主舞台在壳层里的呼吸感，优先动这里的边距、圆角和描边粗细。
    const shellFrameContainer = this.showShellFrameLayer
      ? RuntimeUI.createCard(shell, {
        name: "ShellFrame",
        x: 0,
        y: 0,
        width: shellFrameWidth,
        height: shellFrameHeight,
        style: "shell",
        borderColor: new Color(255, 255, 255, mobileProfile.compact ? 82 : 186),
        radius: mainViewportRadius + 2,
        lineWidth: mobileProfile.compact ? 1 : 4,
      })
      : shell;

    // 美术可调参数清单（ShellFrame / MainViewport / MainStage）
    // - ShellFrame.radius / innerRadius：第一层内框的厚薄感
    // - MainViewport.radius / innerRadius：主视口的柔和程度
    // - MainStage.radius / innerRadius：主舞台底板的圆角和边缘厚度
    // - MainStageShadow.color.a：舞台阴影的轻重
    // - MainStageShadow.y：阴影上下偏移，影响“浮起感”
    // - MainStageShadow.width / height：阴影覆盖范围，影响体积感和柔边范围
    // 这些值改动后，最容易影响设计感知，适合美术和程序一起对调。
    // MainViewport 是主视口容器，负责控制可视范围和内部留白。
    // 它的存在让主舞台不会直接贴着 ShellFrame 边缘，层次更像参考页。
    const viewportShadowBase = Math.min(stageWidth, stageHeight);
    const viewportShadowSpread = Math.max(
      14,
      Math.round(viewportShadowBase * this.getArtTuningValue("mainViewportShadowSpreadRatio"))
    );
    const viewportShadowAlpha = Math.round(this.getArtTuningValue("mainViewportShadowAlpha"));
    if (this.showMainViewportLayer) {
      this.ensureMainViewportShadowAssetsForLayout({
        viewportWidth: stageWidth,
        viewportHeight: stageHeight,
        viewportRadius: mainViewportRadius,
        spread: viewportShadowSpread,
      });

      if (this.mainViewportShadowSpriteFrame) {
        RuntimeUI.createSpriteFrame(shellFrameContainer, {
          name: "MainViewportShadow",
          x: viewportX,
          y: viewportY + stageY,
          width: stageWidth + viewportShadowSpread * 2,
          height: stageHeight + viewportShadowSpread * 2,
          spriteFrame: this.mainViewportShadowSpriteFrame,
          color: new Color(SHELL_SHADOW_COLOR.r, SHELL_SHADOW_COLOR.g, SHELL_SHADOW_COLOR.b, viewportShadowAlpha),
        });
      } else {
        RuntimeUI.createBox(shellFrameContainer, {
          name: "MainViewportShadowFallback",
          x: viewportX,
          y: viewportY + stageY,
          width: stageWidth + Math.round(viewportShadowSpread * 0.8),
          height: stageHeight + Math.round(viewportShadowSpread * 0.8),
          color: new Color(187, 129, 62, Math.max(0, Math.round(viewportShadowAlpha * 0.18))),
          radius: mainViewportRadius,
        });
      }
    }

    const viewportContainer = new Node("MainViewportHost");
    viewportContainer.setParent(shellFrameContainer);
    viewportContainer.setPosition(viewportX, viewportY, 0);
    const viewportContainerTransform =
      viewportContainer.getComponent(UITransform) ?? viewportContainer.addComponent(UITransform);
    viewportContainerTransform.setContentSize(viewportWidth, viewportHeight);

    const stageArea = this.showMainViewportLayer
      ? RuntimeUI.createCard(viewportContainer, {
        name: "MainViewport",
        x: 0,
        y: stageY,
        width: stageWidth,
        height: stageHeight,
        color: new Color(235, 207, 180, mobileProfile.compact ? Math.min(mainViewportAlpha, 138) : mainViewportAlpha),
        innerColor: new Color(
          255,
          246,
          237,
          mobileProfile.compact ? Math.min(218, Math.round(mainViewportAlpha * 0.84)) : Math.max(0, Math.round(mainViewportAlpha * 0.96))
        ),
        radius: mainViewportRadius,
        borderThickness: mobileProfile.compact ? 1 : 2,
        innerRadius: Math.max(0, mainViewportRadius - (mobileProfile.compact ? 1 : 2)),
      })
      : new Node("StageArea");
    if (!this.showMainViewportLayer) {
      stageArea.setParent(viewportContainer);
      stageArea.setPosition(0, stageY, 0);
      const stageAreaTransform = stageArea.getComponent(UITransform) ?? stageArea.addComponent(UITransform);
      stageAreaTransform.setContentSize(stageWidth, stageHeight);
    }

    renderMainStageBase(this.createMainStageRendererContext(), stageArea, stageWidth, stageHeight, {
      borderThickness: mobileProfile.compact ? 1 : 2,
      radius: mainViewportRadius,
    });


    // 这一层是主舞台的氛围底光。
    // 它不承载内容，只负责把舞台从主视口里“托”出来一点，避免画面太平。
    // 参考页里这一层对应的是 AmbientLayer / AmbientGlow 的感觉。
    // 这两个 glow 不是装饰纹理，而是“柔光空气层”：
    // - TopGlow：偏上方的白色高光，负责提亮舞台中心上缘
    // - BottomGlow：偏下方的暖色回光，负责把舞台底部托住
    // 调参时优先看三个维度：
    // - width / height：决定光晕铺开的范围，越大越“散”
    // - y：决定光晕往上还是往下偏，影响层次重心
    // - color.a：决定气氛轻重，越高越明显，越低越克制
    const ambientTopGlow = RuntimeUI.createRadialGlow(stageArea, {
      name: "MainStageAmbientTopGlow",
      x: 0,
      y: Math.round(stageHeight * 0.08),
      width: Math.max(0, Math.round(stageWidth * 0.96)),
      height: Math.max(0, Math.round(stageHeight * 0.62)),
      color: new Color(255, 255, 255, 30),
      steps: 7,
    });
    ambientTopGlow.setSiblingIndex(0);

    // 下方暖光更接近“托底”的感觉。
    // 它比上方白光更低、更宽、更淡，主要是让主舞台和底层背景之间有一层柔和过渡。
    const ambientBottomGlow = RuntimeUI.createRadialGlow(stageArea, {
      name: "MainStageAmbientBottomGlow",
      x: 0,
      y: -Math.round(stageHeight * 0.12),
      width: Math.max(0, Math.round(stageWidth * 1.02)),
      height: Math.max(0, Math.round(stageHeight * 0.74)),
      color: new Color(247, 216, 162, 18),
      steps: 7,
    });
    ambientBottomGlow.setSiblingIndex(0);

    this.renderPrimaryLayoutHosts(viewportContainer, viewportWidth, viewportHeight, stageWidth, stageHeight, stageY);
  }

  private renderPrimaryLayoutHosts(
    viewport: Node,
    viewportWidth: number,
    viewportHeight: number,
    stageWidth: number,
    stageHeight: number,
    stageY: number
  ): void {
    const mobileProfile = this.resolveMobileMainLayoutProfile(viewportWidth, viewportHeight);
    const hostLayer = new Node("PrimaryLayoutHostLayer");
    hostLayer.setParent(viewport);
    const hostLayerTransform = hostLayer.getComponent(UITransform) ?? hostLayer.addComponent(UITransform);
    hostLayerTransform.setContentSize(viewportWidth, viewportHeight);

    const edgeInset = mobileProfile.compact
      ? Math.max(5, Math.round(Math.min(viewportWidth, viewportHeight) * 0.008))
      : Math.max(8, Math.round(Math.min(viewportWidth, viewportHeight) * 0.018 * mobileProfile.stageInsetScale));
    const hostGap = mobileProfile.compact
      ? Math.max(4, Math.round(viewportWidth * 0.004))
      : Math.max(6, Math.round(viewportWidth * 0.01 * mobileProfile.stageInsetScale));
    const baseTopBarWidth = Math.max(360, viewportWidth - edgeInset * 2);
    const baseTopBarHeight = Math.max(
      mobileProfile.compact ? 50 : 72,
      Math.min(
        mobileProfile.compact ? 66 : 104,
        Math.round(viewportHeight * this.getArtTuningValue("topBarHeightRatio") * mobileProfile.chromeScale)
      )
    );
    const topBarWidth = Math.max(180, Math.round(baseTopBarWidth * this.getArtTuningValue("topBarWidthScale")));
    const topBarHeight = Math.max(42, Math.round(baseTopBarHeight * this.getArtTuningValue("topBarHeightScale")));
    const baseBottomDockWidth = Math.max(420, viewportWidth - edgeInset * 2);
    const baseBottomDockHeight = Math.max(
      mobileProfile.compact ? 82 : 112,
      Math.min(
        mobileProfile.compact ? 98 : 136,
        Math.round(viewportHeight * this.getArtTuningValue("bottomDockHeightRatio") * mobileProfile.chromeScale)
      )
    );
    const bottomDockWidth = Math.max(
      220,
      Math.round(baseBottomDockWidth * this.getArtTuningValue("bottomDockWidthScale") * (mobileProfile.compact ? 0.88 : 1))
    );
    const bottomDockHeight = Math.max(
      64,
      Math.round(baseBottomDockHeight * this.getArtTuningValue("bottomDockHeightScale"))
    );
    const stageInset = Math.max(
      8,
      Math.round(Math.min(stageWidth, stageHeight) * this.getArtTuningValue("sideCardStageInsetRatio") * mobileProfile.stageInsetScale)
    );
    const stageContentWidth = Math.max(1, stageWidth - stageInset * 2);
    const stageContentHeight = Math.max(1, stageHeight - stageInset * 2);
    const stageTop = stageY + stageHeight / 2 - stageInset;
    const stageBottom = stageY - stageHeight / 2 + stageInset;
    const verticalGuard = Math.max(
      10,
      Math.round(hostGap * this.getArtTuningValue("sideCardVerticalGuardRatio"))
    );
    const baseSideHostHeight = Math.max(
      mobileProfile.compact ? 112 : 220,
      Math.min(
        stageContentHeight - verticalGuard,
        Math.round(stageContentHeight * this.getArtTuningValue("sideCardBaseHeightRatio") * mobileProfile.sideCardScale)
      )
    );
    const baseSideHostWidth = Math.max(
      mobileProfile.compact ? 132 : 176,
      Math.min(
        mobileProfile.compact ? 178 : 320,
        Math.round((stageContentWidth - hostGap * 2) * this.getArtTuningValue("sideCardBaseWidthRatio") * mobileProfile.sideCardScale)
      )
    );
    const leftCardWidth = Math.max(
      120,
      Math.min(stageContentWidth - hostGap, Math.round(baseSideHostWidth * this.getArtTuningValue("leftCardWidthScale")))
    );
    const maxSideCardHeight = Math.max(120, stageHeight - Math.max(4, Math.round(stageInset * 0.35)));
    const resolveSideCardHeight = (scale: number): number => {
      if (scale <= 1) {
        return Math.max(120, Math.round(baseSideHostHeight * scale));
      }

      const progress = Math.min(1, scale - 1);
      return Math.max(
        120,
        Math.round(baseSideHostHeight + (maxSideCardHeight - baseSideHostHeight) * progress)
      );
    };
    const leftCardHeight = Math.max(
      mobileProfile.compact ? 108 : 120,
      Math.min(maxSideCardHeight, resolveSideCardHeight(this.getArtTuningValue("leftCardHeightScale")))
    );
    const rightCardWidth = Math.max(
      120,
      Math.min(stageContentWidth - hostGap, Math.round(baseSideHostWidth * this.getArtTuningValue("rightCardWidthScale")))
    );
    const rightCardHeight = Math.max(
      mobileProfile.compact ? 84 : 120,
      Math.min(
        mobileProfile.compact ? Math.min(maxSideCardHeight, 118) : maxSideCardHeight,
        resolveSideCardHeight(this.getArtTuningValue("rightCardHeightScale"))
      )
    );
    const baseSideHostY = Math.round(stageY);
    const offsetUnitX = viewportWidth * 0.5;
    const offsetUnitY = viewportHeight * 0.5;
    const topBarX = Math.round(this.getArtTuningValue("topBarOffsetXRatio") * offsetUnitX);
    const topBarY =
      viewportHeight / 2 -
      edgeInset -
      topBarHeight / 2 +
      this.getArtTuningValue("topBarOffsetYRatio") * offsetUnitY;
    const clamp = (value: number, min: number, max: number): number => Math.max(min, Math.min(max, value));
    const leftCardMinX = -stageWidth / 2 + stageInset + leftCardWidth / 2;
    const leftCardMaxX = stageWidth / 2 - stageInset - leftCardWidth / 2;
    const rightCardMinX = -stageWidth / 2 + stageInset + rightCardWidth / 2;
    const rightCardMaxX = stageWidth / 2 - stageInset - rightCardWidth / 2;
    const stageOuterTop = stageY + stageHeight / 2 - Math.max(2, Math.round(stageInset * 0.18));
    const stageOuterBottom = stageY - stageHeight / 2 + Math.max(2, Math.round(stageInset * 0.18));
    const leftCardMinY = stageOuterBottom + leftCardHeight / 2;
    const leftCardMaxY = stageOuterTop - leftCardHeight / 2;
    const rightCardMinY = stageOuterBottom + rightCardHeight / 2;
    const rightCardMaxY = stageOuterTop - rightCardHeight / 2;
    const leftCardRawX =
      -stageWidth / 2 +
      stageInset +
      leftCardWidth / 2 +
      this.getArtTuningValue("leftCardOffsetXRatio") * offsetUnitX;
    const leftCardRawY = baseSideHostY + this.getArtTuningValue("leftCardOffsetYRatio") * offsetUnitY;
    const rightCardRawX =
      stageWidth / 2 -
      stageInset -
      rightCardWidth / 2 +
      this.getArtTuningValue("rightCardOffsetXRatio") * offsetUnitX;
    const rightCardRawY = baseSideHostY + this.getArtTuningValue("rightCardOffsetYRatio") * offsetUnitY;
    const compactTopCardY = stageOuterTop - Math.max(leftCardHeight, rightCardHeight) / 2 - Math.round(stageHeight * 0.035);
    const leftCardX = mobileProfile.compact
      ? leftCardMinX
      : clamp(leftCardRawX, leftCardMinX, leftCardMaxX);
    const leftCardY = mobileProfile.compact
      ? clamp(compactTopCardY, leftCardMinY, leftCardMaxY)
      : clamp(leftCardRawY, leftCardMinY, leftCardMaxY);
    const rightCardX = mobileProfile.compact
      ? rightCardMaxX
      : clamp(rightCardRawX, rightCardMinX, rightCardMaxX);
    const rightCardY = mobileProfile.compact
      ? clamp(compactTopCardY, rightCardMinY, rightCardMaxY)
      : clamp(rightCardRawY, rightCardMinY, rightCardMaxY);
    const bottomDockX = Math.round(this.getArtTuningValue("bottomDockOffsetXRatio") * offsetUnitX);
    const bottomDockY =
      -viewportHeight / 2 +
      edgeInset +
      bottomDockHeight / 2 +
      this.getArtTuningValue("bottomDockOffsetYRatio") * offsetUnitY;

    this.renderSideCardStructure(hostLayer, {
      name: "LeftCardHost",
      x: leftCardX,
      y: leftCardY,
      width: leftCardWidth,
      height: leftCardHeight,
      radius: mobileProfile.compact ? 18 : 24,
      title: "成长概览",
      subtitle: "今日陪伴",
      side: "left",
      summary: mobileProfile.compact,
    });

    this.renderTopBarStructure(hostLayer, {
      x: topBarX,
      y: topBarY,
      width: topBarWidth,
      height: topBarHeight,
    });

    this.renderSideCardStructure(hostLayer, {
      name: "RightCardHost",
      x: rightCardX,
      y: rightCardY,
      width: rightCardWidth,
      height: rightCardHeight,
      radius: mobileProfile.compact ? 18 : 24,
      title: "陪伴记录",
      subtitle: "轻量提醒",
      side: "right",
      summary: mobileProfile.compact,
    });

    this.renderActiveTabPlaceholder(hostLayer, {
      stageY,
      stageWidth,
      stageHeight,
    });

    this.renderBottomDockStructure(hostLayer, {
      x: bottomDockX,
      y: bottomDockY,
      width: bottomDockWidth,
      height: bottomDockHeight,
    });

    renderFoodSelectionPanel({
      parent: hostLayer,
      stageY,
      stageWidth,
      stageHeight,
      isOpen: this.isFoodSelectionPanelOpen,
      foods: appState.getPetFoodInventory(),
      feedRequestInFlight: this.feedRequestInFlight,
      onClose: () => {
        this.isFoodSelectionPanelOpen = false;
        this.render();
      },
      onSelectFood: (food) => void this.handleFoodSelection(food),
      onOpenHomework: () => this.openHomeworkCenterFromFoodShortage(),
      eventTarget: this,
    });

    this.renderHomeworkCenterOverlay(hostLayer, {
      stageY,
      stageWidth,
      stageHeight,
      bottomDockY,
      bottomDockWidth,
      bottomDockHeight,
    });
  }

  private ensureButtonGradientEffectLoaded(): void {
    this.assetStore.ensureButtonGradientEffectLoaded();
  }

  private handleTopBarTabSelect(tab: TopBarNavTab): void {
    if (this.activeTopBarNavTab === tab) {
      return;
    }

    this.petAnimator.resetInactivity();
    this.activeTopBarNavTab = tab;
    if (tab === "bag") {
      this.appendMainInteraction("背包已打开", "当前展示 dashboard 同步到的口粮库存。");
    } else if (tab === "journal") {
      this.appendMainInteraction("日记已打开", "正在读取后端历史事件。");
      void this.tryRefreshJournalEvents();
    } else if (tab === "chat") {
      this.appendMainInteraction("聊天已打开", "可以给宠物发送一条消息。");
      void this.tryRefreshChatHistory();
    } else {
      this.appendMainInteraction("回到宠物主页", "继续查看当前宠物舞台与互动状态。");
    }
    this.render();
  }

  private renderActiveTabPlaceholder(
    parent: Node,
    options: {
      stageY: number;
      stageWidth: number;
      stageHeight: number;
    }
  ): void {
    if (this.activeTopBarNavTab === "petHome") {
      return;
    }

    const viewModel = this.createMainViewModel();
    const isBag = this.activeTopBarNavTab === "bag";
    const isChat = this.activeTopBarNavTab === "chat";
    const panelWidth = Math.max(300, Math.min(460, Math.round(options.stageWidth * 0.38)));
    const panelHeight = Math.max(
      180,
      Math.min(isChat ? 320 : 270, Math.round(options.stageHeight * (isChat ? 0.58 : 0.42)))
    );
    const panel = RuntimeUI.createCard(parent, {
      name: isBag ? "BagPlaceholderPanel" : isChat ? "ChatPlaceholderPanel" : "JournalPlaceholderPanel",
      x: 0,
      y: Math.round(options.stageY),
      width: panelWidth,
      height: panelHeight,
      color: new Color(235, 207, 180, 226),
      innerColor: new Color(255, 252, 247, 238),
      radius: 24,
      borderThickness: 2,
      innerRadius: 22,
    });

    RuntimeUI.createLabel(panel, {
      name: "PlaceholderTitle",
      text: isBag ? "背包" : isChat ? "聊天" : "日记",
      x: 0,
      y: Math.round(panelHeight * 0.32),
      width: panelWidth - 42,
      height: 34,
      fontSize: Math.max(20, Math.min(28, Math.round(panelWidth * 0.07))),
      color: new Color(126, 68, 32, 242),
    });
    if (isBag) {
      renderBagPanelContent({
        panel,
        foods: viewModel.foods,
        panelWidth,
        panelHeight,
        inventoryUseRequestInFlight: this.inventoryUseRequestInFlight,
        formatFoodName: (food) => this.formatFoodName(food),
        resolveFoodIcon: (food) => this.resolveFoodIcon(food),
        resolveFoodEffectText: (food) => this.resolveFoodEffectText(food),
        onUseFood: (food) => void this.handleFoodSelection(food),
        onOpenHomework: () => this.openHomeworkCenterFromFoodShortage(),
        eventTarget: this,
      });
      return;
    }
    if (isChat) {
      const pet = appState.getCurrentPet();
      const messages = appState.getChatHistory();
      const refs = renderPetChatPanel(
        panel,
        {
          messages,
          draft: this.chatCoordinator.getDraft(),
          notice: this.chatCoordinator.buildHint(pet?.name, messages.length, pet?.mood, this.chatSending),
          sending: this.chatSending,
        },
        {
          onSend: () => this.handleChatSend(),
        },
        this,
        {
          x: 0,
          y: -18,
          width: Math.max(280, panelWidth - 30),
          height: Math.max(210, panelHeight - 56),
          historyHeight: Math.max(82, panelHeight - 168),
          inputWidth: Math.max(170, panelWidth - 148),
          sendButtonWidth: 82,
        }
      );
      this.chatInput = refs.input;
      return;
    }
    renderJournalPanelContent({
      panel,
      panelWidth,
      panelHeight,
      diaryDays: appState.getDiaryDays(),
      isLoading: this.journalEventsLoading,
      isLoaded: this.journalEventsLoaded,
      syncMessage: this.journalSyncMessage,
    });
  }

  private async tryRefreshJournalEvents(): Promise<void> {
    if (this.journalEventsLoading || !appState.getCurrentUser() || !appState.getPetId()) {
      devActionLogger.warn("main.journal.skip", {
        loading: this.journalEventsLoading,
        hasUser: Boolean(appState.getCurrentUser()),
        hasPetId: Boolean(appState.getPetId()),
      });
      return;
    }

    devActionLogger.info("main.journal.start", { days: 7 });
    this.journalEventsLoading = true;
    this.journalSyncMessage = null;
    this.render();
    try {
      const result = await petService.loadPetDiary(7);
      devActionLogger.info(result.success ? "main.journal.success" : "main.journal.failure", {
        statusCode: result.statusCode,
        message: result.message,
        days: appState.getDiaryDays().length,
      });
      this.journalEventsLoaded = result.success;
      if (!result.success) {
        this.journalSyncMessage = appState.getDiaryDays().length
          ? "同步失败，当前显示最近一次缓存记录"
          : "日记暂未同步，请稍后再试";
      }
    } catch (error) {
      devActionLogger.error(
        "main.journal.exception",
        error instanceof Error ? error.message : String(error)
      );
      this.journalEventsLoaded = false;
      this.journalSyncMessage = appState.getDiaryDays().length
        ? "网络异常，当前显示最近一次缓存记录"
        : "日记暂未同步，请检查网络后重试";
    } finally {
      this.journalEventsLoading = false;
      if (this.activeTopBarNavTab === "journal") {
        this.render();
      }
    }
  }

  private async tryRefreshChatHistory(): Promise<void> {
    const petId = appState.getPetId();
    if (!petId) {
      devActionLogger.warn("main.chatHistory.skip", "missing petId");
      return;
    }
    const requestSeq = this.chatRefreshSeq + 1;
    this.chatRefreshSeq = requestSeq;
    devActionLogger.info("main.chatHistory.start", { requestSeq });
    try {
      await chatService.refreshHistory(petId, 20, () => requestSeq === this.chatRefreshSeq);
      devActionLogger.info("main.chatHistory.done", { requestSeq });
    } catch (error) {
      devActionLogger.error(
        "main.chatHistory.exception",
        error instanceof Error ? error.message : String(error)
      );
    } finally {
      if (this.activeTopBarNavTab === "chat" && requestSeq === this.chatRefreshSeq) {
        this.render();
      }
    }
  }

  private async handleChatSend(): Promise<void> {
    if (this.chatSending) {
      devActionLogger.warn("main.chat.sendBlocked", "in flight");
      return;
    }
    const petId = appState.getPetId();
    const pet = appState.getCurrentPet();
    const message = (this.chatInput?.string ?? this.chatCoordinator.getDraft()).trim();
    this.chatCoordinator.setDraft(message);

    if (!petId) {
      devActionLogger.warn("main.chat.sendBlocked", "missing petId");
      this.appendMainInteraction("聊天暂不可用", "请先创建宠物再开始聊天。");
      this.render();
      return;
    }
    if (!message) {
      devActionLogger.warn("main.chat.sendBlocked", "empty message");
      this.appendMainInteraction("聊天未发送", "请先输入想对宠物说的话。");
      this.render();
      return;
    }

    const requestSeq = this.chatRefreshSeq + 1;
    this.chatRefreshSeq = requestSeq;
    this.chatSending = true;
    devActionLogger.info("main.chat.sendStart", {
      requestSeq,
      messageLength: message.length,
    });
    this.render();
    try {
      const result = await chatService.sendMessage({
        petId,
        message,
        petMood: pet?.mood,
        canCommit: () => requestSeq === this.chatRefreshSeq,
      });
      if (result.success) {
        devActionLogger.info("main.chat.sendSuccess", {
          requestSeq,
          usedFallback: result.usedFallback,
        });
        this.chatCoordinator.clearDraftIfMatch(message);
        this.appendMainInteraction("聊天已发送", result.usedFallback ? "已使用本地回复兜底。" : "宠物已回复。");
      } else {
        devActionLogger.warn("main.chat.sendFailure", result.message);
        this.appendMainInteraction("聊天发送失败", result.message);
      }
    } catch (error) {
      devActionLogger.error(
        "main.chat.sendException",
        error instanceof Error ? error.message : String(error)
      );
      this.appendMainInteraction("聊天发送失败", "请求异常，请稍后再试。");
    } finally {
      if (requestSeq === this.chatRefreshSeq) {
        this.chatSending = false;
        this.render();
      }
    }
  }

  private renderHomeworkCenterOverlay(
    parent: Node,
    options: {
      stageY: number;
      stageWidth: number;
      stageHeight: number;
      bottomDockY: number;
      bottomDockWidth: number;
      bottomDockHeight: number;
    }
  ): void {
    this.homeworkCenterRefs = null;
    if (!this.isHomeworkCenterOpen) {
      return;
    }

    const host = new Node("HomeworkCenterOverlay");
    host.setParent(parent);
    const stageTop = options.stageY + options.stageHeight / 2;
    const stageBottom = options.stageY - options.stageHeight / 2;
    const bottomDockTop = options.bottomDockY + options.bottomDockHeight / 2;
    const bottomDockBottom = options.bottomDockY - options.bottomDockHeight / 2;
    const overlayTop = Math.max(stageTop, bottomDockTop);
    const overlayBottom = Math.min(stageBottom, bottomDockBottom);
    const overlayHeight =
      (overlayTop - overlayBottom) * this.getArtTuningValue("homeworkOverlayHeightScale");
    const overlayWidth =
      Math.max(options.stageWidth, options.bottomDockWidth) *
      this.getArtTuningValue("homeworkOverlayWidthScale");
    const overlayX = overlayWidth * this.getArtTuningValue("homeworkOverlayOffsetXRatio");
    const overlayY =
      (overlayTop + overlayBottom) / 2 +
      overlayHeight * this.getArtTuningValue("homeworkOverlayOffsetYRatio");
    host.setPosition(Math.round(overlayX), Math.round(overlayY), 0);
    const transform = host.addComponent(UITransform);
    transform.setContentSize(overlayWidth, overlayHeight);
    const baseScale = Math.max(
      0.68,
      Math.min(1, (overlayWidth * 0.94) / 1120, (overlayHeight * 0.94) / 500)
    );
    const scale = Math.max(0.5, Math.min(1.35, baseScale * this.getArtTuningValue("homeworkOverlayScale")));
    host.setScale(scale, scale, 1);

    const hint = this.homeworkCenterCoordinator.getCurrentHint();
    this.homeworkCenterRefs = renderHomeworkCenter(
      host,
      {
        selectedSubject: this.homeworkCenterCoordinator.getSelectedSubject(),
        noteDraft: this.homeworkCenterCoordinator.getCurrentDraft(),
        historySummary: formatHomeworkHistory(appState.getHomeworkHistory(), { limit: 3 }),
        hint: hint.message,
        hintIsWarning: hint.isWarning,
        uploadedImage: this.homeworkCenterCoordinator.getCurrentUploadedImage(),
        uploading: this.homeworkCenterCoordinator.isUploading(),
        submitting: this.homeworkCenterCoordinator.isSubmitting(),
        uploadError: this.homeworkCenterCoordinator.getUploadError(),
        submitError: this.homeworkCenterCoordinator.getSubmitError(),
        rewardFeedback: this.homeworkCenterCoordinator.getRewardFeedback(),
        devResetting: this.homeworkDevResetting,
        devResetMessage: this.homeworkDevResetMessage,
        layout: this.resolveHomeworkCenterLayoutTuning(),
      },
      {
        onSelectSubject: (subject) => this.handleHomeworkSubjectSelect(subject),
        onUploadImage: () => void this.handleHomeworkImageUpload(),
        onRemoveImage: () => this.handleHomeworkImageRemove(),
        onSubmit: () => void this.handleHomeworkSubmit(),
        onBackToOverview: () => this.closeHomeworkCenter(),
        onViewBag: () => this.handleHomeworkViewBag(),
        onContinue: () => this.handleHomeworkContinue(),
        onDevResetToday: () => void this.handleHomeworkDevResetToday(),
      },
      this
    );
  }

  private resolveHomeworkCenterLayoutTuning(): HomeworkCenterLayoutTuning {
    return {
      workCardX: this.getArtTuningValue("homeworkWorkCardX"),
      workCardY: this.getArtTuningValue("homeworkWorkCardY"),
      workCardWidth: this.getArtTuningValue("homeworkWorkCardWidth"),
      workCardHeight: this.getArtTuningValue("homeworkWorkCardHeight"),
      rewardCardX: this.getArtTuningValue("homeworkRewardCardX"),
      rewardCardY: this.getArtTuningValue("homeworkRewardCardY"),
      rewardCardWidth: this.getArtTuningValue("homeworkRewardCardWidth"),
      rewardCardHeight: this.getArtTuningValue("homeworkRewardCardHeight"),
      panelAlpha: this.getArtTuningValue("homeworkPanelAlpha"),
      panelInnerAlpha: this.getArtTuningValue("homeworkPanelInnerAlpha"),
      panelBorderWidth: this.getArtTuningValue("homeworkPanelBorderWidth"),
      panelRadius: this.getArtTuningValue("homeworkPanelRadius"),
      panelGradientAlpha: this.getArtTuningValue("homeworkPanelGradientAlpha"),
      panelGradientRange: this.getArtTuningValue("homeworkPanelGradientRange"),
      panelGradientColorR: this.getArtTuningValue("homeworkPanelGradientColorR"),
      panelGradientColorG: this.getArtTuningValue("homeworkPanelGradientColorG"),
      panelGradientColorB: this.getArtTuningValue("homeworkPanelGradientColorB"),
    };
  }

  private openHomeworkCenterFromFoodShortage(): void {
    devActionLogger.info("main.homework.open", "food shortage");
    this.isFoodSelectionPanelOpen = false;
    this.isHomeworkCenterOpen = true;
    this.appendMainInteraction("打开学习任务", "完成一次学习任务可以获得新的口粮。");
    this.render();
    void this.refreshHomeworkCenterData();
  }

  private closeHomeworkCenter(): void {
    devActionLogger.info("main.homework.close");
    this.syncHomeworkNoteDraft();
    this.isHomeworkCenterOpen = false;
    this.appendMainInteraction("回到宠物主页", "学习任务面板已收起。");
    this.render();
  }

  private handleHomeworkViewBag(): void {
    devActionLogger.info("main.homework.viewBag");
    this.syncHomeworkNoteDraft();
    this.isHomeworkCenterOpen = false;
    this.activeTopBarNavTab = "bag";
    this.appendMainInteraction("查看背包", "正在查看后端同步到的口粮库存。");
    this.render();
  }

  private handleHomeworkContinue(): void {
    this.homeworkCenterCoordinator.resetForContinue();
    this.homeworkDevResetMessage = null;
    this.render();
  }

  private handleHomeworkSubjectSelect(subject: HomeworkSubject): void {
    this.syncHomeworkNoteDraft();
    this.homeworkCenterCoordinator.setSelectedSubject(subject);
    this.render();
  }

  private handleHomeworkImageRemove(): void {
    this.syncHomeworkNoteDraft();
    this.homeworkCenterCoordinator.clearUploadedImage();
    this.render();
  }

  private async refreshHomeworkCenterData(): Promise<void> {
    devActionLogger.info("main.homework.refresh.start");
    await homeworkService.refreshTodayStatus();
    if (this.isHomeworkCenterOpen) {
      this.render();
    }

    const historyResult = await homeworkService.refreshHistory(1, 5);
    devActionLogger.info("main.homework.refresh.result", {
      historySuccess: historyResult.success,
      statusCode: historyResult.statusCode,
    });
    if (this.isHomeworkCenterOpen && historyResult.success) {
      this.render();
    }
  }

  private async handleHomeworkDevResetToday(): Promise<void> {
    if (this.homeworkDevResetting) {
      devActionLogger.warn("main.homework.devResetBlocked", "in flight");
      return;
    }

    devActionLogger.info("main.homework.devReset.start");
    this.syncHomeworkNoteDraft();
    this.homeworkDevResetting = true;
    this.homeworkDevResetMessage = "正在重置今日作业状态...";
    this.render();

    try {
      const result = await homeworkService.resetTodayForDev(appState.getPetId());
      devActionLogger.info(result.success ? "main.homework.devReset.success" : "main.homework.devReset.failure", {
        statusCode: result.statusCode,
        message: result.message,
      });
      if (!result.success) {
        this.homeworkDevResetMessage = result.message ?? "开发重置接口不可用。";
        this.appendMainInteraction("开发重置失败", this.homeworkDevResetMessage);
        return;
      }

      this.homeworkCenterCoordinator.resetForContinue();
      this.homeworkDevResetMessage = result.data?.message ?? "今日作业状态已重置，可重新提交。";
      await homeworkService.refreshTodayStatus();
      await homeworkService.refreshHistory(1, 5);
      this.appendMainInteraction("开发重置完成", this.homeworkDevResetMessage);
    } catch (error) {
      devActionLogger.error(
        "main.homework.devReset.exception",
        error instanceof Error ? error.message : String(error)
      );
      this.homeworkDevResetMessage = "开发重置失败，请确认后端接口已启用。";
      this.appendMainInteraction("开发重置失败", this.homeworkDevResetMessage);
    } finally {
      this.homeworkDevResetting = false;
      if (this.isHomeworkCenterOpen) {
        this.render();
      }
    }
  }

  private async handleHomeworkImageUpload(): Promise<void> {
    this.syncHomeworkNoteDraft();
    if (this.homeworkCenterCoordinator.isUploading() || this.homeworkCenterCoordinator.isSubmitting()) {
      devActionLogger.warn("main.homework.uploadBlocked", "busy");
      return;
    }

    devActionLogger.info("main.homework.picker.start");
    this.appendMainInteraction("选择作业图片", "正在打开手机相册...");
    this.render();

    const image = await this.pickHomeworkImageFile();
    if (!image) {
      devActionLogger.warn("main.homework.uploadCancelled");
      return;
    }

    devActionLogger.info("main.homework.upload.start");
    const uploadTask = this.homeworkCenterCoordinator.uploadCurrentImage(image);
    this.render();
    const feedback = await uploadTask;
    devActionLogger.info(feedback.success ? "main.homework.upload.success" : "main.homework.upload.failure", feedback.message);
    this.appendMainInteraction(
      feedback.success ? "图片已上传" : "图片上传失败",
      feedback.message
    );
    this.render();
  }

  private async handleHomeworkSubmit(): Promise<void> {
    this.syncHomeworkNoteDraft();
    devActionLogger.info("main.homework.submit.start", {
      petId: appState.getPetId(),
    });
    const submitTask = this.homeworkCenterCoordinator.submitCurrent(appState.getPetId());
    this.render();
    const feedback = await submitTask;
    devActionLogger.info(feedback.success ? "main.homework.submit.success" : "main.homework.submit.failure", {
      message: feedback.message,
      rewardStatus: feedback.rewardStatus,
      inventorySynced: feedback.inventorySynced,
      logsSynced: feedback.logsSynced,
      shouldRefreshDashboard: feedback.shouldRefreshDashboard,
    });
    const latestBackendLog = feedback.logsSynced ? appState.getMainEvents()[0] : null;
    const rewardGranted = feedback.rewardStatus === "granted";
    const feedbackTitle = latestBackendLog?.title ?? (rewardGranted ? "作业奖励" : "作业提交");
    const feedbackDetail =
      latestBackendLog?.detail ??
      (rewardGranted
        ? `${feedback.message}。奖励会进入背包，使用后可在日记里看到记录。`
        : feedback.message);
    this.appendMainInteraction(
      feedbackTitle,
      feedbackDetail
    );
    this.render();

    if (feedback.success) {
      await homeworkService.refreshTodayStatus();
      await homeworkService.refreshHistory(1, 5);
      if (this.isHomeworkCenterOpen) {
        this.render();
      }
    }

    if (feedback.success && feedback.rewardStatus === "granted" && feedback.shouldRefreshDashboard) {
      const refreshed = await this.tryRefreshMainDashboard();
      if (!refreshed) {
        this.appendMainInteraction("奖励已发放", "背包刷新暂未完成，稍后重新打开背包即可查看。");
        this.render();
      }
    }
  }

  private syncHomeworkNoteDraft(): void {
    const noteInput = this.homeworkCenterRefs?.noteInput;
    if (!noteInput) {
      return;
    }
    this.homeworkCenterCoordinator.syncCurrentDraft(noteInput.string);
  }

  private async pickHomeworkImageFile(): Promise<PickedHomeworkImage | null> {
    const result = await homeworkImagePickerService.pickImage();
    if (!result.success && result.message) {
      this.appendMainInteraction(result.title ?? "图片选择失败", result.message);
      this.render();
    }
    return result.image ?? null;
  }

  private renderTopBarStructure(
    parent: Node,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const radius = Math.round(options.height * 0.38);
    const topBarShellAlpha = Math.round(this.getArtTuningValue("topBarShellAlpha"));
    const topBarInnerAlpha = Math.round(this.getArtTuningValue("topBarInnerAlpha"));
    const topBarBorderWidth = Math.max(0, this.getArtTuningValue("topBarBorderWidth"));
    const topBarBorderAlpha = Math.round(this.getArtTuningValue("topBarBorderAlpha"));
    const topBarBorderOutset = topBarBorderAlpha > 0 ? topBarBorderWidth : 0;
    const topBarVisualWidth = Math.round(options.width + topBarBorderOutset * 2);
    const topBarVisualHeight = Math.round(options.height + topBarBorderOutset * 2);
    const topBarVisualRadius = Math.round(radius + topBarBorderOutset);
    const topBarShadowAlpha = Math.round(this.getArtTuningValue("topBarShadowAlpha"));
    const topBarShadowSpread = Math.max(
      10,
      Math.round(Math.min(options.width, options.height) * this.getArtTuningValue("topBarShadowSpreadRatio"))
    );
    const brandMarkHeightRatio = this.getArtTuningValue("topBarBrandMarkHeightRatio");
    const brandTextGap = Math.round(this.getArtTuningValue("topBarBrandTextGap"));
    const brandTitleY = Math.round(this.getArtTuningValue("topBarBrandTitleY"));
    const brandTitleFontScale = this.getArtTuningValue("topBarBrandTitleFontScale");
    const brandSubtitleY = Math.round(this.getArtTuningValue("topBarBrandSubtitleY"));
    const brandSubtitleFontScale = this.getArtTuningValue("topBarBrandSubtitleFontScale");
    const navWidthRatio = this.getArtTuningValue("topBarNavWidthRatio");
    const statusWidthRatio = this.getArtTuningValue("topBarStatusWidthRatio");

    this.ensureTopBarShadowAssetsForLayout({
      topBarWidth: topBarVisualWidth,
      topBarHeight: topBarVisualHeight,
      topBarRadius: topBarVisualRadius,
      spread: topBarShadowSpread,
    });

    if (this.topBarShadowSpriteFrame) {
      RuntimeUI.createSpriteFrame(parent, {
        name: "TopBarShadow",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: topBarVisualWidth + topBarShadowSpread * 2,
        height: topBarVisualHeight + topBarShadowSpread * 2,
        spriteFrame: this.topBarShadowSpriteFrame,
        color: new Color(
          SHELL_SHADOW_COLOR.r,
          SHELL_SHADOW_COLOR.g,
          SHELL_SHADOW_COLOR.b,
          topBarShadowAlpha
        ),
      });
    } else {
      RuntimeUI.createBox(parent, {
        name: "TopBarShadowFallback",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: topBarVisualWidth + Math.round(topBarShadowSpread * 0.8),
        height: topBarVisualHeight + Math.round(topBarShadowSpread * 0.8),
        color: new Color(187, 129, 62, Math.max(0, Math.round(topBarShadowAlpha * 0.18))),
        radius: topBarVisualRadius,
      });
    }

    if (topBarBorderOutset > 0) {
      RuntimeUI.createCard(parent, {
        name: "TopBarOuterBorder",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: topBarVisualWidth,
        height: topBarVisualHeight,
        style: "shell",
        borderColor: new Color(235, 207, 180, topBarBorderAlpha),
        radius: topBarVisualRadius,
        lineWidth: topBarBorderOutset * 2,
      });
    }

    const topBar = RuntimeUI.createCard(parent, {
      name: "TopBarShell",
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, topBarShellAlpha),
      innerColor: new Color(255, 253, 249, topBarInnerAlpha),
      radius,
      borderThickness: 0,
      innerRadius: radius,
    });

    const brandMarkSize = Math.max(50, Math.min(56, Math.round(options.height * brandMarkHeightRatio)));
    const brandInsetX = Math.max(16, Math.round(options.width * 0.018));
    const brandMarkX = -options.width / 2 + brandInsetX + brandMarkSize / 2;
    const brandMarkY = 2;
    const brandMarkRadius = Math.round(brandMarkSize * 0.32);
    const brandMark = RuntimeUI.createRoundedClip(topBar, {
      name: "TopBarBrandMark",
      x: Math.round(brandMarkX),
      y: brandMarkY,
      width: brandMarkSize,
      height: brandMarkSize,
      radius: brandMarkRadius,
    });
    const brandMarkGradientFrame = this.getButtonGradientCarrierSpriteFrame();
    if (brandMarkGradientFrame) {
      const brandMarkSprite = RuntimeUI.createSpriteFrame(brandMark, {
        name: "TopBarBrandMarkGradient",
        x: 0,
        y: 0,
        width: brandMarkSize,
        height: brandMarkSize,
        spriteFrame: brandMarkGradientFrame,
      });
      const brandMarkGradientMaterial = this.createButtonGradientMaterial({
        shapeRect: this.resolveSpriteWorldRect(brandMarkSprite.node, brandMarkSize, brandMarkSize),
      });
      if (brandMarkGradientMaterial) {
        brandMarkSprite.sprite.customMaterial = brandMarkGradientMaterial;
        brandMarkSprite.sprite.setMaterial(brandMarkGradientMaterial, 0);
      }
    } else {
      RuntimeUI.createBox(brandMark, {
        name: "TopBarBrandMarkFallback",
        x: 0,
        y: 0,
        width: brandMarkSize,
        height: brandMarkSize,
        color: new Color(245, 160, 72, 255),
        radius: brandMarkRadius,
      });
    }
    RuntimeUI.createCard(topBar, {
      name: "TopBarBrandMarkOutline",
      x: Math.round(brandMarkX),
      y: brandMarkY,
      width: brandMarkSize,
      height: brandMarkSize,
      style: "shell",
      borderColor: new Color(239, 132, 61, 224),
      radius: brandMarkRadius,
      lineWidth: 2,
    });
    brandMark.setSiblingIndex(2);
    RuntimeUI.createLabel(brandMark, {
      name: "TopBarBrandMarkText",
      text: "🐹",
      x: 0,
      y: 0,
      width: brandMarkSize - 8,
      height: brandMarkSize - 8,
      fontSize: Math.max(21, Math.round(brandMarkSize * 0.42)),
      color: new Color(255, 255, 255, 255),
    });
    const brandGlossWidth = Math.round(brandMarkSize * this.getArtTuningValue("topBarBrandGlossWidthRatio"));
    const brandGlossHeight = Math.max(8, Math.round(brandMarkSize * this.getArtTuningValue("topBarBrandGlossHeightRatio")));
    const brandGlossY = Math.round(brandMarkSize * this.getArtTuningValue("topBarBrandGlossOffsetYRatio"));
    const brandGlossAlpha = this.getArtTuningValue("topBarBrandGlossAlpha");
    RuntimeUI.createBox(brandMark, {
      name: "TopBarBrandMarkGlossOverlay",
      x: 0,
      y: brandGlossY,
      width: brandGlossWidth,
      height: brandGlossHeight,
      color: new Color(255, 252, 241, brandGlossAlpha),
      radius: Math.round(brandMarkSize * 0.18),
    });

    const brandTextWidth = Math.max(236, Math.round(options.width * 0.27));
    const brandTextLeft = brandMarkX + brandMarkSize / 2 + Math.max(brandTextGap, Math.round(options.width * 0.008));
    const brandTextX = brandTextLeft + brandTextWidth / 2;
    RuntimeUI.createLabel(topBar, {
      name: "TopBarBrandTitle",
      text: "学伴精灵",
      x: Math.round(brandTextX),
      y: brandTitleY,
      width: brandTextWidth,
      height: 32,
      fontSize: Math.max(24, Math.min(31, Math.round(options.height * (brandTitleFontScale + 0.02)))),
      color: new Color(98, 66, 46, 255),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    RuntimeUI.createLabel(topBar, {
      name: "TopBarBrandSubtitle",
      text: "你的专属萌宠精灵",
      x: Math.round(brandTextX),
      y: brandSubtitleY,
      width: brandTextWidth,
      height: 18,
      fontSize: Math.max(11, Math.min(13, Math.round(options.height * Math.max(0.1, brandSubtitleFontScale - 0.01)))),
      color: new Color(156, 123, 99, 162),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });

    const navWidth = Math.max(330, Math.min(394, Math.round(options.width * navWidthRatio)));
    const navHeight = Math.max(50, Math.min(60, Math.round(options.height * 0.6)));
    const navX = Math.round(options.width * 0.14);
    const navBorderColor = new Color(235, 207, 180, 255);
    const navWrap = RuntimeUI.createCard(topBar, {
      name: "TopBarNavWrap",
      x: navX,
      y: 0,
      width: navWidth,
      height: navHeight,
      color: new Color(255, 255, 255, 136),
      innerColor: new Color(255, 255, 255, 196),
      borderColor: navBorderColor,
      radius: Math.round(navHeight / 2),
      borderThickness: 2,
      innerRadius: Math.round(navHeight / 2) - 2,
    });
    RuntimeUI.createCard(navWrap, {
      name: "TopBarNavWrapOutline",
      x: 0,
      y: 0,
      width: navWidth,
      height: navHeight,
      style: "shell",
      borderColor: navBorderColor,
      radius: Math.round(navHeight / 2),
      lineWidth: 2,
    });

    const navItems: Array<{
      key: TopBarNavTab;
      name: string;
      text: string;
      icon: string;
    }> = [
        { key: "petHome", name: "PetHome", text: "宠物主页", icon: "" },
        { key: "bag", name: "Bag", text: "背包", icon: "" },
        { key: "journal", name: "Journal", text: "日记", icon: "" },
        { key: "chat", name: "Chat", text: "聊天", icon: "" },
      ];
    const navGap = 10;
    const navItemWidth = Math.round((navWidth - 20 - navGap * (navItems.length - 1)) / navItems.length);
    const navItemHeight = navHeight - 14;
    navItems.forEach((item, index) => {
      const itemX = -navWidth / 2 + 10 + navItemWidth / 2 + index * (navItemWidth + navGap);
      const isActive = this.activeTopBarNavTab === item.key;
      if (!isActive) {
        RuntimeUI.createBox(navWrap, {
          name: `TopBarNav${item.name}Idle`,
          x: Math.round(itemX),
          y: 0,
          width: navItemWidth,
          height: navItemHeight,
          color: new Color(255, 250, 243, 82),
          radius: Math.round(navItemHeight / 2),
        });
      }
      if (isActive) {
        const activeNav = RuntimeUI.createRoundedClip(navWrap, {
          name: `TopBarNav${item.name}Active`,
          x: Math.round(itemX),
          y: 0,
          width: navItemWidth,
          height: navItemHeight,
          radius: Math.round(navItemHeight / 2),
        });
        const gradientCarrierFrame = this.getButtonGradientCarrierSpriteFrame();
        if (gradientCarrierFrame) {
          const activeNavSprite = RuntimeUI.createSpriteFrame(activeNav, {
            name: `TopBarNav${item.name}ActiveGradient`,
            x: 0,
            y: 0,
            width: navItemWidth,
            height: navItemHeight,
            spriteFrame: gradientCarrierFrame,
          });
          const activeNavGradientMaterial = this.createButtonGradientMaterial({
            shapeRect: this.resolveSpriteWorldRect(activeNavSprite.node, navItemWidth, navItemHeight),
          });
          if (activeNavGradientMaterial) {
            activeNavSprite.sprite.customMaterial = activeNavGradientMaterial;
            activeNavSprite.sprite.setMaterial(activeNavGradientMaterial, 0);
          }
        } else {
          RuntimeUI.createBox(activeNav, {
            name: `TopBarNav${item.name}ActiveFallback`,
            x: 0,
            y: 0,
            width: navItemWidth,
            height: navItemHeight,
            color: new Color(244, 148, 44, 255),
            radius: Math.round(navItemHeight / 2),
          });
        }
      }
      if (!isActive && item.icon) {
        RuntimeUI.createLabel(navWrap, {
          name: `TopBarNav${item.name}Icon`,
          text: item.icon,
          x: Math.round(itemX - navItemWidth * 0.18),
          y: 0,
          width: 20,
          height: 20,
          fontSize: 13,
          color: new Color(247, 155, 52, 228),
        });
      }
      RuntimeUI.createLabel(navWrap, {
        name: `TopBarNav${item.name}Label`,
        text: item.text,
        x: Math.round(isActive ? itemX : itemX + navItemWidth * 0.06),
        y: 0,
        width: navItemWidth - 14,
        height: navItemHeight - 8,
        fontSize: Math.max(14, Math.min(17, Math.round(options.height * 0.2))),
        color: isActive ? new Color(255, 255, 255, 255) : new Color(126, 93, 69, 232),
      });
      if (isActive) {
        const navGlossWidth = Math.round(navItemWidth * this.getArtTuningValue("topBarNavGlossWidthRatio"));
        const navGlossHeight = Math.max(8, Math.round(navItemHeight * this.getArtTuningValue("topBarNavGlossHeightRatio")));
        const navGlossY = Math.round(navItemHeight * this.getArtTuningValue("topBarNavGlossOffsetYRatio"));
        const navGlossAlpha = this.getArtTuningValue("topBarNavGlossAlpha");
        RuntimeUI.createBox(navWrap, {
          name: `TopBarNav${item.name}GlossOverlay`,
          x: Math.round(itemX),
          y: navGlossY,
          width: navGlossWidth,
          height: navGlossHeight,
          color: new Color(255, 252, 241, navGlossAlpha),
          radius: Math.round(navItemHeight * 0.22),
        });
      }

      const navHitArea = RuntimeUI.createBox(navWrap, {
        name: `TopBarNav${item.name}Hit`,
        x: Math.round(itemX),
        y: 0,
        width: navItemWidth,
        height: navItemHeight,
        color: new Color(255, 255, 255, 0),
        radius: Math.round(navItemHeight / 2),
      });
      const navButton = navHitArea.addComponent(Button);
      navButton.transition = Button.Transition.NONE;
      navHitArea.on(
        Button.EventType.CLICK,
        () => {
          this.handleTopBarTabSelect(item.key);
        },
        this
      );
    });

    const statusWidth = Math.max(118, Math.min(144, Math.round(options.width * statusWidthRatio)));
    const statusHeight = Math.max(48, Math.min(56, Math.round(options.height * 0.58)));
    const statusX = options.width / 2 - brandInsetX - statusWidth / 2;
    const logoutWidth = Math.max(66, Math.min(76, Math.round(options.width * 0.06)));
    const logoutGap = 10;
    const logoutX = Math.round(statusX - statusWidth / 2 - logoutGap - logoutWidth / 2);
    const logoutShell = RuntimeUI.createCard(topBar, {
      name: "TopBarLogoutShell",
      x: logoutX,
      y: 0,
      width: logoutWidth,
      height: statusHeight,
      color: new Color(255, 248, 239, 228),
      innerColor: new Color(255, 255, 255, 184),
      borderColor: new Color(229, 184, 142, 220),
      radius: Math.round(statusHeight / 2),
      borderThickness: 1,
      innerRadius: Math.round(statusHeight / 2) - 1,
    });
    RuntimeUI.createLabel(logoutShell, {
      name: "TopBarLogoutText",
      text: "退出",
      x: 0,
      y: 0,
      width: logoutWidth - 12,
      height: statusHeight - 12,
      fontSize: Math.max(13, Math.min(16, Math.round(options.height * 0.18))),
      color: new Color(126, 82, 54, 244),
    });
    const logoutButton = logoutShell.addComponent(Button);
    logoutButton.transition = Button.Transition.NONE;
    logoutShell.on(Button.EventType.CLICK, this.returnToLogin, this);

    const statusShell = RuntimeUI.createCard(topBar, {
      name: "TopBarStatusShell",
      x: Math.round(statusX),
      y: 0,
      width: statusWidth,
      height: statusHeight,
      color: new Color(225, 223, 239, 255),
      innerColor: new Color(207, 210, 234, 214),
      borderColor: new Color(144, 141, 178, 255),
      radius: Math.round(statusHeight / 2),
      borderThickness: 1,
      innerRadius: Math.round(statusHeight / 2) - 1,
    });
    RuntimeUI.createBox(statusShell, {
      name: "TopBarStatusIconBg",
      x: -statusWidth / 2 + 24,
      y: 0,
      width: 32,
      height: 32,
      color: new Color(182, 188, 227, 255),
      radius: 16,
    });
    RuntimeUI.createLabel(statusShell, {
      name: "TopBarStatusIcon",
      text: resolveStatusIcon(viewModel.displayStatus),
      x: -statusWidth / 2 + 24,
      y: 0,
      width: 22,
      height: 22,
      fontSize: 13,
      color: new Color(96, 115, 208, 255),
    });
    RuntimeUI.createLabel(statusShell, {
      name: "TopBarStatusText",
      text: viewModel.statusValueText,
      x: 22,
      y: 0,
      width: statusWidth - 48,
      height: 20,
      fontSize: Math.max(14, Math.min(17, Math.round(options.height * 0.2))),
      color: new Color(80, 82, 118, 244),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
  }

  private renderBottomDockStructure(
    parent: Node,
    options: {
      x: number;
      y: number;
      width: number;
      height: number;
    }
  ): void {
    const visible = view.getVisibleSize();
    const mobileProfile = this.resolveMobileMainLayoutProfile(
      visible.width || FALLBACK_VIEWPORT.width,
      visible.height || FALLBACK_VIEWPORT.height
    );
    const radius = mobileProfile.compact ? Math.round(Math.min(options.height * 0.46, 30)) : Math.round(Math.min(options.height * 0.32, 28));
    const bottomDockShellAlpha = mobileProfile.compact
      ? Math.min(190, Math.round(this.getArtTuningValue("bottomDockShellAlpha")))
      : Math.round(this.getArtTuningValue("bottomDockShellAlpha"));
    const bottomDockInnerAlpha = mobileProfile.compact
      ? Math.min(132, Math.round(this.getArtTuningValue("bottomDockInnerAlpha")))
      : Math.round(this.getArtTuningValue("bottomDockInnerAlpha"));
    const bottomDockGradientTopAlpha = Math.round(this.getArtTuningValue("bottomDockGradientTopAlpha"));
    const bottomDockGradientBottomAlpha = Math.round(this.getArtTuningValue("bottomDockGradientBottomAlpha"));
    const tileGapRatio = this.getArtTuningValue("bottomDockTileGapRatio");
    const iconWidth = mobileProfile.compact
      ? Math.max(44, Math.min(56, Math.round(options.height * 0.52)))
      : Math.round(this.getArtTuningValue("bottomDockIconWidth"));
    const iconHeight = mobileProfile.compact
      ? Math.max(44, Math.min(56, Math.round(options.height * 0.52)))
      : Math.round(this.getArtTuningValue("bottomDockIconHeight"));
    const iconRadius = Math.min(
      Math.round(Math.min(iconWidth, iconHeight) * this.getArtTuningValue("bottomDockIconRadiusRatio")),
      Math.round(Math.min(iconWidth, iconHeight) / 2)
    );
    const iconCenterY = mobileProfile.compact ? Math.round(options.height * 0.16) : Math.round(iconHeight * 0.42);
    const iconBorderWidth = mobileProfile.compact ? 0 : Math.max(0, this.getArtTuningValue("bottomDockIconBorderWidth"));
    const iconBorderAlpha = mobileProfile.compact ? 0 : Math.round(this.getArtTuningValue("bottomDockIconBorderAlpha"));
    const iconOffsetX = Math.round(this.getArtTuningValue("bottomDockIconOffsetX"));
    const iconOffsetY = Math.round(this.getArtTuningValue("bottomDockIconOffsetY"));
    const iconGlossWidthRatio = this.getArtTuningValue("bottomDockIconGlossWidthRatio");
    const iconGlossHeightRatio = this.getArtTuningValue("bottomDockIconGlossHeightRatio");
    const iconGlossOffsetYRatio = this.getArtTuningValue("bottomDockIconGlossOffsetYRatio");
    const glyphAlpha = Math.round(this.getArtTuningValue("bottomDockGlyphAlpha"));
    const resolveTileSizeScale = (key: ArtTuningKey): number =>
      1 + (this.getArtTuningValue(key) - 1) * BOTTOM_DOCK_TILE_SIZE_TUNING_DAMPING;
    const tileGroupWidthScale = resolveTileSizeScale("bottomDockTileGroupWidthScale");
    const tileWidthScale = resolveTileSizeScale("bottomDockTileWidthScale");
    const tileHeightScale = resolveTileSizeScale("bottomDockTileHeightScale");
    const tileBorderWidth = mobileProfile.compact ? 0 : Math.max(0, this.getArtTuningValue("bottomDockTileBorderWidth"));
    const tileBorderAlpha = mobileProfile.compact ? 0 : Math.round(this.getArtTuningValue("bottomDockTileBorderAlpha"));
    const tileInnerAlpha = mobileProfile.compact ? 0 : Math.round(this.getArtTuningValue("bottomDockTileInnerAlpha"));
    const bottomDockTextOffsetX = Math.round(this.getArtTuningValue("bottomDockTextOffsetX"));
    const bottomDockTextOffsetY = Math.round(this.getArtTuningValue("bottomDockTextOffsetY"));
    const bottomDockTextAlpha = Math.round(this.getArtTuningValue("bottomDockTextAlpha"));
    const bottomDockTextFontSize = mobileProfile.compact
      ? Math.max(20, Math.min(24, Math.round(options.height * 0.22)))
      : Math.round(this.getArtTuningValue("bottomDockTextFontSize"));
    const bottomDockTextColor = new Color(
      mobileProfile.compact ? 104 : Math.round(this.getArtTuningValue("bottomDockTextColorR")),
      mobileProfile.compact ? 62 : Math.round(this.getArtTuningValue("bottomDockTextColorG")),
      mobileProfile.compact ? 38 : Math.round(this.getArtTuningValue("bottomDockTextColorB")),
      mobileProfile.compact ? 244 : bottomDockTextAlpha
    );
    const bottomDockBorderWidth = Math.max(0, this.getArtTuningValue("bottomDockBorderWidth"));
    const bottomDockBorderAlpha = Math.round(this.getArtTuningValue("bottomDockBorderAlpha"));
    const bottomDockBorderOutset = bottomDockBorderAlpha > 0 ? bottomDockBorderWidth : 0;
    const bottomDockVisualWidth = Math.round(options.width + bottomDockBorderOutset * 2);
    const bottomDockVisualHeight = Math.round(options.height + bottomDockBorderOutset * 2);
    const bottomDockVisualRadius = Math.round(radius + bottomDockBorderOutset);
    const bottomDockShadowAlpha = Math.round(this.getArtTuningValue("bottomDockShadowAlpha"));
    const bottomDockShadowSpread = mobileProfile.compact
      ? Math.max(8, Math.round(options.height * 0.18))
      : Math.max(
        10,
        Math.round(Math.min(options.width, options.height) * this.getArtTuningValue("bottomDockShadowSpreadRatio"))
      );

    this.ensureBottomDockShadowAssetsForLayout({
      bottomDockWidth: bottomDockVisualWidth,
      bottomDockHeight: bottomDockVisualHeight,
      bottomDockRadius: bottomDockVisualRadius,
      spread: bottomDockShadowSpread,
    });

    if (this.bottomDockShadowSpriteFrame) {
      RuntimeUI.createSpriteFrame(parent, {
        name: "BottomDockShadow",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: bottomDockVisualWidth + bottomDockShadowSpread * 2,
        height: bottomDockVisualHeight + bottomDockShadowSpread * 2,
        spriteFrame: this.bottomDockShadowSpriteFrame,
        color: new Color(
          SHELL_SHADOW_COLOR.r,
          SHELL_SHADOW_COLOR.g,
          SHELL_SHADOW_COLOR.b,
          bottomDockShadowAlpha
        ),
      });
    } else {
      RuntimeUI.createBox(parent, {
        name: "BottomDockShadowFallback",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: bottomDockVisualWidth + Math.round(bottomDockShadowSpread * 0.8),
        height: bottomDockVisualHeight + Math.round(bottomDockShadowSpread * 0.8),
        color: new Color(187, 129, 62, Math.max(0, Math.round(bottomDockShadowAlpha * 0.18))),
        radius: bottomDockVisualRadius,
      });
    }

    if (bottomDockBorderOutset > 0) {
      RuntimeUI.createCard(parent, {
        name: "BottomDockOuterBorder",
        x: Math.round(options.x),
        y: Math.round(options.y),
        width: bottomDockVisualWidth,
        height: bottomDockVisualHeight,
        style: "shell",
        borderColor: new Color(235, 207, 180, bottomDockBorderAlpha),
        radius: bottomDockVisualRadius,
        lineWidth: bottomDockBorderOutset * 2,
      });
    }

    const dock = RuntimeUI.createCard(parent, {
      name: "BottomDockShell",
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, bottomDockShellAlpha),
      innerColor: new Color(255, 253, 249, bottomDockInnerAlpha),
      radius,
      borderThickness: 0,
      innerRadius: radius,
    });

    const bottomDockGradientFrame = this.getButtonGradientCarrierSpriteFrame();
    if (bottomDockGradientFrame && (bottomDockGradientTopAlpha > 0 || bottomDockGradientBottomAlpha > 0)) {
      const gradientClip = RuntimeUI.createRoundedClip(dock, {
        name: "BottomDockGradientClip",
        x: 0,
        y: 0,
        width: Math.round(options.width),
        height: Math.round(options.height),
        radius,
      });
      const gradientSprite = RuntimeUI.createSpriteFrame(gradientClip, {
        name: "BottomDockGradientOverlay",
        x: 0,
        y: 0,
        width: Math.round(options.width),
        height: Math.round(options.height),
        spriteFrame: bottomDockGradientFrame,
      });
      const gradientMaterial = this.createButtonGradientMaterial({
        shapeRect: this.resolveSpriteWorldRect(gradientSprite.node, Math.round(options.width), Math.round(options.height)),
        topColor: new Color(255, 255, 255, bottomDockGradientTopAlpha),
        bottomColor: new Color(246, 181, 95, bottomDockGradientBottomAlpha),
        glossColor: new Color(255, 255, 255, 0),
        glossRange: new Vec4(1, 1, 0.01, 0),
      });
      if (gradientMaterial) {
        gradientSprite.sprite.customMaterial = gradientMaterial;
        gradientSprite.sprite.setMaterial(gradientMaterial, 0);
      }
    }

    const items = [
      {
        name: "Feed",
        action: "feed" as BottomDockAction,
        icon: "๑ڡ๑",
        topColor: new Color(249, 206, 104, 255),
        bottomColor: new Color(238, 157, 50, 255),
        borderColor: new Color(226, 143, 45, 214),
        text: "喂食",
        glyphSizeKey: "bottomDockFeedGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockFeedGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockFeedGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Play",
        action: "play" as BottomDockAction,
        icon: "ᕕᐛᕗ",
        topColor: new Color(207, 183, 255, 255),
        bottomColor: new Color(154, 121, 226, 255),
        borderColor: new Color(143, 112, 214, 210),
        text: "玩耍",
        glyphSizeKey: "bottomDockPlayGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockPlayGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockPlayGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Bath",
        action: "bath" as BottomDockAction,
        icon: "≋",
        topColor: new Color(145, 226, 176, 255),
        bottomColor: new Color(86, 190, 131, 255),
        borderColor: new Color(78, 176, 121, 210),
        text: "洗澡",
        glyphSizeKey: "bottomDockBathGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockBathGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockBathGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Sleep",
        action: "sleep" as BottomDockAction,
        icon: "Zz",
        topColor: new Color(157, 176, 255, 255),
        bottomColor: new Color(96, 119, 220, 255),
        borderColor: new Color(88, 108, 207, 210),
        text: "睡觉",
        glyphSizeKey: "bottomDockSleepGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockSleepGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockSleepGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Music",
        action: "music" as BottomDockAction,
        icon: "♪",
        topColor: new Color(248, 202, 92, 255),
        bottomColor: new Color(231, 150, 41, 255),
        borderColor: new Color(218, 137, 38, 210),
        text: "听歌",
        glyphSizeKey: "bottomDockMusicGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockMusicGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockMusicGlyphOffsetY" as ArtTuningKey,
      },
      {
        name: "Care",
        action: "care" as BottomDockAction,
        icon: "♡",
        topColor: new Color(251, 179, 199, 255),
        bottomColor: new Color(226, 111, 148, 255),
        borderColor: new Color(211, 101, 137, 210),
        text: "心情",
        glyphSizeKey: "bottomDockCareGlyphSizeScale" as ArtTuningKey,
        glyphOffsetXKey: "bottomDockCareGlyphOffsetX" as ArtTuningKey,
        glyphOffsetYKey: "bottomDockCareGlyphOffsetY" as ArtTuningKey,
      },
    ];
    const paddingX = Math.max(mobileProfile.compact ? 8 : 12, Math.round(options.width * (mobileProfile.compact ? 0.008 : 0.012)));
    const gap = Math.max(
      mobileProfile.compact ? 8 : 12,
      Math.round(options.width * tileGapRatio * mobileProfile.stageInsetScale)
    );
    const baseGroupWidth = options.width - paddingX * 2;
    const groupWidth = Math.max(items.length * 42 + gap * (items.length - 1), baseGroupWidth * tileGroupWidthScale);
    const trackTileWidth = (groupWidth - gap * (items.length - 1)) / items.length;
    const tileWidth = Math.max(38, Math.round(trackTileWidth * tileWidthScale * (mobileProfile.compact ? 0.88 : 1)));
    const baseScaledTileHeight = (options.height - (mobileProfile.compact ? 8 : 28)) * tileHeightScale;
    const groupLeft = -groupWidth / 2;
    items.forEach((item, index) => {
      const tileHeight = Math.max(mobileProfile.compact ? 64 : 42, Math.round(baseScaledTileHeight));
      const x = groupLeft + trackTileWidth / 2 + index * (trackTileWidth + gap);
      const tile = RuntimeUI.createCard(dock, {
        name: `BottomDock${item.name}Tile`,
        x: Math.round(x),
        y: 0,
        width: tileWidth,
        height: tileHeight,
        color: new Color(235, 207, 180, tileBorderAlpha),
        innerColor: new Color(255, 251, 245, tileInnerAlpha),
        radius: mobileProfile.compact ? 18 : 24,
        borderThickness: tileBorderWidth,
        innerRadius: Math.max(0, (mobileProfile.compact ? 18 : 24) - tileBorderWidth),
      });
      const iconClip = RuntimeUI.createRoundedClip(tile, {
        name: `BottomDock${item.name}IconBg`,
        x: iconOffsetX,
        y: iconCenterY + iconOffsetY,
        width: iconWidth,
        height: iconHeight,
        radius: iconRadius,
      });
      const iconGradientFrame = this.getButtonGradientCarrierSpriteFrame();
      if (iconGradientFrame) {
        const iconSprite = RuntimeUI.createSpriteFrame(iconClip, {
          name: `BottomDock${item.name}IconGradient`,
          x: 0,
          y: 0,
          width: iconWidth,
          height: iconHeight,
          spriteFrame: iconGradientFrame,
        });
        const iconGradientMaterial = this.createButtonGradientMaterial({
          shapeRect: this.resolveSpriteWorldRect(iconSprite.node, iconWidth, iconHeight),
          topColor: item.topColor,
          bottomColor: item.bottomColor,
          glossColor: new Color(255, 252, 241, 42),
          glossRange: new Vec4(0.62, 0.98, 0.16, 0),
        });
        if (iconGradientMaterial) {
          iconSprite.sprite.customMaterial = iconGradientMaterial;
          iconSprite.sprite.setMaterial(iconGradientMaterial, 0);
        }
      } else {
        RuntimeUI.createBox(iconClip, {
          name: `BottomDock${item.name}IconFallback`,
          x: 0,
          y: 0,
          width: iconWidth,
          height: iconHeight,
          color: item.bottomColor,
          radius: iconRadius,
        });
      }
      RuntimeUI.createBox(iconClip, {
        name: `BottomDock${item.name}IconGloss`,
        x: 0,
        y: Math.round(iconHeight * iconGlossOffsetYRatio),
        width: Math.round(iconWidth * iconGlossWidthRatio),
        height: Math.max(6, Math.round(iconHeight * iconGlossHeightRatio)),
        color: new Color(255, 252, 241, 42),
        radius: Math.round(iconRadius * 0.55),
      });
      RuntimeUI.createCard(tile, {
        name: `BottomDock${item.name}IconOutline`,
        x: iconOffsetX,
        y: iconCenterY + iconOffsetY,
        width: iconWidth,
        height: iconHeight,
        style: "shell",
        borderColor: new Color(item.borderColor.r, item.borderColor.g, item.borderColor.b, iconBorderAlpha),
        radius: iconRadius,
        lineWidth: iconBorderWidth,
      });
      RuntimeUI.createLabel(tile, {
        name: `BottomDock${item.name}Icon`,
        text: item.icon,
        x: iconOffsetX + Math.round(this.getArtTuningValue(item.glyphOffsetXKey)),
        y: iconCenterY + iconOffsetY + Math.round(this.getArtTuningValue(item.glyphOffsetYKey)),
        width: Math.max(28, iconWidth - 8),
        height: Math.max(24, iconHeight - 8),
        fontSize: Math.max(
          10,
          Math.round(Math.min(iconWidth, iconHeight) * 0.38 * this.getArtTuningValue(item.glyphSizeKey))
        ),
        color: new Color(112, 76, 49, glyphAlpha),
      });
      RuntimeUI.createLabel(tile, {
        name: `BottomDock${item.name}Text`,
        text: item.text,
        x: bottomDockTextOffsetX,
        y: (mobileProfile.compact ? -Math.round(options.height * 0.28) : -30) + bottomDockTextOffsetY,
        width: tileWidth - 12,
        height: 24,
        fontSize: bottomDockTextFontSize,
        color: bottomDockTextColor,
      });
      const hitArea = RuntimeUI.createBox(tile, {
        name: `BottomDock${item.name}Hit`,
        x: 0,
        y: 0,
        width: tileWidth,
        height: tileHeight,
        color: new Color(255, 255, 255, 0),
        radius: mobileProfile.compact ? 18 : 24,
      });
      const actionButton = hitArea.addComponent(Button);
      actionButton.transition = Button.Transition.NONE;
      hitArea.on(Button.EventType.CLICK, () => this.handleBottomDockAction(item.action), this);
    });
  }

  private renderLayoutHostGuide(
    parent: Node,
    options: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      label: string;
    }
  ): void {
    RuntimeUI.createBox(parent, {
      name: `${options.name}Fill`,
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(255, 250, 243, 52),
      radius: options.radius,
    });

    RuntimeUI.createCard(parent, {
      name: `${options.name}Outline`,
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      style: "shell",
      borderColor: new Color(231, 193, 150, 214),
      radius: options.radius,
      lineWidth: 3,
    });

    const labelWidth = Math.max(112, Math.min(options.width - 20, 168));
    const labelHeight = 28;
    const labelY = options.y + options.height / 2 - labelHeight / 2 - 14;
    RuntimeUI.createBox(parent, {
      name: `${options.name}LabelBg`,
      x: Math.round(options.x),
      y: Math.round(labelY),
      width: Math.round(labelWidth),
      height: labelHeight,
      color: new Color(255, 255, 255, 228),
      radius: 14,
    });

    RuntimeUI.createLabel(parent, {
      name: `${options.name}Label`,
      text: options.label,
      x: Math.round(options.x),
      y: Math.round(labelY),
      width: Math.round(labelWidth - 14),
      height: 18,
      fontSize: 12,
      color: new Color(126, 93, 69, 214),
    });
  }

  private renderSideCardStructure(
    parent: Node,
    options: {
      name: string;
      x: number;
      y: number;
      width: number;
      height: number;
      radius: number;
      title: string;
      subtitle: string;
      side: "left" | "right";
      summary?: boolean;
    }
  ): void {
    const card = RuntimeUI.createCard(parent, {
      name: options.name,
      x: Math.round(options.x),
      y: Math.round(options.y),
      width: Math.round(options.width),
      height: Math.round(options.height),
      color: new Color(235, 207, 180, 214),
      innerColor: new Color(255, 252, 247, 208),
      radius: Math.round(options.radius * 1.08),
      borderThickness: 2,
      innerRadius: Math.max(0, Math.round(options.radius * 1.08) - 2),
    });

    if (options.name === "PhoneLeftStatus") {
      this.renderPhoneLeftStatusContent(card, options);
      return;
    }

    if (options.summary) {
      if (options.side === "left") {
        this.renderLeftStatusSummaryCardContent(card, options);
        return;
      }

      this.renderRightLogSummaryCardContent(card, options);
      return;
    }

    if (options.side === "left") {
      this.renderLeftStatusCardContent(card, options);
      return;
    }

    this.renderRightLogCardContent(card, options);
  }

  private renderPhoneLeftStatusContent(
    card: Node,
    options: {
      name: string;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const cardWidth = options.width;
    const cardHeight = options.height;
    const topY = cardHeight / 2;
    RuntimeUI.createLabel(card, {
      name: `${options.name}PhoneName`,
      text: viewModel.petName,
      x: 0,
      y: Math.round(topY - cardHeight * 0.11),
      width: Math.round(cardWidth * 0.82),
      height: 34,
      fontSize: Math.max(22, Math.min(30, Math.round(cardWidth * 0.13))),
      color: new Color(104, 61, 36, 244),
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}PhoneLevel`,
      text: viewModel.levelText,
      x: 0,
      y: Math.round(topY - cardHeight * 0.22),
      width: Math.round(cardWidth * 0.78),
      height: 24,
      fontSize: Math.max(14, Math.min(18, Math.round(cardWidth * 0.075))),
      color: new Color(151, 105, 76, 210),
    });

    const rows = [
      { name: "Satiety", label: "饱腹", value: viewModel.satiety, note: this.resolvePhoneStatusNote("satiety", viewModel.satiety), color: new Color(236, 96, 132, 232) },
      { name: "Stamina", label: "体力", value: viewModel.stamina, note: this.resolvePhoneStatusNote("stamina", viewModel.stamina), color: new Color(110, 201, 74, 232) },
      { name: "Mood", label: "心情", value: viewModel.mood, note: this.resolvePhoneStatusNote("mood", viewModel.mood), color: new Color(236, 96, 132, 232) },
    ];
    const rowGap = Math.max(56, Math.round(cardHeight * 0.18));
    const rowStartY = Math.round(topY - cardHeight * 0.4);
    const barWidth = Math.round(cardWidth * 0.58);
    const barHeight = Math.max(10, Math.round(cardHeight * 0.035));
    rows.forEach((row, index) => {
      const y = rowStartY - index * rowGap;
      const value = row.value ?? 0;
      RuntimeUI.createLabel(card, {
        name: `${options.name}${row.name}PhoneLabel`,
        text: row.label,
        x: Math.round(-cardWidth * 0.23),
        y: y + Math.round(rowGap * 0.24),
        width: Math.round(cardWidth * 0.34),
        height: 24,
        fontSize: Math.max(16, Math.min(21, Math.round(cardWidth * 0.09))),
        color: new Color(104, 61, 36, 236),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      RuntimeUI.createLabel(card, {
        name: `${options.name}${row.name}PhoneNote`,
        text: row.note,
        x: Math.round(cardWidth * 0.21),
        y: y + Math.round(rowGap * 0.24),
        width: Math.round(cardWidth * 0.38),
        height: 22,
        fontSize: Math.max(12, Math.min(16, Math.round(cardWidth * 0.066))),
        color: new Color(151, 105, 76, 184),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      RuntimeUI.createBox(card, {
        name: `${options.name}${row.name}PhoneBarBg`,
        x: Math.round(cardWidth * 0.04),
        y: y - Math.round(rowGap * 0.2),
        width: barWidth,
        height: barHeight,
        color: new Color(255, 255, 255, 220),
        radius: Math.round(barHeight / 2),
      });
      RuntimeUI.createBox(card, {
        name: `${options.name}${row.name}PhoneBarFill`,
        x: Math.round(cardWidth * 0.04 - barWidth / 2 + (barWidth * value) / 200),
        y: y - Math.round(rowGap * 0.2),
        width: Math.max(1, Math.round((barWidth * value) / 100)),
        height: Math.max(1, barHeight - 2),
        color: row.color,
        radius: Math.round((barHeight - 2) / 2),
      });
    });
  }

  private resolvePhoneStatusNote(kind: "satiety" | "stamina" | "mood", value: number | null): string {
    if (value === null) {
      return "待同步";
    }
    if (kind === "satiety") {
      return value < 35 ? "有点饿" : value < 70 ? "刚刚好" : "吃得饱";
    }
    if (kind === "stamina") {
      return value < 35 ? "想休息" : value < 70 ? "还不错" : "精神很好";
    }
    return value < 35 ? "要安慰" : value < 70 ? "心情平稳" : "心情不错";
  }

  private renderLeftStatusSummaryCardContent(
    card: Node,
    options: {
      name: string;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const cardWidth = options.width;
    const cardHeight = options.height;
    const topY = cardHeight / 2;
    RuntimeUI.createLabel(card, {
      name: `${options.name}SummaryName`,
      text: viewModel.petName,
      x: 0,
      y: Math.round(topY - cardHeight * 0.11),
      width: Math.round(cardWidth * 0.82),
      height: 30,
      fontSize: Math.max(16, Math.min(22, Math.round(cardWidth * 0.115))),
      color: new Color(126, 68, 32, 240),
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}SummaryLevel`,
      text: viewModel.levelText,
      x: 0,
      y: Math.round(topY - cardHeight * 0.24),
      width: Math.round(cardWidth * 0.74),
      height: 24,
      fontSize: Math.max(13, Math.min(18, Math.round(cardWidth * 0.078))),
      color: new Color(151, 105, 76, 214),
    });

    const rows = [
      { name: "Satiety", label: "饱", value: viewModel.satiety, color: new Color(255, 129, 153, 235) },
      { name: "Stamina", label: "体", value: viewModel.stamina, color: new Color(124, 211, 64, 235) },
      { name: "Mood", label: "心", value: viewModel.mood, color: new Color(255, 113, 139, 235) },
    ];
    const rowGap = Math.max(34, Math.round(cardHeight * 0.16));
    const rowStartY = Math.round(topY - cardHeight * 0.42);
    const barWidth = Math.round(cardWidth * 0.48);
    const barHeight = Math.max(8, Math.round(cardHeight * 0.035));
    rows.forEach((row, index) => {
      const y = rowStartY - index * rowGap;
      const value = row.value ?? 0;
      RuntimeUI.createLabel(card, {
        name: `${options.name}${row.name}SummaryLabel`,
        text: row.label,
        x: Math.round(-cardWidth * 0.28),
        y,
        width: 28,
        height: 24,
        fontSize: Math.max(14, Math.min(20, Math.round(cardWidth * 0.085))),
        color: new Color(126, 68, 32, 226),
      });
      RuntimeUI.createBox(card, {
        name: `${options.name}${row.name}SummaryBarBg`,
        x: Math.round(cardWidth * 0.08),
        y,
        width: barWidth,
        height: barHeight,
        color: new Color(255, 255, 255, 218),
        radius: Math.round(barHeight / 2),
      });
      RuntimeUI.createBox(card, {
        name: `${options.name}${row.name}SummaryBarFill`,
        x: Math.round(cardWidth * 0.08 - barWidth / 2 + (barWidth * value) / 200),
        y,
        width: Math.max(1, Math.round((barWidth * value) / 100)),
        height: Math.max(1, barHeight - 2),
        color: row.color,
        radius: Math.round((barHeight - 2) / 2),
      });
    });
  }

  private renderRightLogSummaryCardContent(
    card: Node,
    options: {
      name: string;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const cardWidth = options.width;
    const cardHeight = options.height;
    const topY = cardHeight / 2;
    RuntimeUI.createLabel(card, {
      name: `${options.name}SummaryTitle`,
      text: viewModel.displayStatus,
      x: 0,
      y: Math.round(topY - cardHeight * 0.26),
      width: Math.round(cardWidth * 0.82),
      height: 30,
      fontSize: Math.max(18, Math.min(24, Math.round(cardWidth * 0.13))),
      color: new Color(126, 68, 32, 236),
    });

    ["今日口粮已送达", "轻点宠物陪它互动"].forEach((text, index) => {
      const label = RuntimeUI.createLabel(card, {
        name: `${options.name}SummaryHint${index + 1}`,
        text,
        x: 0,
        y: Math.round(topY - cardHeight * (0.55 + index * 0.22)),
        width: Math.round(cardWidth * 0.78),
        height: 24,
        fontSize: Math.max(13, Math.min(18, Math.round(cardWidth * 0.088))),
        color: new Color(126, 68, 32, index === 0 ? 218 : 172),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      label.enableWrapText = false;
      label.overflow = Label.Overflow.CLAMP;
    });
  }

  private renderLeftStatusCardContent(
    card: Node,
    options: {
      name: string;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const cardWidth = options.width;
    const cardHeight = options.height;
    const topY = cardHeight / 2;
    const leftX = -cardWidth / 2;
    const titleY = Math.round(topY - cardHeight * this.getArtTuningValue("leftStatusTitleYRatio"));
    const pawX = Math.round(cardWidth * this.getArtTuningValue("leftStatusPawXRatio"));
    const pawY = titleY + Math.round(this.getArtTuningValue("leftStatusPawYOffset"));
    const pawScale = this.getArtTuningValue("leftStatusPawScale");

    renderPawTitleDecor(card, {
      name: `${options.name}LeftPaw`,
      x: -pawX,
      y: pawY,
      mirrored: false,
      scale: pawScale,
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}Title`,
      text: viewModel.petName,
      x: 0,
      y: titleY,
      width: Math.round(cardWidth * 0.58),
      height: 38,
      fontSize: Math.max(16, Math.min(32, Math.round(cardWidth * this.getArtTuningValue("leftStatusTitleFontScale")))),
      color: new Color(126, 68, 32, 240),
    });
    renderPawTitleDecor(card, {
      name: `${options.name}RightPaw`,
      x: pawX,
      y: pawY,
      mirrored: true,
      scale: pawScale,
    });

    const levelY = Math.round(topY - cardHeight * this.getArtTuningValue("leftStatusLevelYRatio"));
    const levelPillX = Math.round(cardWidth * this.getArtTuningValue("leftStatusLevelPillXRatio"));
    const levelPillWidth = Math.round(cardWidth * this.getArtTuningValue("leftStatusLevelPillWidthRatio"));
    const levelPillHeight = Math.round(cardHeight * this.getArtTuningValue("leftStatusLevelPillHeightRatio"));
    RuntimeUI.createBox(card, {
      name: `${options.name}LevelPill`,
      x: levelPillX,
      y: levelY,
      width: levelPillWidth,
      height: levelPillHeight,
      color: new Color(255, 247, 230, 224),
      radius: Math.round(levelPillHeight * 0.5),
    });
    RuntimeUI.createBox(card, {
      name: `${options.name}LevelPillGlow`,
      x: levelPillX,
      y: levelY + Math.round(levelPillHeight * 0.18),
      width: Math.round(levelPillWidth * 0.78),
      height: Math.round(levelPillHeight * 0.28),
      color: new Color(255, 255, 255, 76),
      radius: Math.round(levelPillHeight * 0.16),
    });
    renderCloudBadge(card, {
      name: `${options.name}LevelBadge`,
      x: Math.round(leftX + cardWidth * this.getArtTuningValue("leftStatusLevelBadgeXRatio")),
      y: levelY,
      size: Math.round(
        Math.min(
          cardWidth * this.getArtTuningValue("leftStatusLevelBadgeWidthRatio"),
          cardHeight * this.getArtTuningValue("leftStatusLevelBadgeHeightRatio")
        )
      ),
      text: viewModel.levelBadgeText,
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}LevelText`,
      text: viewModel.levelText,
      x: Math.round(cardWidth * this.getArtTuningValue("leftStatusLevelTextXRatio")),
      y: levelY + 1,
      width: Math.round(cardWidth * 0.46),
      height: 26,
      fontSize: Math.max(16, Math.min(32, Math.round(cardWidth * this.getArtTuningValue("leftStatusLevelTextFontScale")))),
      color: new Color(126, 68, 32, 236),
    });

    const dividerY = Math.round(topY - cardHeight * this.getArtTuningValue("leftStatusDividerYRatio"));
    renderDottedDivider(card, {
      name: `${options.name}DottedDivider`,
      y: dividerY,
      width: Math.round(cardWidth * this.getArtTuningValue("leftStatusDividerWidthRatio")),
      dotCount: 26,
    });

    const rows = [
      { name: "Satiety", icon: "🍚", label: "饱腹值", value: viewModel.satiety, color: new Color(255, 129, 153, 235) },
      { name: "Stamina", icon: "⚡", label: "体力值", value: viewModel.stamina, color: new Color(124, 211, 64, 235) },
      { name: "Mood", icon: "❤", label: "心情值", value: viewModel.mood, color: new Color(255, 113, 139, 235) },
    ];
    const rowStartY = dividerY - Math.round(cardHeight * this.getArtTuningValue("leftStatusRowsTopGapRatio"));
    const rowGap = Math.round(cardHeight * this.getArtTuningValue("leftStatusRowsGapRatio"));
    rows.forEach((row, index) => {
      this.renderLeftStatusRow(card, {
        name: `${options.name}${row.name}`,
        x: 0,
        y: rowStartY - index * rowGap,
        width: cardWidth,
        icon: row.icon,
        label: row.label,
        value: row.value,
        color: row.color,
      });
    });

    renderFlowerCluster(card, {
      name: `${options.name}FlowerDecor`,
      x: Math.round(cardWidth * this.getArtTuningValue("leftStatusFlowerXRatio")),
      y: Math.round(-cardHeight / 2 + this.getArtTuningValue("leftStatusFlowerYOffset")),
      scale: Math.max(0.45, Math.min(1.4, (cardWidth / 310) * this.getArtTuningValue("leftStatusFlowerScale"))),
    });
  }

  private renderLeftStatusRow(
    parent: Node,
    options: {
      name: string;
      x: number;
      y: number;
      width: number;
      icon: string;
      label: string;
      value: number | null;
      color: Color;
    }
  ): void {
    const progressValue = options.value ?? 0;
    const valueText = options.value === null ? "--/100" : `${progressValue}/100`;
    const iconSize = Math.max(34, Math.min(82, Math.round(options.width * this.getArtTuningValue("leftStatusRowIconSizeRatio"))));
    const iconX = Math.round(-options.width * this.getArtTuningValue("leftStatusRowIconXRatio"));
    const labelX = Math.round(-options.width * this.getArtTuningValue("leftStatusRowLabelXRatio"));
    const valueX = Math.round(options.width * this.getArtTuningValue("leftStatusRowValueXRatio"));
    const barX = Math.round(options.width * this.getArtTuningValue("leftStatusRowBarXRatio"));
    const barWidth = Math.round(options.width * this.getArtTuningValue("leftStatusRowBarWidthRatio"));
    const barHeight = Math.max(10, Math.round(iconSize * this.getArtTuningValue("leftStatusRowBarHeightScale")));
    RuntimeUI.createCard(parent, {
      name: `${options.name}IconBg`,
      x: iconX,
      y: options.y + 1,
      width: iconSize,
      height: iconSize,
      color: new Color(244, 197, 148, 190),
      innerColor: new Color(255, 252, 244, 246),
      radius: Math.round(iconSize / 2),
      borderThickness: 1,
      innerRadius: Math.round(iconSize / 2) - 1,
    });
    RuntimeUI.createBox(parent, {
      name: `${options.name}IconGloss`,
      x: iconX,
      y: options.y + Math.round(iconSize * 0.18),
      width: Math.round(iconSize * 0.54),
      height: Math.round(iconSize * 0.2),
      color: new Color(255, 255, 255, 72),
      radius: Math.round(iconSize * 0.1),
    });
    RuntimeUI.createLabel(parent, {
      name: `${options.name}Icon`,
      text: options.icon,
      x: iconX,
      y: options.y + 1,
      width: Math.round(iconSize * 0.76),
      height: Math.round(iconSize * 0.68),
      fontSize: Math.round(iconSize * 0.52),
      color: new Color(255, 129, 153, 235),
    });
    RuntimeUI.createLabel(parent, {
      name: `${options.name}Label`,
      text: options.label,
      x: labelX,
      y: options.y + Math.round(iconSize * 0.255),
      width: Math.round(options.width * 0.28),
      height: 22,
      fontSize: Math.max(13, Math.min(26, Math.round(options.width * this.getArtTuningValue("leftStatusRowLabelFontScale")))),
      color: new Color(126, 68, 32, 226),
    });
    RuntimeUI.createLabel(parent, {
      name: `${options.name}Value`,
      text: valueText,
      x: valueX,
      y: options.y + Math.round(iconSize * 0.255),
      width: Math.round(options.width * 0.22),
      height: 22,
      fontSize: Math.max(12, Math.min(24, Math.round(options.width * this.getArtTuningValue("leftStatusRowValueFontScale")))),
      color: new Color(126, 68, 32, 226),
    });
    RuntimeUI.createBox(parent, {
      name: `${options.name}BarShadow`,
      x: barX,
      y: options.y - Math.round(iconSize * 0.27),
      width: barWidth,
      height: barHeight,
      color: new Color(163, 122, 92, 34),
      radius: Math.round(barHeight / 2),
    });
    RuntimeUI.createBox(parent, {
      name: `${options.name}BarBg`,
      x: barX,
      y: options.y - Math.round(iconSize * 0.235),
      width: barWidth,
      height: barHeight,
      color: new Color(255, 255, 255, 226),
      radius: Math.round(barHeight / 2),
    });
    RuntimeUI.createBox(parent, {
      name: `${options.name}BarFill`,
      x: Math.round(barX - barWidth / 2 + (barWidth * progressValue) / 200),
      y: options.y - Math.round(iconSize * 0.235),
      width: Math.round((barWidth * progressValue) / 100),
      height: Math.max(1, barHeight - 2),
      color: options.color,
      radius: Math.round((barHeight - 2) / 2),
    });
    RuntimeUI.createBox(parent, {
      name: `${options.name}BarHighlight`,
      x: Math.round(barX - barWidth / 2 + (barWidth * progressValue) / 200),
      y: options.y - Math.round(iconSize * 0.17),
      width: Math.round((barWidth * progressValue) / 100),
      height: Math.max(4, Math.round(barHeight * 0.32)),
      color: new Color(255, 255, 255, 74),
      radius: Math.round(barHeight * 0.16),
    });
  }

  private appendMainInteraction(title: string, detail: string): void {
    const latest = this.interactionEntries[0];
    if (latest?.title === title && latest.detail === detail) {
      return;
    }
    this.interactionEntries = [{ title, detail, createdAt: new Date().toISOString() }, ...this.interactionEntries].slice(0, 3);
  }

  private handleBottomDockAction(action: BottomDockAction): void {
    this.petAnimator.resetInactivity();
    if (action === "feed") {
      void this.handleFeedAction();
      return;
    }

    if (action === "sleep" || action === "play" || action === "care") {
      void this.handleCorePetAction(action);
      return;
    }

    const feedbackByAction: Record<Exclude<BottomDockAction, "feed" | CorePetAction>, MainInteractionEntry> = {
      bath: {
        title: "洗澡入口",
        detail: "当前未接入真实洗澡接口，本次不改变正式数值。",
        createdAt: new Date().toISOString(),
      },
      music: {
        title: "播放音乐",
        detail: "当前未接入真实音乐接口，本次不改变正式数值。",
        createdAt: new Date().toISOString(),
      },
    };

    const feedback = feedbackByAction[action];
    if (action === "music") {
      this.triggerVisualState("listening", PET_VISUAL_MUSIC_DURATION_MS);
      this.showPetBubble("这首歌好舒服。", "actionFeedback");
    }
    this.appendMainInteraction(feedback.title, feedback.detail);
    this.render();
  }

  private async handleCorePetAction(action: CorePetAction): Promise<void> {
    if (!this.reserveCoreActionTapSlot(action)) {
      return;
    }

    devActionLogger.info("main.petAction.start", action);
    if (this.feedRequestInFlight || this.inventoryUseRequestInFlight) {
      devActionLogger.warn("main.petAction.blocked", "inventory request in flight");
      this.appendMainInteraction("正在同步精灵状态", "背包使用请求还在处理，请稍后再试。");
      this.render();
      return;
    }

    const beginResult = this.petInteraction.beginCoreAction(action);
    if (beginResult.ok === false) {
      devActionLogger.warn("main.petAction.blocked", beginResult.reason);
      if (beginResult.reason === "disposed") {
        return;
      }
      this.appendMainInteraction("操作进行中", "已有互动请求在处理，已忽略重复点击。");
      this.render();
      return;
    }

    if (this.dashboardLoading) {
      devActionLogger.info("main.petAction.waitDashboard", action);
      this.appendMainInteraction("正在同步精灵状态", "正在等待 dashboard 同步完成，随后继续本次互动。");
      this.render();
      await (this.dashboardRefreshPromise ?? Promise.resolve(false));
      if (this.dashboardLoading) {
        devActionLogger.warn("main.petAction.blocked", "dashboard still loading");
        this.petInteraction.clearCoreAction(action);
        this.appendMainInteraction("互动暂不可用", "dashboard 仍在同步中，请稍后再试。");
        this.render();
        return;
      }
    }

    const viewModel = this.createMainViewModel();
    if (action === "sleep" && viewModel.stamina !== null && viewModel.stamina >= 90) {
      devActionLogger.warn("main.petAction.blocked", "sleep stamina high");
      this.petInteraction.clearCoreAction(action);
      this.appendMainInteraction("精灵现在还不困哦", "体力已经很充足，本次不发起休息请求。");
      this.render();
      return;
    }
    if (action === "play" && viewModel.stamina !== null && viewModel.stamina <= 10) {
      devActionLogger.warn("main.petAction.blocked", "play stamina low");
      this.petInteraction.clearCoreAction(action);
      this.appendMainInteraction("精灵有点累", "先休息一下吧，本次不发起玩耍请求。");
      this.render();
      return;
    }

    const cooldownRemainingMs = this.petInteraction.getCoreActionCooldownRemainingMs();
    if (cooldownRemainingMs > 0) {
      devActionLogger.warn("main.petAction.blocked", {
        reason: "cooldown",
        cooldownRemainingMs,
      });
      this.petInteraction.clearCoreAction(action);
      const waitSeconds = Math.max(0.3, Math.ceil(cooldownRemainingMs / 100) / 10);
      this.appendMainInteraction("操作太快啦", `请稍等 ${waitSeconds.toFixed(1)} 秒再继续互动。`);
      this.render();
      return;
    }

    const actionConfig: Record<CorePetAction, {
      runningTitle: string;
      successTitle: string;
      successDetail: string;
      failureTitle: string;
      request: () => Promise<Awaited<ReturnType<typeof petService.sleepCurrentPet>>>;
    }> = {
      sleep: {
        runningTitle: "正在休息",
        successTitle: "休息成功",
        successDetail: "精灵休息了一会儿，已使用接口返回状态刷新页面。",
        failureTitle: "休息失败",
        request: () => petService.sleepCurrentPet(),
      },
      play: {
        runningTitle: "正在玩耍",
        successTitle: "玩耍成功",
        successDetail: "你和精灵玩了一会儿，已使用接口返回状态刷新页面。",
        failureTitle: "玩耍失败",
        request: () => petService.playCurrentPet(),
      },
      care: {
        runningTitle: "正在关怀",
        successTitle: "关怀成功",
        successDetail: "你陪伴了精灵，已使用接口返回状态刷新页面。",
        failureTitle: "关怀失败",
        request: () => petService.careCurrentPet(),
      },
    };

    const config = actionConfig[action];
    this.appendMainInteraction(config.runningTitle, "正在请求真实互动接口，不修改口粮库存。");
    this.render();

    try {
      const result = await config.request();
      devActionLogger.info(result.success ? "main.petAction.success" : "main.petAction.failure", {
        action,
        statusCode: result.statusCode,
        message: result.message,
      });
      if (!this.petInteraction.isCurrentCoreAction(action)) {
        return;
      }

      if (result.success && result.data) {
        this.backendFeedBlocked = false;
        this.localPetMode = null;
        this.lastOfflineDecay = result.offlineDecay ?? null;
        this.petInteraction.startCoreActionCooldown();
        if (action === "sleep") {
          this.triggerVisualState(
            "sleeping",
            isPetSnapshotSleeping(result.data) ? null : PET_VISUAL_PLAY_DURATION_MS
          );
          this.showPetBubble("我休息一下……", "actionFeedback");
        } else if (action === "play") {
          this.triggerVisualState("playing", PET_VISUAL_PLAY_DURATION_MS);
          this.showPetBubble("再玩一会儿！", "actionFeedback");
        } else if (action === "care") {
          this.triggerVisualState("soothed", PET_VISUAL_SOOTHED_DURATION_MS);
          this.showPetBubble("被你关心到了。", "actionFeedback");
        }
        this.appendMainInteraction(config.successTitle, config.successDetail);
        this.render();
        this.petInteraction.clearCoreAction(action);
        return;
      }

      this.petInteraction.startCoreActionCooldown();
      this.extendCoreActionTapLock();
      this.petInteraction.clearCoreAction(action);
      const detail = result.message
        ? `${result.message}；未修改正式宠物状态，未修改口粮库存。`
        : "互动接口暂不可用，未修改正式宠物状态，未修改口粮库存。";
      this.appendMainInteraction(config.failureTitle, detail);
      this.render();
    } catch (error) {
      devActionLogger.error(
        "main.petAction.exception",
        error instanceof Error ? error.message : String(error)
      );
      if (this.petInteraction.isCurrentCoreAction(action)) {
        this.petInteraction.clearCoreAction(action);
        this.appendMainInteraction(config.failureTitle, "请求异常，未修改正式宠物状态，未修改口粮库存。");
        this.render();
      }
    }
  }

  private async handleFeedAction(): Promise<void> {
    devActionLogger.info("main.feed.open");
    this.petAnimator.resetInactivity();
    if (this.feedRequestInFlight || this.inventoryUseRequestInFlight) {
      devActionLogger.warn("main.feed.blocked", "request in flight");
      this.appendMainInteraction("喂食进行中", "已有喂食请求在处理，已忽略重复点击。");
      this.render();
      return;
    }

    if (this.dashboardLoading) {
      devActionLogger.info("main.feed.waitDashboard");
      this.appendMainInteraction("正在同步口粮", "正在等待进入 Main 时触发的 dashboard 同步完成。");
      this.render();
      await (this.dashboardRefreshPromise ?? Promise.resolve(false));
    }

    this.isFoodSelectionPanelOpen = true;
    const availableFoodCount = appState.getPetFoodInventory().filter((food) => food.count > 0).length;
    this.appendMainInteraction(
      "选择口粮",
      availableFoodCount > 0
        ? "请选择一份口粮，使用后会刷新宠物状态并写入日记。"
        : "当前没有可用口粮；先完成一次作业即可获得奖励。"
    );
    this.render();
  }

  private async handleFoodSelection(selectedFood: PetFoodInventoryItem): Promise<void> {
    this.petAnimator.resetInactivity();
    devActionLogger.info("main.feed.select", {
      foodType: selectedFood.food_type,
      foodQuality: selectedFood.food_quality,
      count: selectedFood.count,
    });
    if (this.feedRequestInFlight || this.inventoryUseRequestInFlight) {
      devActionLogger.warn("main.feed.blocked", "request in flight");
      this.appendMainInteraction("喂食进行中", "已有喂食请求在处理，已忽略重复点击。");
      this.render();
      return;
    }
    if (selectedFood.count <= 0) {
      devActionLogger.warn("main.feed.blocked", "empty inventory");
      this.backendFeedBlocked = true;
      this.appendMainInteraction(
        "喂食暂不可用",
        `${selectedFood.food_type} / ${selectedFood.food_quality} 库存不足，未扣减库存。`
      );
      this.render();
      return;
    }

    const requestSeq = this.feedRequestSeq + 1;
    this.feedRequestSeq = requestSeq;

    this.feedRequestInFlight = true;
    this.inventoryUseRequestInFlight = true;
    this.appendMainInteraction(
      "正在尝试喂食",
      `已选择 ${this.formatFoodName(selectedFood)}，正在请求真实背包使用接口。`
    );
    this.render();

    try {
      const result = await petService.useFoodFromInventory({
        food_type: selectedFood.food_type,
        food_quality: selectedFood.food_quality,
      });
      devActionLogger.info(result.success ? "main.feed.success" : "main.feed.failure", {
        statusCode: result.statusCode,
        message: result.message,
      });

      if (requestSeq !== this.feedRequestSeq) {
        devActionLogger.warn("main.feed.stale", { requestSeq });
        return;
      }

      const data = result.data;
      const hasFeedPayload =
        Boolean(data?.pet) &&
        Array.isArray(data?.foods);

      if (result.success && hasFeedPayload) {
        this.backendFeedBlocked = false;
        this.localPetMode = null;
        this.lastOfflineDecay = data?.offlineDecay ?? null;
        this.feedRequestInFlight = false;
        this.inventoryUseRequestInFlight = false;
        this.triggerVisualState("eating", PET_VISUAL_FEED_DURATION_MS);
        this.showPetBubble("这个好好吃！", "actionFeedback");
        const latestLog = data?.logs?.[0];
        this.appendMainInteraction(
          latestLog?.title ?? "使用成功",
          latestLog?.detail ??
          `已使用 ${this.formatFoodName(selectedFood)}，宠物状态已刷新；可到日记查看这次记录。`
        );
        this.render();
        return;
      }

      this.backendFeedBlocked = true;
      this.feedRequestInFlight = false;
      this.inventoryUseRequestInFlight = false;
      const incompleteMessage = result.success ? "接口返回不完整，未做本地推算。" : null;
      this.appendMainInteraction(
        result.success ? "背包刷新不完整" : "使用失败",
        incompleteMessage ?? (result.message ? `${result.message}；未扣本地库存，未伪造宠物状态。` : "背包使用接口暂不可用，未扣本地库存，未伪造宠物状态。")
      );
      this.render();
      if (result.message?.includes("返回不完整")) {
        await this.tryRefreshMainDashboard();
      }
    } catch (error) {
      devActionLogger.error(
        "main.feed.exception",
        error instanceof Error ? error.message : String(error)
      );
      if (requestSeq === this.feedRequestSeq) {
        this.backendFeedBlocked = true;
        this.feedRequestInFlight = false;
        this.inventoryUseRequestInFlight = false;
        this.appendMainInteraction("使用失败", "背包使用请求异常，未扣本地库存，未伪造宠物状态。");
        this.render();
      }
    }
  }

  private formatInteractionTime(raw: string): string {
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) {
      return "--:--";
    }
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${hours}:${minutes}`;
  }

  private formatFoodName(food: PetFoodInventoryItem): string {
    return `${this.formatFoodQuality(food.food_quality)}${this.formatFoodType(food.food_type)}`;
  }

  private resolveFoodIcon(food: PetFoodInventoryItem): string {
    const icons: Record<string, string> = {
      energy: "⚡",
      xp: "🍚",
      expression_fruit: "🍎",
      logic_cookie: "🍪",
      star_milk: "🥛",
      meal_box: "🍱",
    };
    return icons[food.food_type] ?? "🍚";
  }

  private resolveFoodEffectText(food: PetFoodInventoryItem): string {
    const qualityLabel = this.formatFoodQuality(food.food_quality);
    const effectLabels: Record<string, string> = {
      energy: "体力口粮",
      xp: "成长口粮",
      expression_fruit: "心情口粮",
      logic_cookie: "体力口粮",
      star_milk: "心情与饱腹口粮",
      meal_box: "饱腹口粮",
    };
    return `${qualityLabel}${effectLabels[food.food_type] ?? "口粮"}，实际效果以后端为准`;
  }

  private formatFoodType(type: PetFoodInventoryItem["food_type"]): string {
    const names: Record<string, string> = {
      energy: "体力口粮",
      xp: "经验口粮",
      expression_fruit: "表达果实",
      logic_cookie: "逻辑饼干",
      star_milk: "星星牛奶",
      meal_box: "营养便当",
    };
    return names[type] ?? type;
  }

  private formatFoodQuality(quality: PetFoodInventoryItem["food_quality"]): string {
    switch (quality) {
      case "advanced":
        return "高级";
      case "premium":
        return "优质";
      case "normal":
      default:
        return "普通";
    }
  }

  private resolveDashboardSyncDetail(
    offlineDecay: OfflineDecaySummary | undefined,
    dailyBasicFood: DailyBasicFoodPayload | undefined
  ): string {
    if (dailyBasicFood?.granted) {
      return "今日基础口粮已送达，记得照顾小橘哦。";
    }
    if (offlineDecay?.applied) {
      return formatOfflineDecayDetail(offlineDecay);
    }
    return "已尝试读取宠物状态与口粮库存。";
  }

  private resolveRightLogTipBody(viewModel: MainViewModel): string {
    if (this.backendFeedBlocked) {
      return "喂食未拿到完整结果\n已停止库存结算";
    }
    if (!viewModel.isDashboardReady) {
      return "宠物状态待同步\n不会使用假成长数值";
    }
    if (this.lastOfflineDecay?.applied) {
      return formatOfflineDecayDetail(this.lastOfflineDecay);
    }
    return `当前宠物：${viewModel.petName}\n状态来自 appState`;
  }

  private renderPhoneRightTimelineContent(
    card: Node,
    options: {
      name: string;
      width: number;
      height: number;
    }
  ): void {
    const viewModel = this.createMainViewModel();
    const cardWidth = options.width;
    const cardHeight = options.height;
    const topY = cardHeight / 2;
    RuntimeUI.createLabel(card, {
      name: `${options.name}TimelineTitle`,
      text: "互动时间线",
      x: 0,
      y: Math.round(topY - cardHeight * 0.09),
      width: Math.round(cardWidth * 0.78),
      height: 30,
      fontSize: Math.max(20, Math.min(28, Math.round(cardWidth * 0.12))),
      color: new Color(104, 61, 36, 244),
    });

    const entries = this.interactionEntries.slice(0, 3);
    const lineX = Math.round(-cardWidth * 0.35);
    const entryTop = Math.round(topY - cardHeight * 0.22);
    const entryGap = Math.max(62, Math.round(cardHeight * 0.17));
    RuntimeUI.createBox(card, {
      name: `${options.name}TimelineRail`,
      x: lineX,
      y: Math.round(entryTop - entryGap),
      width: 3,
      height: Math.round(entryGap * Math.max(1, entries.length - 1) + 10),
      color: new Color(222, 174, 120, 120),
      radius: 2,
    });

    entries.forEach((entry, index) => {
      const y = entryTop - index * entryGap;
      RuntimeUI.createBox(card, {
        name: `${options.name}TimelineDot${index + 1}`,
        x: lineX,
        y,
        width: 12,
        height: 12,
        color: index === 0 ? new Color(245, 154, 42, 238) : new Color(222, 174, 120, 190),
        radius: 6,
      });
      RuntimeUI.createLabel(card, {
        name: `${options.name}TimelineTime${index + 1}`,
        text: this.formatInteractionTime(entry.createdAt),
        x: Math.round(-cardWidth * 0.21),
        y: y + 15,
        width: Math.round(cardWidth * 0.24),
        height: 22,
        fontSize: Math.max(13, Math.min(17, Math.round(cardWidth * 0.075))),
        color: new Color(138, 91, 55, 214),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      const titleLabel = RuntimeUI.createLabel(card, {
        name: `${options.name}TimelineEvent${index + 1}`,
        text: entry.title,
        x: Math.round(cardWidth * 0.14),
        y: y + 15,
        width: Math.round(cardWidth * 0.52),
        height: 22,
        fontSize: Math.max(15, Math.min(20, Math.round(cardWidth * 0.088))),
        color: new Color(104, 61, 36, 236),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      titleLabel.enableWrapText = false;
      titleLabel.overflow = Label.Overflow.CLAMP;
      const resultLabel = RuntimeUI.createLabel(card, {
        name: `${options.name}TimelineResult${index + 1}`,
        text: entry.detail,
        x: Math.round(cardWidth * 0.14),
        y: y - 13,
        width: Math.round(cardWidth * 0.52),
        height: 24,
        fontSize: Math.max(12, Math.min(16, Math.round(cardWidth * 0.066))),
        color: new Color(151, 105, 76, 184),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      resultLabel.enableWrapText = false;
      resultLabel.overflow = Label.Overflow.CLAMP;
    });

    const statusWidth = Math.round(cardWidth * 0.8);
    const statusHeight = Math.max(64, Math.round(cardHeight * 0.15));
    const statusY = Math.round(-cardHeight / 2 + statusHeight * 0.78);
    RuntimeUI.createCard(card, {
      name: `${options.name}TimelineStatusCard`,
      x: 0,
      y: statusY,
      width: statusWidth,
      height: statusHeight,
      color: new Color(255, 244, 210, 184),
      innerColor: new Color(255, 255, 255, 96),
      radius: Math.round(statusHeight * 0.26),
      borderThickness: 1,
      innerRadius: Math.max(0, Math.round(statusHeight * 0.26) - 1),
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}TimelineStatusTitle`,
      text: this.backendFeedBlocked ? "同步提醒" : viewModel.displayStatus,
      x: Math.round(statusWidth * 0.08),
      y: statusY + Math.round(statusHeight * 0.2),
      width: Math.round(statusWidth * 0.62),
      height: 24,
      fontSize: Math.max(15, Math.min(20, Math.round(cardWidth * 0.086))),
      color: new Color(104, 61, 36, 236),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    const statusBody = RuntimeUI.createLabel(card, {
      name: `${options.name}TimelineStatusBody`,
      text: this.resolveRightLogTipBody(viewModel),
      x: Math.round(statusWidth * 0.08),
      y: statusY - Math.round(statusHeight * 0.2),
      width: Math.round(statusWidth * 0.62),
      height: Math.round(statusHeight * 0.44),
      fontSize: Math.max(11, Math.min(15, Math.round(cardWidth * 0.064))),
      color: new Color(151, 105, 76, 190),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    statusBody.lineHeight = Math.round(statusBody.fontSize * 1.26);
    statusBody.enableWrapText = true;
    statusBody.overflow = Label.Overflow.CLAMP;
  }

  private renderRightLogCardContent(
    card: Node,
    options: {
      name: string;
      width: number;
      height: number;
    }
  ): void {
    if (options.name === "PhoneRightStatus") {
      this.renderPhoneRightTimelineContent(card, options);
      return;
    }

    const viewModel = this.createMainViewModel();
    const cardWidth = options.width;
    const cardHeight = options.height;
    const topY = cardHeight / 2;
    const titleY = Math.round(topY - cardHeight * this.getArtTuningValue("rightLogTitleYRatio"));
    const pawX = Math.round(cardWidth * this.getArtTuningValue("rightLogPawXRatio"));
    const pawY = titleY + Math.round(this.getArtTuningValue("rightLogPawYOffset"));
    const pawScale = this.getArtTuningValue("rightLogPawScale");

    renderPawTitleDecor(card, {
      name: `${options.name}LeftPaw`,
      x: -pawX,
      y: pawY,
      mirrored: false,
      scale: pawScale,
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}Title`,
      text: "互动日志",
      x: 0,
      y: titleY,
      width: Math.round(cardWidth * 0.58),
      height: 38,
      fontSize: Math.max(18, Math.min(42, Math.round(cardWidth * this.getArtTuningValue("rightLogTitleFontScale")))),
      color: new Color(126, 68, 32, 240),
    });
    renderPawTitleDecor(card, {
      name: `${options.name}RightPaw`,
      x: pawX,
      y: pawY,
      mirrored: true,
      scale: pawScale,
    });

    const logEntries = this.interactionEntries.slice(0, 3);
    const textX = Math.round(cardWidth * this.getArtTuningValue("rightLogTextXRatio"));
    const textTop = Math.round(topY - cardHeight * this.getArtTuningValue("rightLogTextTopRatio"));
    const lineGap = Math.max(42, Math.round(cardHeight * this.getArtTuningValue("rightLogLineGapRatio") * 1.32));
    logEntries.forEach((entry, index) => {
      const entryY = textTop - index * lineGap;
      const titleLabel = RuntimeUI.createLabel(card, {
        name: `${options.name}LogTitle${index + 1}`,
        text: `${this.formatInteractionTime(entry.createdAt)} ${entry.title}`,
        x: textX,
        y: entryY + Math.round(lineGap * 0.22),
        width: Math.round(cardWidth * this.getArtTuningValue("rightLogTextWidthRatio")),
        height: Math.round(lineGap * 0.36),
        fontSize: Math.max(13, Math.min(28, Math.round(cardWidth * this.getArtTuningValue("rightLogTextFontScale")))),
        color: new Color(126, 68, 32, 218),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      titleLabel.enableWrapText = false;
      titleLabel.overflow = Label.Overflow.CLAMP;
      titleLabel.lineHeight = Math.round(titleLabel.fontSize * 1.25);
      const detailLabel = RuntimeUI.createLabel(card, {
        name: `${options.name}LogDetail${index + 1}`,
        text: entry.detail,
        x: textX,
        y: entryY - Math.round(lineGap * 0.18),
        width: Math.round(cardWidth * this.getArtTuningValue("rightLogTextWidthRatio")),
        height: Math.round(lineGap * 0.42),
        fontSize: Math.max(11, Math.min(22, Math.round(cardWidth * this.getArtTuningValue("rightLogTextFontScale") * 0.82))),
        color: new Color(151, 105, 76, 196),
        horizontalAlign: HorizontalTextAlignment.LEFT,
      });
      detailLabel.enableWrapText = false;
      detailLabel.overflow = Label.Overflow.CLAMP;
      detailLabel.lineHeight = Math.round(detailLabel.fontSize * 1.25);
    });

    const dividerY = Math.round(topY - cardHeight * this.getArtTuningValue("rightLogDividerYRatio"));
    renderDottedDivider(card, {
      name: `${options.name}DottedDivider`,
      y: dividerY,
      width: Math.round(cardWidth * this.getArtTuningValue("rightLogDividerWidthRatio")),
      dotCount: 26,
    });

    const tipX = Math.round(cardWidth * this.getArtTuningValue("rightLogTipXRatio"));
    const tipY = Math.round(cardHeight * this.getArtTuningValue("rightLogTipYRatio"));
    const tipWidth = Math.round(cardWidth * this.getArtTuningValue("rightLogTipWidthRatio"));
    const tipHeight = Math.round(cardHeight * this.getArtTuningValue("rightLogTipHeightRatio"));
    const tipRadius = Math.round(tipHeight * this.getArtTuningValue("rightLogTipRadiusRatio"));
    RuntimeUI.createCard(card, {
      name: `${options.name}TipCard`,
      x: tipX,
      y: tipY,
      width: tipWidth,
      height: tipHeight,
      color: new Color(239, 196, 141, 166),
      innerColor: new Color(255, 249, 231, 226),
      radius: tipRadius,
      borderThickness: 1,
      innerRadius: Math.max(0, tipRadius - 1),
    });
    RuntimeUI.createBox(card, {
      name: `${options.name}TipCardGloss`,
      x: tipX,
      y: tipY + Math.round(tipHeight * this.getArtTuningValue("rightLogTipGlossYRatio")),
      width: Math.round(tipWidth * this.getArtTuningValue("rightLogTipGlossWidthRatio")),
      height: Math.round(tipHeight * this.getArtTuningValue("rightLogTipGlossHeightRatio")),
      color: new Color(255, 255, 255, 54),
      radius: Math.round(tipHeight * 0.1),
    });
    renderCompanionCloudIcon(card, {
      name: `${options.name}TipIcon`,
      x: tipX + Math.round(tipWidth * this.getArtTuningValue("rightLogTipIconXRatio")),
      y: tipY + Math.round(tipHeight * this.getArtTuningValue("rightLogTipIconYRatio")),
      size: Math.round(tipHeight * this.getArtTuningValue("rightLogTipIconSizeRatio")),
    });
    RuntimeUI.createLabel(card, {
      name: `${options.name}TipTitle`,
      text: this.backendFeedBlocked ? "接口阻塞提示" : viewModel.displayStatus,
      x: tipX + Math.round(tipWidth * this.getArtTuningValue("rightLogTipTitleXRatio")),
      y: tipY + Math.round(tipHeight * this.getArtTuningValue("rightLogTipTitleYRatio")),
      width: Math.round(tipWidth * this.getArtTuningValue("rightLogTipTitleWidthRatio")),
      height: 24,
      fontSize: Math.max(13, Math.min(26, Math.round(cardWidth * this.getArtTuningValue("rightLogTipTitleFontScale")))),
      color: new Color(126, 68, 32, 226),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    const tipBody = RuntimeUI.createLabel(card, {
      name: `${options.name}TipBody`,
      text: this.resolveRightLogTipBody(viewModel),
      x: tipX + Math.round(tipWidth * this.getArtTuningValue("rightLogTipBodyXRatio")),
      y: tipY + Math.round(tipHeight * this.getArtTuningValue("rightLogTipBodyYRatio")),
      width: Math.round(tipWidth * this.getArtTuningValue("rightLogTipBodyWidthRatio")),
      height: Math.round(tipHeight * this.getArtTuningValue("rightLogTipBodyHeightRatio")),
      fontSize: Math.max(11, Math.min(21, Math.round(cardWidth * this.getArtTuningValue("rightLogTipBodyFontScale")))),
      color: new Color(151, 105, 76, 172),
      horizontalAlign: HorizontalTextAlignment.LEFT,
    });
    tipBody.lineHeight = Math.round(tipBody.fontSize * 1.42);

    renderFlowerCluster(card, {
      name: `${options.name}FlowerDecor`,
      x: Math.round(cardWidth * this.getArtTuningValue("rightLogFlowerXRatio")),
      y: Math.round(-cardHeight / 2 + this.getArtTuningValue("rightLogFlowerYOffset")),
      scale: Math.max(0.45, Math.min(1.4, (cardWidth / 310) * this.getArtTuningValue("rightLogFlowerScale"))),
    });
  }
  private renderReferenceButton(shell: Node, layout: MainLayout): void {
    RuntimeUI.createBox(shell, {
      name: "ReferenceButtonShadow",
      x: layout.buttonX + 4,
      y: layout.buttonY - 4,
      width: layout.buttonSize,
      height: layout.buttonSize,
      color: new Color(177, 121, 67, 45),
      radius: layout.buttonSize / 2,
    });

    const { node, button } = RuntimeUI.createButton(shell, {
      name: "ReferenceButton",
      text: REFERENCE_BUTTON_LABEL,
      x: layout.buttonX,
      y: layout.buttonY,
      width: layout.buttonSize,
      height: layout.buttonSize,
      color: new Color(245, 164, 93, 255),
      fontSize: Math.max(16, Math.round(layout.buttonSize * 0.2)),
      radius: layout.buttonSize / 2,
    });

    button.transition = Button.Transition.NONE;
    node.on(Button.EventType.CLICK, this.openReferencePage, this);
  }

  private openArtDebugPage(): void {
    if (typeof window === "undefined") {
      return;
    }

    this.installArtDebugBridge();
    const existing = this.artDebugPageWindow;
    if (existing && !existing.closed) {
      existing.focus();
      existing.document.open();
      existing.document.write(ART_DEBUG_PAGE_HTML);
      existing.document.close();
      return;
    }

    const popup = window.open("", ART_DEBUG_WINDOW_NAME, "width=520,height=900,resizable=yes,scrollbars=yes");
    if (!popup) {
      return;
    }

    this.artDebugPageWindow = popup;
    popup.document.open();
    popup.document.write(ART_DEBUG_PAGE_HTML);
    popup.document.close();
    popup.focus();
  }

  private openReferencePage(): void {
    if (!this.canOpenReferencePage() || typeof window === "undefined") {
      return;
    }

    const url = this.getReferencePageUrl();
    const opened = window.open(url, "_blank");
    if (!opened) {
      window.location.href = url;
    }
  }

  private canOpenReferencePage(): boolean {
    const now = Date.now();
    if (now - this.lastReferenceOpenAt < 500) {
      return false;
    }

    this.lastReferenceOpenAt = now;
    return true;
  }

  private getReferencePageUrl(): string {
    if (this.referencePageUrl) {
      return this.referencePageUrl;
    }

    const blob = new Blob([REFERENCE_PAGE_HTML], { type: "text/html;charset=utf-8" });
    this.referencePageUrl = URL.createObjectURL(blob);
    return this.referencePageUrl;
  }

  private releaseReferencePageUrl(): void {
    if (this.referencePageUrl) {
      URL.revokeObjectURL(this.referencePageUrl);
      this.referencePageUrl = null;
    }
  }

  private releaseArtDebugPage(): void {
    if (this.artDebugPageWindow && !this.artDebugPageWindow.closed) {
      this.artDebugPageWindow.close();
    }

    this.artDebugPageWindow = null;
  }
}
