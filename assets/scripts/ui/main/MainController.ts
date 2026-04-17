import { _decorator, Button, Color, EditBox, Node, UITransform } from "cc";
import { appState } from "../../app/AppState";
import { type DashboardTab, type HomeworkSubject } from "../../domain/models/app";
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
import { HomeworkCenterCoordinator } from "../homework/HomeworkCenterCoordinator";
import { renderHomeworkCenter } from "../homework/HomeworkCenterView";
import { PetCreationCoordinator } from "../pet/PetCreationCoordinator";
import { renderPetGrowthView } from "../pet/PetGrowthView";
import { renderPetCreationFlow } from "../pet/PetCreationView";
import type { ChildPetPayload, WeeklyReportPayload } from "../../types/api";

// 鏂囦欢鏁翠綋浣滅敤锛?// 杩欐槸瀛︾敓绔?/ 瀹堕暱绔富鐣岄潰鐨勬€绘帶鍒跺櫒銆?// 鐧诲綍鎴愬姛杩涘叆涓荤晫闈㈠悗锛岀粷澶у鏁颁富椤甸潰鍐呭閮戒細浠庤繖閲屽喅瀹氭樉绀轰粈涔堛€佸埛鏂颁粈涔堛€佸垏鍒板摢涓€椤点€?//
// 涓€鍙ヨ瘽鐗堟湰锛?// 杩欐浠ｇ爜鐨勬牳蹇冩剰鎬濆氨鏄細缁熶竴鎺у埗涓荤晫闈㈣鏄剧ず瀛︾敓绔繕鏄闀跨銆佸綋鍓嶅湪鍝釜椤电銆佺偣鎸夐挳鍚庡埛鏂版垨鍒囧埌鍝噷銆?//
// 缇庢湳闇€瑕佸叧娉ㄧ殑閲嶇偣锛?// 1. MainRoot 涓嬬殑澶у鏁板崱鐗囥€佹寜閽€佹爣棰橀兘鏄繍琛屾椂鍔ㄦ€佸垱寤虹殑锛屽埛鏂版椂浼氳娓呮帀鍚庨噸寤恒€?// 2. 瀛︾敓绔拰瀹堕暱绔槸涓€濂楁帶鍒跺櫒閲岀殑涓ゆ潯鍒嗘敮锛屼笉鏄袱涓畬鍏ㄧ嫭绔嬬殑鍦烘櫙銆?// 3. 棣栨鍒涘缓瀹犵墿娴佺▼浼氱嫭鍗犻〉闈紝鎵€浠ラ偅鏃剁湅涓嶅埌椤堕儴鍒锋柊銆侀€€鍑哄拰鏅€氶〉绛俱€?const { ccclass } = _decorator;

@ccclass("MainController")
export class MainController extends ScreenController {
  // activeTab锛氬鐢熺褰撳墠鍋滅暀鍦ㄥ摢涓〉绛俱€?  private activeTab: DashboardTab = "overview";
  // pageMessage锛氶〉闈㈠簳閮ㄦ彁绀烘枃妗堛€?  private pageMessage = "";
  // 涓嬮潰涓変釜杈撳叆妗嗗紩鐢紝鍙湪瀵瑰簲椤甸潰瀛樺湪鏃舵墠浼氭湁鍊笺€?  private homeworkInput: EditBox | null = null;
  // homeworkInputSubject锛氳褰曗€滃綋鍓嶈繖涓緭鍏ユ瀹炰緥灞炰簬鍝竴绉戔€濄€?  // 杩欐牱鍦ㄥ垏绉戠洰鍚庯紝鏃ц緭鍏ユ鐨勫唴瀹瑰氨涓嶄細琚鍐欒繘鏂扮鐩€?  private homeworkInputSubject: HomeworkSubject | null = null;
  private bindChildInput: EditBox | null = null;
  private petNameInput: EditBox | null = null;
  private readonly homeworkCoordinator = new HomeworkCenterCoordinator();
  private readonly petCreationCoordinator = new PetCreationCoordinator();
  // 涓嬮潰杩欎簺 sessionId 閮芥槸鈥滀細璇濋棬绂佲€濓紝鐢ㄦ潵闃叉鏃ц姹傛櫄鍥炴潵姹℃煋褰撳墠椤甸潰銆?  private homeworkSubmissionSessionId = 0;
  private activeHomeworkSubmissionSessionId = 0;
  private bootstrapSessionId = 0;
  private activeBootstrapSessionId = 0;
  private bindChildSessionId = 0;
  private activeBindChildSessionId = 0;
  private dashboardRefreshSessionId = 0;
  private activeDashboardRefreshSessionId = 0;
  private petGrowthRefreshSessionId = 0;
  private activePetGrowthRefreshSessionId = 0;
  private petCreationSessionId = 0;
  private activePetCreationSessionId = 0;
  private bindChildDraft = "";
  private parentOverview: ChildPetPayload | null = null;
  private parentWeeklyReport: WeeklyReportPayload | null = null;
  private parentOverviewError = "";
  private parentWeeklyError = "";

