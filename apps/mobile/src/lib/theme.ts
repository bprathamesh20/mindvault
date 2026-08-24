import { Platform } from "react-native";

export const colors = {
  bg: "#fafaf9",
  surface: "#ffffff",
  surfaceAlt: "#f5f5f4",
  border: "#e7e5e4",
  borderStrong: "#d6d3d1",
  text: "#1c1917",
  textBody: "#44403c",
  textMuted: "#78716c",
  textFaint: "#a8a29e",
  accent: "#ea580c",
  danger: "#dc2626",
  dangerSoft: "#fef2f2",
  done: "#059669",
  doneSoft: "#ecfdf5",
  noteBg: "#fffbeb",
  noteBorder: "#fde68a",
  inverse: "#1c1917",
  inverseText: "#fafaf9",
} as const;

export const fonts = {
  serif: Platform.select({ ios: "Georgia", default: "serif" }),
  sans: undefined,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  full: 999,
} as const;
