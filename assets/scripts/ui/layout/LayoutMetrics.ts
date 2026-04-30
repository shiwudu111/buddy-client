export type DeviceClass = "compact" | "regular" | "expanded";

export type LayoutMetrics = {
  deviceClass: DeviceClass;
  screenWidth: number;
  screenHeight: number;
  pageMargin: number;
  shellPadding: number;
  frameGap: number;
  shellMaxWidth: number;
  shellMaxHeight: number;
  shellPreferredAspect: number;
  shellMinWidth: number;
  shellMinHeight: number;
  safeWidth: number;
  safeHeight: number;
  pagePadding: number;
  topBarHeight: number;
  bottomBarHeight: number;
  mainGap: number;
  leftPanelWidth: number;
  rightPanelWidth: number;
  centerPanelMinWidth: number;
  showRightLogPanel: boolean;
  collapseLeftStatusPanel: boolean;
  useScrollableActionBar: boolean;
  useMiniChat: boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function resolveLayoutMetrics(screenWidth: number, screenHeight: number): LayoutMetrics {
  const safeScreenWidth = Math.max(320, screenWidth);
  const safeScreenHeight = Math.max(240, screenHeight);
  const shortSide = Math.min(safeScreenWidth, safeScreenHeight);
  const longSide = Math.max(safeScreenWidth, safeScreenHeight);
  const aspectRatio = longSide / shortSide;
  const isPortrait = safeScreenHeight >= safeScreenWidth;

  let deviceClass: DeviceClass = "expanded";
  if (isPortrait || shortSide < 700 || aspectRatio > 1.9) {
    deviceClass = "compact";
  } else if (shortSide < 1000) {
    deviceClass = "regular";
  }

  const pageMargin = deviceClass === "compact" ? 10 : deviceClass === "regular" ? 14 : 16;
  const shellPadding = deviceClass === "compact" ? 12 : deviceClass === "regular" ? 16 : 18;
  const frameGap = deviceClass === "compact" ? 10 : deviceClass === "regular" ? 14 : 16;
  const shellMaxWidth = safeScreenWidth;
  const shellMaxHeight = safeScreenHeight;
  const shellPreferredAspect = deviceClass === "compact" ? 0.86 : 4 / 3;
  const shellMinWidth = deviceClass === "compact" ? 760 : deviceClass === "regular" ? 900 : 960;
  const shellMinHeight = deviceClass === "compact" ? 620 : deviceClass === "regular" ? 660 : 680;

  const safeWidth = Math.max(0, safeScreenWidth - pageMargin * 2);
  const safeHeight = Math.max(0, safeScreenHeight - pageMargin * 2);

  const topBarHeight = deviceClass === "compact" ? 76 : deviceClass === "regular" ? 88 : 92;
  const bottomBarHeight = deviceClass === "compact" ? 104 : deviceClass === "regular" ? 124 : 132;
  const mainGap = frameGap;
  const leftPanelWidth = deviceClass === "compact" ? 254 : deviceClass === "regular" ? 268 : 278;
  const rightPanelWidth = deviceClass === "compact" ? 0 : deviceClass === "regular" ? 252 : 268;
  const centerPanelMinWidth = deviceClass === "compact" ? 428 : deviceClass === "regular" ? 448 : 520;

  return {
    deviceClass,
    screenWidth: safeScreenWidth,
    screenHeight: safeScreenHeight,
    pageMargin,
    shellPadding,
    frameGap,
    shellMaxWidth,
    shellMaxHeight,
    shellPreferredAspect,
    shellMinWidth,
    shellMinHeight,
    safeWidth,
    safeHeight,
    pagePadding: pageMargin,
    topBarHeight,
    bottomBarHeight,
    mainGap,
    leftPanelWidth,
    rightPanelWidth,
    centerPanelMinWidth,
    showRightLogPanel: deviceClass !== "compact",
    collapseLeftStatusPanel: deviceClass === "compact",
    useScrollableActionBar: deviceClass === "compact",
    useMiniChat: true,
  };
}
