import { ResolutionPolicy, screen, view } from "cc";

// 文件整体作用：
// 这是登录页的分辨率协调器。
// 它会在进入登录页时临时切换设计分辨率，离开登录页时再恢复回去。
//
// 一句话版本：
// 这段代码的核心意思就是：进入登录页时临时切换成适合登录页的画面尺寸，离开时再改回去。
//
// 美术需要关注的重点：
// 1. 登录页之所以横竖屏看起来像两套排版，底层有一部分就是这里在配合。
// 2. 如果你发现离开登录页后别的场景尺寸异常，通常要回头看 restore() 是否生效。
const LOGIN_RESOLUTION_POLICY = ResolutionPolicy.NO_BORDER;

export class LoginResolutionCoordinator {
  // 下面三项保存“进入登录页之前”的原始分辨率设置，方便退出时还原。
  private isRestoring = false;
  private originalDesignWidth: number | null = null;
  private originalDesignHeight: number | null = null;
  private originalResolutionPolicy: ResolutionPolicy | number | null = null;

  capture(): void {
    // 进入登录页时先记住原场景分辨率。
    if (this.originalDesignWidth !== null && this.originalDesignHeight !== null) {
      return;
    }

    const size = view.getDesignResolutionSize();
    this.originalDesignWidth = size.width;
    this.originalDesignHeight = size.height;
    this.originalResolutionPolicy = view.getResolutionPolicy();
  }

  applyCurrentFrame(): void {
    // 按当前窗口是横屏还是竖屏，切到对应的登录页设计尺寸。
    const frameSize = screen.windowSize;
    const isPortrait = frameSize.height > frameSize.width;
    const width = isPortrait ? 720 : 1280;
    const height = isPortrait ? 1280 : 720;
    view.setDesignResolutionSize(width, height, LOGIN_RESOLUTION_POLICY);
  }

  shouldIgnoreResize(): boolean {
    return this.isRestoring;
  }

  prepareSceneExit(): void {
    // 准备离开登录页时，先进入“恢复模式”，避免 resize 回调互相打架。
    this.isRestoring = true;
    this.restore();
  }

  restore(): void {
    // 把分辨率改回进入登录页之前的状态。
    if (
      this.originalDesignWidth === null ||
      this.originalDesignHeight === null ||
      this.originalResolutionPolicy === null
    ) {
      return;
    }

    view.setDesignResolutionSize(
      this.originalDesignWidth,
      this.originalDesignHeight,
      this.originalResolutionPolicy
    );
  }
}
