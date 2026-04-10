import { Color } from "cc";

export type Rgba = readonly [number, number, number, number];

export const LOGIN_LAYOUT = {
  portrait: {
    logoArea: {
      width: 400,
      height: 156,
      x: 0,
      yFactor: 0.335,
    },
    panel: {
      width: 420,
      height: 280,
      xFactor: 0,
      yFactor: -0.18,
    },
    logoImage: {
      maxWidthFactor: 0.9,
      maxHeightFactor: 0.8,
      y: 0,
    },
  },
  landscape: {
    logoArea: {
      width: 540,
      height: 176,
      xFactor: 0.01,
      yFactor: 0.385,
    },
    panel: {
      width: 500,
      height: 290,
      xFactor: 0.16,
      yFactor: 0.08,
    },
    logoImage: {
      maxWidthFactor: 0.84,
      maxHeightFactor: 0.82,
      y: 4,
    },
  },
} as const;

export const LOGIN_RUNTIME_LAYOUT = {
  panel: {
    initialWidth: 430,
    initialHeight: 430,
  },
  inputArea: {
    width: 356,
    height: 150,
    offsetY: 36,
  },
  buttonRow: {
    width: 360,
    height: 72,
    offsetY: -92,
    loginX: -90,
    registerX: 90,
  },
  inputs: {
    width: 336,
    height: 58,
    usernameY: 34,
    passwordY: -40,
  },
  buttons: {
    width: 156,
    height: 54,
  },
  statusArea: {
    widthFactor: 0.62,
    height: 76,
    portraitBottomOffset: 128,
    landscapeBottomOffset: 78,
  },
  statusText: {
    widthFactor: 0.52,
    height: 34,
  },
  loadingText: {
    width: 220,
    height: 24,
    offsetY: -26,
  },
} as const;

export const LOGIN_THEME = {
  logo: {
    badgeShadow: [17, 28, 46, 24] as Rgba,
    badgeFill: [255, 255, 255, 186] as Rgba,
    badgeStroke: [133, 182, 236, 94] as Rgba,
    iconFace: [242, 151, 82, 188] as Rgba,
    iconEarLeft: [242, 151, 82, 172] as Rgba,
    iconEarRight: [242, 151, 82, 140] as Rgba,
    title: [248, 250, 255, 255] as Rgba,
    subtitle: [223, 233, 246, 224] as Rgba,
  },
  panel: {
    shadow: [6, 12, 20, 64] as Rgba,
    fillPortrait: [26, 38, 58, 194] as Rgba,
    fillLandscape: [26, 38, 58, 188] as Rgba,
    stroke: [152, 197, 245, 74] as Rgba,
    innerGlow: [255, 255, 255, 18] as Rgba,
    topSheen: [255, 255, 255, 14] as Rgba,
  },
  input: {
    shadow: [12, 20, 34, 34] as Rgba,
    fill: [248, 250, 255, 236] as Rgba,
    stroke: [152, 182, 223, 132] as Rgba,
    highlight: [255, 255, 255, 46] as Rgba,
    text: [61, 82, 112, 255] as Rgba,
    placeholder: [144, 159, 185, 210] as Rgba,
  },
  button: {
    shadowPrimary: [12, 35, 24, 48] as Rgba,
    shadowSecondary: [19, 32, 51, 28] as Rgba,
    fillPrimary: [72, 202, 134, 255] as Rgba,
    fillSecondary: [251, 252, 255, 236] as Rgba,
    strokePrimary: [176, 242, 202, 74] as Rgba,
    strokeSecondary: [115, 170, 226, 94] as Rgba,
    glossPrimary: [255, 255, 255, 28] as Rgba,
    glossSecondary: [255, 255, 255, 40] as Rgba,
    textPrimary: [255, 255, 255, 255] as Rgba,
    textSecondary: [57, 107, 170, 255] as Rgba,
  },
  loading: {
    text: [221, 229, 239, 190] as Rgba,
  },
  status: {
    success: [86, 205, 134, 255] as Rgba,
    error: [255, 125, 125, 255] as Rgba,
    neutral: [235, 239, 244, 255] as Rgba,
  },
} as const;

export function themeColor(value: Rgba): Color {
  return new Color(value[0], value[1], value[2], value[3]);
}
