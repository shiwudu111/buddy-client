import type { ParentColumnKey, ParentColumnLayout } from "./ParentDashboardTypes";

const PARENT_COLUMN_KEYS: ParentColumnKey[] = ["pet", "insight", "homework"];
const PARENT_COLUMN_ANIMATION_MS = 260;

export type ParentColumnLayoutState = {
  contentWidth: number;
  gap: number;
  expandedColumn: ParentColumnKey | null;
  animationFrom: ParentColumnKey | null;
  animationTo: ParentColumnKey | null;
  animationStart: number;
  now: number;
};

export function resolveParentColumnLayout(state: ParentColumnLayoutState): ParentColumnLayout {
  const totalColumnWidth = state.contentWidth - state.gap * 2;
  const fromWidths = resolveParentColumnWidths(totalColumnWidth, state.animationFrom);
  const toWidths = resolveParentColumnWidths(totalColumnWidth, state.animationTo ?? state.expandedColumn);
  const rawProgress = resolveParentColumnAnimationProgress(state.animationStart, state.now);
  const easedProgress = easeInOutQuad(rawProgress);
  const widths = PARENT_COLUMN_KEYS.map((_, index) =>
    Math.round(fromWidths[index] + (toWidths[index] - fromWidths[index]) * easedProgress)
  );
  const correctedWidths = [widths[0], widths[1], totalColumnWidth - widths[0] - widths[1]];
  const left = -state.contentWidth / 2;
  const petX = left + correctedWidths[0] / 2;
  const insightX = left + correctedWidths[0] + state.gap + correctedWidths[1] / 2;
  const homeworkX = left + correctedWidths[0] + state.gap + correctedWidths[1] + state.gap + correctedWidths[2] / 2;
  return {
    pet: { x: petX, width: correctedWidths[0] },
    insight: { x: insightX, width: correctedWidths[1] },
    homework: { x: homeworkX, width: correctedWidths[2] },
  };
}

export function resolveParentColumnAnimationProgress(animationStart: number, now: number): number {
  if (animationStart <= 0) {
    return 1;
  }
  const elapsed = now - animationStart;
  return Math.max(0, Math.min(1, elapsed / PARENT_COLUMN_ANIMATION_MS));
}

function resolveParentColumnWidths(totalColumnWidth: number, expandedColumn: ParentColumnKey | null): number[] {
  const normalWidth = Math.round(totalColumnWidth / 3);
  if (expandedColumn == null) {
    return [normalWidth, totalColumnWidth - normalWidth * 2, normalWidth];
  }
  const expandedWidth = Math.round(totalColumnWidth * 0.48);
  const collapsedWidth = Math.round((totalColumnWidth - expandedWidth) / 2);
  return PARENT_COLUMN_KEYS.map((key) => (key === expandedColumn ? expandedWidth : collapsedWidth));
}

function easeInOutQuad(value: number): number {
  return value < 0.5 ? 2 * value * value : 1 - Math.pow(-2 * value + 2, 2) / 2;
}
