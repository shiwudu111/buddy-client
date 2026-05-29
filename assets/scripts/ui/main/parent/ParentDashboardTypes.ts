import type { Node } from "cc";
import type { ChildPetPayload, WeeklyReportPayload } from "../../../types/api";

export type ParentColumnKey = "pet" | "insight" | "homework";

export type ParentDashboardLayout = {
  viewportWidth: number;
  viewportHeight: number;
};

export type ParentHomeworkCompletion = {
  completed: number;
  total: number;
  percent: number;
  summary: string;
};

export type ParentColumnPlacement = {
  x: number;
  width: number;
};

export type ParentColumnLayout = Record<ParentColumnKey, ParentColumnPlacement>;

export type ParentDashboardUser = {
  username?: string | null;
  childId?: string | null;
  childNickname?: string | null;
} | null;

export type ParentColumnRenderOptions = {
  x: number;
  y: number;
  width: number;
  height: number;
  column: ParentColumnKey;
};

export type ParentRingProgressOptions = {
  name: string;
  x: number;
  y: number;
  radius: number;
  percent: number;
  title: string;
  value: string;
};

export type ParentDashboardCallbacks = {
  resolveChildDisplayName(childLabel: string): string;
  resolveChildMetaText(childLabel: string): string;
  resolveColumnLayout(contentWidth: number, gap: number): ParentColumnLayout;
  onRefresh(): void;
  onLogout(): void;
  renderRingProgress(parent: Node, options: ParentRingProgressOptions): void;
  renderBindEmptyState(parent: Node, contentWidth: number, panelHeight: number, y: number): void;
  renderPetGrowthPanel(parent: Node, options: ParentColumnRenderOptions): void;
  renderInsightScroll(parent: Node, options: ParentColumnRenderOptions): void;
  renderHomeworkPanel(parent: Node, options: ParentColumnRenderOptions): void;
};

export type ParentDashboardPanelState = {
  user: ParentDashboardUser;
  linkedChildId: string | null;
  notice: string;
  overviewLoading: boolean;
  reportLoading: boolean;
  completion: ParentHomeworkCompletion;
  overviewData: ChildPetPayload | null;
  reportData: WeeklyReportPayload | null;
};
