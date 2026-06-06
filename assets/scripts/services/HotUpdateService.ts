import { native, sys } from "cc";
import { BASE_APK_VERSION, getHotUpdateManifestUrl } from "../core/config";
import { devActionLogger } from "../core/DevActionLogger";

type HotUpdateStatus =
  | "disabled"
  | "unsupported"
  | "upToDate"
  | "updating"
  | "updated"
  | "failed";

type NativeAssetsManager = {
  setVerifyCallback?: (callback: (path: string, asset: unknown) => boolean) => void;
  setVersionCompareHandle?: (callback: (versionA: string, versionB: string) => number) => void;
  setEventCallback: (callback: ((event: NativeAssetsManagerEvent) => void) | null) => void;
  getState?: () => number;
  checkUpdate: () => void;
  update: () => void;
  getLocalManifest?: () => NativeManifest | null;
  getRemoteManifest?: () => NativeManifest | null;
};

type NativeManifest = {
  getVersion?: () => string;
  getSearchPaths?: () => string[];
};

type NativeAssetsManagerEvent = {
  getEventCode: () => number;
  getMessage?: () => string;
  getPercent?: () => number;
  getDownloadedFiles?: () => number;
  getTotalFiles?: () => number;
};

type NativeHotUpdateApi = typeof native & {
  AssetsManager?: new (
    manifestUrl: string,
    storagePath: string,
    versionCompareHandle: (versionA: string, versionB: string) => number
  ) => NativeAssetsManager;
  EventAssetsManager?: Record<string, number>;
};

export type HotUpdateResult = {
  status: HotUpdateStatus;
  message?: string;
};

export type HotUpdateProgressStage =
  | "disabled"
  | "unsupported"
  | "checking"
  | "upToDate"
  | "downloading"
  | "updated"
  | "failed";

export type HotUpdateProgress = {
  stage: HotUpdateProgressStage;
  message?: string;
  percent?: number;
  downloaded?: number;
  total?: number;
  localVersion: string;
  remoteVersion: string;
  manifestUrl: string;
};

export type HotUpdateOptions = {
  force?: boolean;
  onProgress?: (progress: HotUpdateProgress) => void;
};

const HOT_UPDATE_STORAGE_DIR = "buddy-hot-update";
const LOCAL_MANIFEST_FILE = "buddy-local-project.manifest";
const LOCAL_VERSION = "0.0.0";
const HOT_UPDATE_STEP_TIMEOUT_MS = 60000;
const HOT_UPDATE_FAILED_COUNT_KEY = "buddy.hotUpdate.failedCount";
const HOT_UPDATE_AUTO_PAUSE_THRESHOLD = 3;

class HotUpdateService {
  private isChecking = false;
  private localVersion = "unknown";
  private remoteVersion = "unknown";
  private packageUrl = "unknown";
  private manifestUrl = "";
  private stage = "idle";
  private lastLoggedDownloadBucket = -1;
  private lastLoggedDownloadedFiles = -1;

  getVersionSummary(): string {
    return [
      `hotUpdate stage=${this.stage}`,
      `base=${BASE_APK_VERSION}`,
      `local=${this.localVersion}`,
      `remote=${this.remoteVersion}`,
      `failed=${this.getFailedCount()}`,
    ].join(" ");
  }

