export type PetCreationStep = "intro" | "naming" | "submitting" | "success";

// 文件整体作用：
// 这是首次创建宠物流程的小状态机。
// 它只记住“现在走到哪一步了、当前名字是什么、流程是否仍在进行中”。
//
// 一句话版本：
// 这段代码的核心意思就是：记住首次创建宠物流程现在走到哪一步，好让界面切到对应那一页。
//
// 美术需要关注的重点：
// 1. intro / naming / submitting / success 四个步骤，会直接决定创建页长什么样。
// 2. 这里不负责画按钮和面板，只负责给界面一个“现在应该显示哪一页”的答案。
export type PetCreationState = {
  // step：当前创建流程在哪一步。
  // petName：当前暂存的宠物名字。
  // active：首次创建流程是否仍在接管页面。
  step: PetCreationStep;
  petName: string;
  active: boolean;
};

const DEFAULT_STATE: PetCreationState = {
  step: "intro",
  petName: "",
  active: false,
};

export class PetCreationCoordinator {
  // 这个 coordinator 只管首次创建宠物的小状态机，页面上每一步该显示什么都由它说了算。
  private state: PetCreationState = { ...DEFAULT_STATE };

  ensureStartedForNewChild(hasPet: boolean, hasKnownPetId: boolean): boolean {
    // 只有“确实没有宠物信息”的学生账号，才允许进入首次创建流程。
    if (!this.state.active && !hasPet && !hasKnownPetId) {
      this.state = {
        ...DEFAULT_STATE,
        active: true,
      };
      return true;
    }

    return false;
  }

  isActive(): boolean {
    return this.state.active;
  }

  getState(): PetCreationState {
    return { ...this.state };
  }

  begin(): void {
    // 从头开始首次创建流程：先回到 intro，再把 active 打开。
    this.state = {
      ...DEFAULT_STATE,
      active: true,
    };
  }

  goToNaming(): void {
    // 点击“开始创建”后，进入真正的命名页。
    this.state = {
      ...this.state,
      active: true,
      step: "naming",
    };
  }

  updatePetName(name: string): void {
    // 命名页里输入什么，就暂存什么，提交前再做一次 trim。
    this.state = {
      ...this.state,
      petName: name,
    };
  }

  startSubmitting(): void {
    // 提交中页面只是一个过渡态，提醒用户请求已经发出。
    this.state = {
      ...this.state,
      step: "submitting",
    };
  }

  returnToIntro(): void {
    // 返回按钮会把流程退回最开始，但仍然保持 onboarding 处于 active。
    this.state = {
      ...DEFAULT_STATE,
      active: true,
    };
  }

  showSuccess(): void {
    // 创建成功后切到 success 页，等用户主动进入宠物主界面。
    this.state = {
      ...this.state,
      step: "success",
    };
  }

  complete(): void {
    // 整个首次创建流程结束后，完全退出 onboarding。
    this.state = {
      ...DEFAULT_STATE,
      active: false,
    };
  }
}