  onLoad(): void {
    // 杩涘叆涓荤晫闈㈡椂锛屽厛鎭㈠涓婃鍋滅暀鐨勫鐢熺椤电銆?    const savedTab = storage.get(STORAGE_KEYS.activeTab);
    if (savedTab === "overview" || savedTab === "homework" || savedTab === "growth") {
      this.activeTab = savedTab;
    }
  }

  async start(): Promise<void> {
    // 鍚姩鍚庡厛鍋氫竴娆′富鐣岄潰鍒濆鍖栵紝鍐嶈繘鍏ョ湡姝ｆ覆鏌撱€?    await this.bootstrapAndRender();
  }

  private async bootstrapAndRender(): Promise<void> {
    // 鍚姩闃舵瑕佸厛鎶婂綋鍓嶄細璇濃€滈攣浣忊€濓紝閬垮厤鏃ц姹傛櫄鍥炴潵鏃舵妸鏂颁細璇濈殑椤甸潰鐘舵€佸啿鎺夈€?    this.bootstrapSessionId += 1;
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
    // 姣忔閲嶇粯鍓嶏紝鍏堟妸褰撳墠杈撳叆妗嗛噷鐨勪复鏃跺唴瀹规敹鍥炴潵锛岄伩鍏嶅垏椤垫椂鎶婅崏绋垮紕涓€?    this.persistHomeworkDraft();
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
      text: `瀛︿即绮剧伒瀹㈡埛绔?路 ${user.role === "PARENT" ? "瀹堕暱绔? : "瀛︾敓绔?}`,
      x: 0,
      y: 300,
      width: 940,
      height: 48,
      fontSize: 30,
    });

    RuntimeUI.createLabel(root, {
      name: "Subtitle",
      text: `褰撳墠璐﹀彿锛?{user.username}`,
      x: -350,
      y: 258,
      width: 360,
      height: 32,
      fontSize: 18,
      color: new Color(171, 183, 200, 255),
    });

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

    // 瀹堕暱绔拰瀛︾敓绔槸涓ゅ瀹屽叏涓嶅悓鐨勪富鐣岄潰锛氬闀跨鐩存帴灞曠ず缁戝畾涓庡懆鎶ワ紝瀛︾敓绔啀鍒嗕笁涓〉绛俱€?    if (user.role === "PARENT") {
      this.clearHomeworkInputRef();
      this.renderGlobalActions(root);
      await this.renderParentDashboard(root);
      return;
    }

    // 瀛︾敓鏃犲疇鐗╂椂浼樺厛杩涘叆棣栨鍒涘缓娴佺▼锛岃繖鏉￠摼璺細鐙崰椤甸潰锛岄伩鍏嶅拰涓荤晫闈㈢浉浜掑共鎵般€?    if (this.shouldShowPetCreationFlow()) {
      this.clearHomeworkInputRef();
      this.renderPetOnboarding(root);
      return;
    }

    this.renderGlobalActions(root);
    this.renderChildTabs(root);
    if (this.activeTab === "homework") {
      await this.renderHomeworkTab(root);
    } else if (this.activeTab === "growth") {
      this.clearHomeworkInputRef();
      await this.renderGrowthTab(root);
    } else {
      this.clearHomeworkInputRef();
      await this.renderChildOverview(root);
    }
  }

  private renderChildTabs(root: Node): void {
    // 瀛︾敓绔殑涓変釜椤电鍙槸瑙嗗浘鍏ュ彛锛岀湡姝ｇ殑鏁版嵁閮芥潵鑷?appState 鍜屽悇鑷殑 coordinator銆?    const overviewButton = RuntimeUI.createButton(root, {
      name: "OverviewTab",
      text: "瀹犵墿鎬昏",
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
      text: "浣滀笟涓績",
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
      text: "瀹犵墿鎴愰暱",
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
    // 鍒锋柊鍜岄€€鍑哄睘浜庡叏灞€鍔ㄤ綔锛屽彧缁欌€滄甯镐富鐣岄潰鈥濅娇鐢紝涓嶆斁杩涢娆″垱寤烘祦绋嬮噷銆?    const refreshAction = RuntimeUI.createButton(root, {
      name: "RefreshAction",
      text: "鍒锋柊",
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
      text: "閫€鍑虹櫥褰?,
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
    // 宸︿晶鏄疇鐗╂€昏锛屽彸渚ф槸浣滀笟涓庤繎鏈熻褰曘€傝繖涓〉闈㈠亸鈥滅姸鎬佹眹鎬烩€濓紝涓嶈礋璐ｈ緭鍏ャ€?    const petCard = RuntimeUI.createBox(root, {
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
      text: "瀹犵墿鏍稿績鐘舵€?,
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

    // 娌℃湁浠讳綍瀹犵墿淇℃伅鏃讹紝缁欏嚭棣栨鍒涘缓鍏ュ彛銆?    if (!pet && !knownPetId) {
      const createButton = RuntimeUI.createButton(petCard, {
        name: "CreatePetButton",
        text: "鍒涘缓瀹犵墿",
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
    // 宸茬煡鏈夊疇鐗╁叧鑱旓紝浣嗗疇鐗╂暟鎹繕娌″洖鏉ユ椂锛屾彁绀虹敤鎴风◢绛夊埛鏂般€?    } else if (!pet && knownPetId) {
      RuntimeUI.createLabel(petCard, {
        name: "PetSyncHint",
        text: "宸叉娴嬪埌瀹犵墿鍏宠仈锛屾鍦ㄧ瓑寰呭埛鏂板疇鐗╃姸鎬?,
        x: 0,
        y: -120,
        width: 320,
        height: 60,
        fontSize: 18,
        color: new Color(255, 194, 107, 255),
      });
    } else {
      // 宸茬粡鏈夊疇鐗╀簡锛屽氨鎻愪緵鍠傚吇鍜屽幓浣滀笟涓や釜甯哥敤鍔ㄤ綔銆?      const feedButton = RuntimeUI.createButton(petCard, {
        name: "FeedPetButton",
        text: "鍠傚吇瀹犵墿",
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
        text: "鍘诲仛浣滀笟",
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
        text: "鎴愰暱闃舵鍜岃繘鍖栨彁绀哄凡鏀惧埌鈥滃疇鐗╂垚闀库€濋〉绛句腑鏌ョ湅銆?,
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
      text: "浠婃棩浣滀笟涓庤繎鏈熻褰?,
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
  }

  private async renderHomeworkTab(root: Node): Promise<void> {
    // 浣滀笟涓績鐢辩嫭绔?coordinator 绠¤崏绋垮拰褰撳墠瀛︾锛岃繖鏍峰垏瀛︾鏃朵笉浼氫簰鐩镐覆鍊笺€?    const selectedSubject = this.homeworkCoordinator.getSelectedSubject();
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
    // 鎴愰暱椤靛彧璐熻矗灞曠ず鎴愰暱淇℃伅鍜岃Е鍙戝埛鏂帮紝鍏蜂綋鏂囨鍜屾ā鎷熸牱鏈兘鍦?PetGrowthView 閲屻€?    renderPetGrowthView(
      root,
      {
        pet: appState.getCurrentPet(),
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
    // 瀹堕暱绔彧鏈変笁鍧楋細缁戝畾瀛╁瓙銆佸瀛愮姸鎬併€佸懆鎶ャ€傚畠鏇村儚鈥滄暟鎹湅鏉库€濓紝涓嶆槸缂栬緫椤点€?    const bindCard = RuntimeUI.createBox(root, {
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
      text: "瀹堕暱缁戝畾涓庡瀛愮姸鎬?,
      x: 0,
      y: 155,
      width: 320,
      height: 36,
      fontSize: 22,
    });

    this.bindChildInput = RuntimeUI.createEditBox(bindCard, {
      name: "ChildBindInput",
      placeholder: "杈撳叆瀛╁瓙 User.id 鎴栧瀛愯处鍙?,
      x: 0,
      y: 90,
      width: 320,
      height: 60,
      defaultValue: this.bindChildDraft,
      maxLength: 64,
    }).editBox;

    const bindButton = RuntimeUI.createButton(bindCard, {
      name: "BindChildButton",
      text: "缁戝畾瀛╁瓙",
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
          ? `褰撳墠宸茬粦瀹氬瀛愶細${childDisplayName}`
          : "褰撳墠宸茬粦瀹氬瀛?
        : "褰撳墠灏氭湭缁戝畾瀛╁瓙",
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
      : this.parentOverviewError || "绛夊緟缁戝畾鍚庤幏鍙栧瀛愮姸鎬?;

    RuntimeUI.createLabel(statusCard, {
      name: "StatusCardTitle",
      text: "瀛╁瓙鐘舵€佷笌浠婃棩浣滀笟",
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
      text: "鏈懆鍛ㄦ姤",
      x: 0,
      y: 78,
      width: 360,
      height: 30,
      fontSize: 22,
    });

    const weeklyText = this.parentWeeklyReport
      ? formatWeeklyReportSummary(this.parentWeeklyReport)
      : this.parentWeeklyError || "鍛ㄦ姤鎺ュ彛灏氭湭瀹屾垚";

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
    // 椤堕儴鈥滃埛鏂扳€濅細閲嶆媺鏁撮〉鏁版嵁锛屾墍浠ヨ鍗曠嫭寮€涓€涓埛鏂颁細璇濓紝闃叉閫€鍑哄悗鏃у搷搴斿洖鍐欍€?    this.pageMessage = "姝ｅ湪鍒锋柊鏈€鏂版暟鎹?..";
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
      this.pageMessage = "鏈€鏂版暟鎹凡鍒锋柊";
    } else if (
      result.failedTasks.length === 0 &&
      result.pendingTasks.length === 1 &&
      result.pendingTasks[0] === "鏈娴嬪埌瀹犵墿鏄犲皠"
    ) {
      this.pageMessage = "鏈娴嬪埌瀹犵墿鏄犲皠锛岃鍏堝垱寤哄疇鐗?;
    } else if (
      result.failedTasks.length === 0 &&
      result.pendingTasks.length === 1 &&
      result.pendingTasks[0] === "褰撳墠灏氭湭缁戝畾瀛╁瓙"
    ) {
      this.pageMessage = "褰撳墠灏氭湭缁戝畾瀛╁瓙锛岃鍏堢粦瀹氬悗鍐嶅埛鏂?;
    } else if (result.successTasks.length === 0) {
      const blockers = [...result.failedTasks, ...result.pendingTasks];
      this.pageMessage = `鍒锋柊澶辫触锛?{blockers.join("銆?)}`;
    } else {
      const issues = [...result.failedTasks, ...result.pendingTasks];
      this.pageMessage = `閮ㄥ垎鍒锋柊鎴愬姛锛屽緟澶勭悊椤癸細${issues.join("銆?)}`;
    }
    await this.render();
  }

  private handleLogout(): void {
    // 閫€鍑烘椂鐩存帴娓呮帀鎵€鏈変細璇濈紪鍙凤紝琛ㄧず褰撳墠椤甸潰涓婄殑鏅氬埌鍥炶皟閮戒笉鍐嶅厑璁告彁浜ゃ€?    this.activeBootstrapSessionId = 0;
    this.activeBindChildSessionId = 0;
    this.activeHomeworkSubmissionSessionId = 0;
    this.activeDashboardRefreshSessionId = 0;
    this.activePetGrowthRefreshSessionId = 0;
    this.activePetCreationSessionId = 0;
    this.petCreationCoordinator.complete();
    authService.logout();
    sceneRouter.goToLogin();
  }

  private async handleCreatePet(): Promise<void> {
    // 瑙﹀彂棣栨鍒涘缓娴佺▼锛屼絾鐪熸鍒涘缓瀹犵墿瑕佺瓑鐢ㄦ埛杈撳叆鍚嶅瓧骞剁偣鍑绘彁浜ゃ€?    this.pageMessage = "";
    this.petCreationSessionId += 1;
    this.activePetCreationSessionId = this.petCreationSessionId;
    this.petCreationCoordinator.begin();
    await this.render();
  }

  private async handleFeedPet(): Promise<void> {
    // 鍠傚吇瀹屾垚鍚庡啀鍒锋柊褰撳墠瀹犵墿鐘舵€侊紝璁╂€昏鍗″拰鎴愰暱椤典繚鎸佷竴鑷淬€?    const before = appState.getCurrentPet();
    const result = await petService.feedCurrentPet();
    const after = appState.getCurrentPet();
    const changed =
      Boolean(before && after) &&
      (before.hunger !== after.hunger ||
        before.mood !== after.mood ||
        before.experience !== after.experience ||
        before.status !== after.status);

    this.pageMessage = result.success
      ? changed
        ? "鍠傚吇瀹屾垚锛屽疇鐗╃姸鎬佸凡鍒锋柊"
        : "鍠傚吇瀹屾垚锛屼絾褰撳墠瀹犵墿鐘舵€佸凡鎺ヨ繎涓婇檺锛屾暟鍊兼病鏈夋槑鏄惧彉鍖?
      : result.message ?? "鍠傚吇澶辫触";
    await this.render();
  }

  private async handleRefreshGrowth(): Promise<void> {
    // 鎴愰暱椤电殑鍒锋柊鍙洿鏂板疇鐗╂垚闀跨姸鎬侊紝涓嶅奖鍝嶄綔涓氥€佺粦瀹氭垨鐧诲綍鎬併€?    this.petGrowthRefreshSessionId += 1;
    this.activePetGrowthRefreshSessionId = this.petGrowthRefreshSessionId;
    const growthSessionId = this.activePetGrowthRefreshSessionId;
    const canCommit = () =>
      this.activePetGrowthRefreshSessionId === growthSessionId &&
      this.petGrowthRefreshSessionId === growthSessionId;

    const result = await petService.refreshCurrentPet(canCommit);
    if (!canCommit()) {
      return;
    }

    this.pageMessage = result.success
      ? "瀹犵墿鎴愰暱鐘舵€佸凡鍒锋柊"
      : result.message ?? "瀹犵墿鎴愰暱鐘舵€佸埛鏂板け璐?;
    await this.render();
  }

  private async handleSubmitHomework(): Promise<void> {
    // 浣滀笟鎻愪氦鎴愬姛鍚庯紝闇€瑕佹妸浣滀笟鍘嗗彶銆佷粖鏃ョ姸鎬佸拰瀹犵墿鐘舵€佷竴璧疯ˉ榻愶紝閬垮厤椤甸潰鍙埛鏂颁竴鍗娿€?    const subject = this.homeworkCoordinator.getSelectedSubject();
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
      this.homeworkCoordinator.clearDraftForSubject(subject);
      if (
        this.homeworkInput &&
        this.homeworkInputSubject === subject &&
        this.homeworkInput.node?.isValid
      ) {
        this.homeworkInput.string = "";
      }
    }
    this.pageMessage = feedback.message;
    await this.render();
  }

  private async handleBindChild(): Promise<void> {
    // 瀹堕暱缁戝畾鍏堟彁浜ゆ爣璇嗭紝鍐嶅湪纭鎴愬姛鍚庡埛鏂版暣浠藉闀跨湅鏉裤€?    const identifier = this.bindChildInput?.string.trim() ?? "";
    this.bindChildDraft = identifier;
    if (!identifier) {
      this.pageMessage = "璇疯緭鍏ュ瀛愭爣璇嗗悗鍐嶇粦瀹?;
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
      ? "缁戝畾鎴愬姛锛屽凡鍔犺浇瀛╁瓙鐘舵€?
      : result.message ?? "缁戝畾澶辫触";
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
    // 浠讳綍鍒囬〉銆侀噸缁樹箣鍓嶏紝閮藉厛鎶婂綋鍓嶈緭鍏ユ鍐呭淇濆瓨鍥炩€滃畠鍘熸湰鎵€灞炵殑閭ｄ竴绉戔€濄€?    // 杩欓噷涓嶈兘鐩存帴鎸?current selectedSubject 淇濆瓨锛屽惁鍒欏垏绉戠洰鍚庝細鎶婃棫杈撳叆璇啓鍒版柊绉戠洰銆?    if (this.homeworkInput && (!this.homeworkInput.node || !this.homeworkInput.node.isValid)) {
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

  private clearHomeworkInputRef(): void {
    this.homeworkInput = null;
    this.homeworkInputSubject = null;
  }

  private shouldShowPetCreationFlow(): boolean {
    // 棣栨鍒涘缓娴佺▼鍙湅鈥滃綋鍓嶆槸鍚︽湁瀹犵墿鈥濆拰鈥滄槸鍚﹀凡缁忕煡閬撳疇鐗?ID鈥濊繖涓や釜淇″彿銆?    // 鍙鍒ゅ畾杩涘叆 onboarding锛屾暣涓〉闈㈠氨鍒囧埌鍒涘缓瀹犵墿锛屼笉鍐嶆覆鏌撲富鐣岄潰銆?    const pet = appState.getCurrentPet();
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
    // 棣栨鍒涘缓娴佺▼鏄竴涓嫭绔嬬殑灏忕姸鎬佹満锛氳鏄?-> 鍛藉悕 -> 鎻愪氦涓?-> 鎴愬姛銆?    const refs = renderPetCreationFlow(
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
          this.pageMessage = "鏂扮殑瀹犵墿宸插姞鍏ワ紝闄綘寮€濮嬫垚闀裤€?;
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
    // 鐪熸鍒涘缓瀹犵墿鏃惰鍏堟牎楠屽綋鍓嶄細璇濓紝閬垮厤鐢ㄦ埛閫€鍑哄悗鏅氬埌鍝嶅簲鎶婃柊浼氳瘽鍐叉帀銆?    const state = this.petCreationCoordinator.getState();
    const petName = this.petNameInput?.string.trim() ?? state.petName.trim();
    this.petCreationCoordinator.updatePetName(petName);

    if (!petName) {
      this.pageMessage = "璇峰厛缁欏疇鐗╄捣涓€涓悕瀛?;
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
      this.pageMessage = result.message ?? "瀹犵墿鍒涘缓澶辫触";
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
    // 杩欓噷缁熶竴鍒锋柊鎵€鏈変富鐣岄潰鏁版嵁锛氬疇鐗┿€佷綔涓氥€佸闀跨湅鏉块兘瑕佹寜鍚屼竴涓細璇濊竟鐣屾彁浜ゃ€?    const user = appState.getCurrentUser() ?? (await authService.bootstrapSession(canCommit));
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
        failedTasks: ["鐧诲綍鎬佹仮澶?],
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
          successTasks.push("瀹犵墿鐘舵€?);
        } else {
          failedTasks.push("瀹犵墿鐘舵€?);
        }
      } else if (!appState.getCurrentPet()) {
        pendingTasks.push("鏈娴嬪埌瀹犵墿鏄犲皠");
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
        successTasks.push("浣滀笟鍘嗗彶");
      } else {
        failedTasks.push("浣滀笟鍘嗗彶");
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
        successTasks.push("浠婃棩鐘舵€?);
      } else {
        failedTasks.push("浠婃棩鐘舵€?);
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
        this.parentOverviewError = "褰撳墠灏氭湭缁戝畾瀛╁瓙";
        this.parentWeeklyError = "璇峰厛缁戝畾瀛╁瓙鍚庢煡鐪嬪懆鎶?;
        pendingTasks.push("褰撳墠灏氭湭缁戝畾瀛╁瓙");
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
        successTasks.push("瀛╁瓙鐘舵€?);
      } else {
        this.parentOverview = null;
        this.parentOverviewError = overviewResult.message ?? "瀛╁瓙鐘舵€佸姞杞藉け璐?;
        failedTasks.push("瀛╁瓙鐘舵€?);
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
        successTasks.push("鍛ㄦ姤");
      } else {
        this.parentWeeklyReport = null;
        this.parentWeeklyError = weeklyResult.message ?? "鍛ㄦ姤鍔犺浇澶辫触";
        failedTasks.push("鍛ㄦ姤");
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
      this.parentOverviewError = "褰撳墠灏氭湭缁戝畾瀛╁瓙";
      this.parentWeeklyError = "璇峰厛缁戝畾瀛╁瓙鍚庢煡鐪嬪懆鎶?;
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
      this.parentOverviewError = overviewResult.message ?? "绛夊緟缁戝畾鍚庤幏鍙栧瀛愮姸鎬?;
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
      this.parentWeeklyError = weeklyResult.message ?? "鍛ㄦ姤鎺ュ彛灏氭湭瀹屾垚";
    }
  }
}