  async checkAndUpdate(options: HotUpdateOptions | boolean = {}): Promise<HotUpdateResult> {
    const normalizedOptions =
      typeof options === "boolean" ? { force: options } : options;
    const force = normalizedOptions.force ?? false;
    const onProgress = normalizedOptions.onProgress;
    const manifestUrl = getHotUpdateManifestUrl();
    this.manifestUrl = manifestUrl;
    if (!manifestUrl) {
      this.reportStage("disabled", undefined, "info", onProgress);
      return { status: "disabled" };
    }

    if (!sys.isNative) {
      this.reportStage("unsupported", "not native runtime", "warn", onProgress);
      return { status: "unsupported", message: "not native runtime" };
    }

    const failedCount = this.getFailedCount();
    if (!force && failedCount >= HOT_UPDATE_AUTO_PAUSE_THRESHOLD) {
      const message = "auto hot update paused after repeated failures";
      this.reportStage("failed", { reason: message, willContinueLogin: true }, "warn", onProgress);
      return { status: "failed", message };
    }

    if (this.isChecking) {
      this.reportStage("downloading", "already checking", "warn", onProgress);
      return { status: "updating" };
    }

    const hotUpdateApi = native as NativeHotUpdateApi;
    if (!hotUpdateApi.AssetsManager || !hotUpdateApi.EventAssetsManager) {
      this.reportStage("unsupported", "AssetsManager unavailable", "warn", onProgress);
      return { status: "unsupported", message: "AssetsManager unavailable" };
    }

    this.isChecking = true;
    try {
      const storagePath = this.resolveStoragePath();
      this.localVersion = this.readStoredProjectVersion(storagePath) ?? LOCAL_VERSION;
      this.packageUrl = this.resolvePackageUrl(manifestUrl);
      this.resetDownloadLogThrottle();
      this.reportStage("checking", undefined, "info", onProgress);
      const localManifestPath = this.writeLocalManifest(manifestUrl, this.localVersion);
      const manager = new hotUpdateApi.AssetsManager(
        localManifestPath,
        storagePath,
        this.compareVersion
      );
      manager.setVerifyCallback?.(() => true);

      const checkResult = await this.checkUpdate(
        manager,
        hotUpdateApi.EventAssetsManager,
        onProgress
      );
      this.captureVersions(manager);
      if (checkResult.status !== "updating") {
        if (checkResult.status === "failed") {
          this.handleFailure(checkResult.message ?? "hot update check failed");
        }
        return checkResult;
      }

      const updateResult = await this.runUpdate(
        manager,
        hotUpdateApi.EventAssetsManager,
        onProgress
      );
      if (updateResult.status === "updated") {
        this.clearFailedCount();
      } else if (updateResult.status === "failed") {
        this.handleFailure(updateResult.message ?? "hot update failed");
      }
      return updateResult;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.reportStage("failed", message, "error", onProgress);
      this.handleFailure(message);
      return { status: "failed", message };
    } finally {
      this.isChecking = false;
    }
  }

  async manualCheckAndUpdate(): Promise<HotUpdateResult> {
    this.reportStage("checking", { manual: true });
    return this.checkAndUpdate({ force: true });
  }

  clearCache(): void {
    try {
      if (sys.isNative) {
        const hotUpdateApi = native as NativeHotUpdateApi;
        if (hotUpdateApi.fileUtils?.removeDirectory) {
          const storagePath = this.resolveStoragePath(false);
          if (native.fileUtils.isDirectoryExist(storagePath)) {
            native.fileUtils.removeDirectory(storagePath);
          }
        }
        const localManifestPath = `${native.fileUtils.getWritablePath()}${LOCAL_MANIFEST_FILE}`;
        if (native.fileUtils.isFileExist(localManifestPath)) {
          native.fileUtils.removeFile(localManifestPath);
        }
      }
      this.clearFailedCount();
      this.localVersion = LOCAL_VERSION;
      this.remoteVersion = "unknown";
      this.packageUrl = "unknown";
      this.reportStage("cacheCleared");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.reportStage("failed", { reason: `clear cache failed: ${message}`, willContinueLogin: true }, "warn");
    }
  }

