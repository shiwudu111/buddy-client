import { Color, Node, UITransform } from "cc";
import { appState } from "../../app/AppState";
import { petService } from "../../services/PetService";
import { RuntimeUI } from "../common/runtime/RuntimeUI";
import { PetCreationCoordinator } from "../pet/PetCreationCoordinator";
import {
  renderPetCreationFlow,
  type PetCreationViewRefs,
} from "../pet/PetCreationView";
import {
  isPetNameWithinLimit,
  PET_NAME_MAX_LENGTH,
  resolveRandomPetName,
} from "../pet/PetNameTable";

export type MainPetCreationGateLayout = {
  viewportWidth: number;
  viewportHeight: number;
};

export type MainPetCreationGateCallbacks = {
  onGateOpened: () => void;
  onPetCreated: (petName: string) => void;
  onEnterPetHome: () => void;
  onRenderRequested: () => void;
  onDashboardRefreshRequested: () => void;
};

export class MainPetCreationGateController {
  private coordinator = new PetCreationCoordinator();
  private refs: PetCreationViewRefs | null = null;
  private requestInFlight = false;
  private feedback: string | null = null;
  private disposed = false;

  constructor(private readonly callbacks: MainPetCreationGateCallbacks) {}

  dispose(): void {
    this.disposed = true;
    this.refs = null;
  }

  isActive(): boolean {
    return !this.disposed && this.coordinator.isActive();
  }

  clearRefs(): void {
    this.refs = null;
  }

  openIfNeeded(): boolean {
    if (this.disposed) {
      return false;
    }

    const user = appState.getCurrentUser();
    const shouldOpen =
      user?.role === "CHILD" &&
      !appState.getPetId() &&
      !appState.getCurrentPet();

    if (!shouldOpen) {
      return false;
    }

    if (!this.coordinator.isActive()) {
      this.coordinator.begin();
      this.feedback = null;
      this.callbacks.onGateOpened();
    }

    return true;
  }

  render(root: Node, layout: MainPetCreationGateLayout): void {
    if (this.disposed) {
      return;
    }

    const host = new Node("PetCreationGateHost");
    host.setParent(root);
    const transform = host.addComponent(UITransform);
    transform.setContentSize(980, 590);
    const scale = Math.min(
      1,
      Math.max(0.62, (layout.viewportWidth - 32) / 980),
      Math.max(0.62, (layout.viewportHeight - 32) / 590)
    );
    host.setScale(scale, scale, 1);

    this.refs = renderPetCreationFlow(
      host,
      this.coordinator.getState(),
      {
        onOpenNaming: () => this.handleOpenNaming(),
        onBackToIntro: () => this.handleBackToIntro(),
        onRandomName: () => this.handleRandomName(),
        onSubmitCreate: () => void this.handleSubmit(),
        onEnterPetHome: () => this.handleEnterPetHome(),
      },
      this
    );

    if (this.feedback) {
      RuntimeUI.createLabel(host, {
        name: "PetCreationFeedback",
        text: this.feedback,
        x: 0,
        y: -286,
        width: 760,
        height: 30,
        fontSize: 18,
        color: new Color(255, 204, 112, 255),
      });
    }
  }

  private handleOpenNaming(): void {
    if (this.disposed) {
      return;
    }
    this.feedback = null;
    this.coordinator.goToNaming();
    this.callbacks.onRenderRequested();
  }

  private handleBackToIntro(): void {
    if (this.disposed || this.requestInFlight) {
      return;
    }
    this.feedback = null;
    this.coordinator.returnToIntro();
    this.callbacks.onRenderRequested();
  }

  private async handleSubmit(): Promise<void> {
    if (this.disposed || this.requestInFlight) {
      return;
    }

    const name = this.refs?.nameInput?.string ?? this.coordinator.getState().petName;
    const normalizedName = name.trim();
    if (!normalizedName) {
      this.feedback = "先给宠物起一个名字。";
      this.callbacks.onRenderRequested();
      return;
    }
    if (!isPetNameWithinLimit(normalizedName)) {
      this.feedback = `名字最多 ${PET_NAME_MAX_LENGTH} 个字。`;
      this.callbacks.onRenderRequested();
      return;
    }

    this.coordinator.updatePetName(normalizedName);
    this.coordinator.startSubmitting();
    this.requestInFlight = true;
    this.feedback = null;
    this.callbacks.onRenderRequested();

    try {
      const result = await petService.createPet(normalizedName);
      if (this.disposed) {
        return;
      }
      if (result.success && result.data?.pet_id) {
        appState.setPetId(result.data.pet_id);
        appState.setCurrentPet(result.data);
        this.coordinator.showSuccess();
        this.callbacks.onPetCreated(result.data.name);
        this.callbacks.onRenderRequested();
        return;
      }

      this.coordinator.goToNaming();
      this.feedback = result.success
        ? "创建接口返回不完整，缺少 pet_id。"
        : result.message ?? "创建宠物失败，请稍后再试。";
      this.callbacks.onRenderRequested();
    } catch {
      if (this.disposed) {
        return;
      }
      this.coordinator.goToNaming();
      this.feedback = "创建宠物请求异常，请确认后端服务可访问。";
      this.callbacks.onRenderRequested();
    } finally {
      this.requestInFlight = false;
    }
  }

  private handleEnterPetHome(): void {
    if (this.disposed) {
      return;
    }
    this.coordinator.complete();
    this.feedback = null;
    this.callbacks.onEnterPetHome();
    this.callbacks.onRenderRequested();
    this.callbacks.onDashboardRefreshRequested();
  }

  private handleRandomName(): string {
    if (this.disposed) {
      return this.coordinator.getState().petName;
    }
    const name = resolveRandomPetName();
    this.coordinator.updatePetName(name);
    this.feedback = null;
    return name;
  }
}