  private checkUpdate(
    manager: NativeAssetsManager,
    eventCodes: Record<string, number>,
    onProgress?: (progress: HotUpdateProgress) => void
  ): Promise<HotUpdateResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        manager.setEventCallback(null);
        const message = "hot update check timeout";
        this.reportStage("failed", message, "warn", onProgress);
        resolve({ status: "failed", message });
      }, HOT_UPDATE_STEP_TIMEOUT_MS);

      const finish = (result: HotUpdateResult): void => {
        clearTimeout(timeoutId);
        manager.setEventCallback(null);
        resolve(result);
      };

      manager.setEventCallback((event) => {
        const code = event.getEventCode();
        if (code === eventCodes.ALREADY_UP_TO_DATE) {
          this.captureVersions(manager);
          this.reportStage("upToDate", undefined, "info", onProgress);
          finish({ status: "upToDate" });
          return;
        }

        if (code === eventCodes.NEW_VERSION_FOUND) {
          this.captureVersions(manager);
          this.reportStage("downloading", undefined, "info", onProgress);
          finish({ status: "updating" });
          return;
        }

        if (
          code === eventCodes.ERROR_NO_LOCAL_MANIFEST ||
          code === eventCodes.ERROR_DOWNLOAD_MANIFEST ||
          code === eventCodes.ERROR_PARSE_MANIFEST
        ) {
          const message = event.getMessage?.() ?? "manifest check failed";
          this.reportStage("failed", message, "error", onProgress);
          finish({ status: "failed", message });
        }
      });
      this.reportStage("checking", undefined, "info", onProgress);
      manager.checkUpdate();
    });
  }

  private runUpdate(
    manager: NativeAssetsManager,
    eventCodes: Record<string, number>,
    onProgress?: (progress: HotUpdateProgress) => void
  ): Promise<HotUpdateResult> {
    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        manager.setEventCallback(null);
        const message = "hot update download timeout";
        this.reportStage("failed", message, "warn", onProgress);
        resolve({ status: "failed", message });
      }, HOT_UPDATE_STEP_TIMEOUT_MS);

      const finish = (result: HotUpdateResult): void => {
        clearTimeout(timeoutId);
        manager.setEventCallback(null);
        resolve(result);
      };

      manager.setEventCallback((event) => {
        const code = event.getEventCode();
        if (code === eventCodes.UPDATE_PROGRESSION) {
          this.reportDownloadProgress({
            percent: this.normalizePercent(event.getPercent?.() ?? 0),
            downloaded: event.getDownloadedFiles?.(),
            total: event.getTotalFiles?.(),
          }, onProgress);
          return;
        }

        if (code === eventCodes.UPDATE_FINISHED) {
          this.captureVersions(manager);
          this.applyHotUpdateSearchPaths(manager);
          this.reportStage("updated", { needRestart: true }, "info", onProgress);
          finish({ status: "updated" });
          return;
        }

        if (
          code === eventCodes.UPDATE_FAILED ||
          code === eventCodes.ERROR_UPDATING ||
          code === eventCodes.ERROR_DECOMPRESS
        ) {
          const message = event.getMessage?.() ?? "update failed";
          this.reportStage("failed", message, "error", onProgress);
          finish({ status: "failed", message });
        }
      });
      this.reportStage("downloading", undefined, "info", onProgress);
      manager.update();
    });
  }

  private compareVersion(versionA: string, versionB: string): number {
    const partsA = versionA.split(".").map((part) => Number(part) || 0);
    const partsB = versionB.split(".").map((part) => Number(part) || 0);
    const length = Math.max(partsA.length, partsB.length);
    for (let index = 0; index < length; index += 1) {
      const diff = (partsA[index] ?? 0) - (partsB[index] ?? 0);
      if (diff !== 0) {
        return diff;
      }
    }
    return 0;
  }

  private resolveStoragePath(ensureDirectory = true): string {
    const writablePath = native.fileUtils.getWritablePath();
    const storagePath = `${writablePath}${HOT_UPDATE_STORAGE_DIR}`;
    if (ensureDirectory && !native.fileUtils.isDirectoryExist(storagePath)) {
      native.fileUtils.createDirectory(storagePath);
    }
    return storagePath;
  }

  private writeLocalManifest(remoteManifestUrl: string, localVersion: string): string {
    const writablePath = native.fileUtils.getWritablePath();
    const localManifestPath = `${writablePath}${LOCAL_MANIFEST_FILE}`;
    const remoteBaseUrl = remoteManifestUrl.replace(/\/[^/]*$/, "");
    const localManifest = {
      packageUrl: `${remoteBaseUrl}/`,
      remoteManifestUrl,
      remoteVersionUrl: `${remoteBaseUrl}/version.manifest`,
      version: localVersion,
      assets: {},
      searchPaths: [],
    };
    native.fileUtils.writeStringToFile(JSON.stringify(localManifest), localManifestPath);
    return localManifestPath;
  }

  private captureVersions(manager: NativeAssetsManager): void {
    this.localVersion = manager.getLocalManifest?.()?.getVersion?.() ?? this.localVersion;
    this.remoteVersion = manager.getRemoteManifest?.()?.getVersion?.() ?? this.remoteVersion;
    this.packageUrl = this.resolvePackageUrl(this.manifestUrl);
  }

  private applyHotUpdateSearchPaths(manager: NativeAssetsManager): void {
    const searchPaths = manager.getLocalManifest?.()?.getSearchPaths?.();
    if (!searchPaths?.length) {
      return;
    }

    const currentSearchPaths = native.fileUtils.getSearchPaths?.() ?? [];
    const nextSearchPaths = [...searchPaths, ...currentSearchPaths];
    try {
      sys.localStorage.setItem("HotUpdateSearchPaths", JSON.stringify(nextSearchPaths));
    } catch {
      // Search paths are also applied in memory; storage only helps the next native boot.
    }
    native.fileUtils.setSearchPaths?.(nextSearchPaths);
  }

  private readStoredProjectVersion(storagePath: string): string | null {
    const manifestPath = `${storagePath}/project.manifest`;
    if (!native.fileUtils.isFileExist(manifestPath)) {
      return null;
    }

    try {
      const manifestText = native.fileUtils.getStringFromFile(manifestPath);
      const manifest = JSON.parse(manifestText) as { version?: unknown };
      return typeof manifest.version === "string" && manifest.version.trim()
        ? manifest.version.trim()
        : null;
    } catch {
      return null;
    }
  }

  private reportStage(
    stage: string,
    detail?: unknown,
    level: "info" | "warn" | "error" = "info",
    onProgress?: (progress: HotUpdateProgress) => void
  ): void {
    this.stage = stage;
    const basePayload = {
      stage,
      manifestUrl: this.manifestUrl,
      baseApkVersion: BASE_APK_VERSION,
      localHotUpdateVersion: this.localVersion,
      remoteVersion: this.remoteVersion,
      packageUrl: this.packageUrl,
      failedCount: this.getFailedCount(),
      willContinueLogin: stage === "failed" ? true : undefined,
    };
    const payload =
      detail === undefined
        ? basePayload
        : {
            ...basePayload,
            detail,
          };
    devActionLogger[level](`hotUpdate.${stage}`, payload);
    onProgress?.({
      stage: this.toProgressStage(stage),
      message: this.extractProgressMessage(detail),
      percent: this.extractProgressPercent(detail),
      downloaded: this.extractProgressNumber(detail, "downloaded"),
      total: this.extractProgressNumber(detail, "total"),
      localVersion: this.localVersion,
      remoteVersion: this.remoteVersion,
      manifestUrl: this.manifestUrl,
    });
    console[level === "error" ? "error" : level === "warn" ? "warn" : "log"](
      `[HotUpdate] ${JSON.stringify(payload)}`
    );
  }

  private reportDownloadProgress(
    detail: { percent: number; downloaded?: number; total?: number },
    onProgress?: (progress: HotUpdateProgress) => void
  ): void {
    this.stage = "downloading";
    onProgress?.({
      stage: "downloading",
      percent: detail.percent,
      downloaded: detail.downloaded,
      total: detail.total,
      localVersion: this.localVersion,
      remoteVersion: this.remoteVersion,
      manifestUrl: this.manifestUrl,
    });

    if (!this.shouldLogDownloadProgress(detail)) {
      return;
    }

    this.reportStage("downloading", detail);
  }

  private shouldLogDownloadProgress(detail: {
    percent: number;
    downloaded?: number;
    total?: number;
  }): boolean {
    const bucket = Math.max(0, Math.min(10, Math.floor(detail.percent / 10)));
    const downloaded = detail.downloaded ?? -1;
    const total = detail.total ?? -1;
    const isFinished = detail.percent >= 100 || (total > 0 && downloaded >= total);
    const hasNewBucket = bucket > this.lastLoggedDownloadBucket;
    const hasMeaningfulFileStep =
      total > 0 &&
      downloaded >= 0 &&
      downloaded !== this.lastLoggedDownloadedFiles &&
      (downloaded === 0 || downloaded === total);

    if (!hasNewBucket && !hasMeaningfulFileStep && !isFinished) {
      return false;
    }

    this.lastLoggedDownloadBucket = Math.max(this.lastLoggedDownloadBucket, bucket);
    this.lastLoggedDownloadedFiles = downloaded;
    return true;
  }

  private resetDownloadLogThrottle(): void {
    this.lastLoggedDownloadBucket = -1;
    this.lastLoggedDownloadedFiles = -1;
  }

  private normalizePercent(value: number): number {
    if (!Number.isFinite(value) || value <= 0) {
      return 0;
    }

    const normalized = value <= 1 ? value * 100 : value;
    return Math.max(0, Math.min(100, Math.round(normalized)));
  }

  private toProgressStage(stage: string): HotUpdateProgressStage {
    if (
      stage === "disabled" ||
      stage === "unsupported" ||
      stage === "checking" ||
      stage === "upToDate" ||
      stage === "downloading" ||
      stage === "updated" ||
      stage === "failed"
    ) {
      return stage;
    }

    return "checking";
  }

  private extractProgressMessage(detail: unknown): string | undefined {
    if (typeof detail === "string") {
      return detail;
    }

    if (detail && typeof detail === "object" && "reason" in detail) {
      const reason = (detail as { reason?: unknown }).reason;
      return typeof reason === "string" ? reason : undefined;
    }

    return undefined;
  }

  private extractProgressPercent(detail: unknown): number | undefined {
    if (!detail || typeof detail !== "object" || !("percent" in detail)) {
      return undefined;
    }

    const percent = (detail as { percent?: unknown }).percent;
    return typeof percent === "number" ? this.normalizePercent(percent) : undefined;
  }

  private extractProgressNumber(detail: unknown, key: "downloaded" | "total"): number | undefined {
    if (!detail || typeof detail !== "object" || !(key in detail)) {
      return undefined;
    }

    const value = (detail as Record<string, unknown>)[key];
    return typeof value === "number" ? value : undefined;
  }

  private resolvePackageUrl(manifestUrl: string): string {
    return manifestUrl ? `${manifestUrl.replace(/\/[^/]*$/, "")}/` : "unknown";
  }

  private handleFailure(reason: string): void {
    const failedCount = this.incrementFailedCount();
    this.cleanupFailedDownload();
    this.reportStage("failed", { reason, failedCount, willContinueLogin: true }, "warn");
  }

  private cleanupFailedDownload(): void {
    if (!sys.isNative) {
      return;
    }
    try {
      const temporaryPath = `${this.resolveStoragePath(false)}_temp`;
      if (native.fileUtils.isDirectoryExist(temporaryPath)) {
        native.fileUtils.removeDirectory(temporaryPath);
      }
    } catch {
      // Cleanup is best effort only; failed cleanup must never affect login.
    }
  }

  private getFailedCount(): number {
    try {
      return Number(sys.localStorage.getItem(HOT_UPDATE_FAILED_COUNT_KEY) ?? "0") || 0;
    } catch {
      return 0;
    }
  }

  private incrementFailedCount(): number {
    const nextCount = this.getFailedCount() + 1;
    try {
      sys.localStorage.setItem(HOT_UPDATE_FAILED_COUNT_KEY, String(nextCount));
    } catch {
      // Ignore storage failures; hot update must never block login.
    }
    return nextCount;
  }

  private clearFailedCount(): void {
    try {
      sys.localStorage.removeItem(HOT_UPDATE_FAILED_COUNT_KEY);
    } catch {
      // Ignore storage failures; hot update must never block login.
    }
  }
}

export const hotUpdateService = new HotUpdateService();
