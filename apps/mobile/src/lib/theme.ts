import { useMemo } from "react";
import { Platform, useColorScheme } from "react-native";
import { usePrefs } from "./prefs";

/**
 * The web app's palette, carried over token for token: warm stone neutrals
 * in light mode, mymind-style ink surfaces in dark mode, and a monochrome
 * primary (stone-900 / stone-100) instead of a colored tint. Orange is kept
 * only as the small accent the web uses for "Add tag". Text tiers are nudged
 * one step darker (light) / lighter (dark) than the web where the web value
 * misses WCAG AA on its surface.
 */
const light = {
  scheme: "light" as "light" | "dark",
  bg: "#FAFAF9", // body
  surface: "#FFFFFF", // .surface
  card: "#FFFFFF", // grid card
  cardBorder: "rgba(231,229,228,0.8)", // stone-200/80
  surfaceAlt: "#F5F5F4", // stone-100
  elevated: "#FFFFFF",
  fill: "rgba(120,113,108,0.10)", // stone-500 wash (hover:bg-stone-200/50)
  fillStrong: "rgba(120,113,108,0.18)",
  border: "#E7E5E4", // stone-200
  separator: "#E7E5E4",
  borderStrong: "#D6D3D1", // stone-300
  text: "#1C1917", // stone-900
  textBody: "#44403C", // stone-700
  textMuted: "#57534E", // stone-600
  textFaint: "#78716C", // stone-500
  placeholder: "#A8A29E", // stone-400
  tint: "#1C1917", // primary = stone-900
  tintSoft: "rgba(28,25,23,0.06)",
  onTint: "#FAFAF9",
  accent: "#EA580C", // orange-600, "+ Add tag"
  onAccent: "#FFFFFF",
  danger: "#DC2626", // red-600
  dangerSoft: "#FEF2F2",
  success: "#059669",
  inverse: "#1C1917",
  inverseText: "#FAFAF9",
  overlay: "rgba(0,0,0,0.6)", // bg-black/60
  noteGradient: ["#EEF2FF", "#F5F3FF", "#FFFFFF"] as readonly [string, string, string],
  noteBorder: "#C7D2FE",
  noteBg: "#EEF2FF",
  shadow: "#000000",
};

export type Palette = typeof light;

const dark: Palette = {
  scheme: "dark",
  bg: "#0F0F13", // body
  surface: "#1B1B20", // .surface
  card: "#17171D", // grid card
  cardBorder: "rgba(255,255,255,0.06)",
  surfaceAlt: "#17171B", // modal pane
  elevated: "#232329", // hover / raised
  fill: "rgba(139,139,148,0.14)",
  fillStrong: "rgba(139,139,148,0.24)",
  border: "#2A2A31",
  separator: "#2A2A31",
  borderStrong: "#3A3A42",
  text: "#F1F1F4",
  textBody: "#E4E4E7",
  textMuted: "#9B9BA4",
  textFaint: "#8B8B94",
  placeholder: "#6B6B75",
  tint: "#F5F5F4", // primary = stone-100
  tintSoft: "rgba(245,245,244,0.08)",
  onTint: "#1C1917",
  accent: "#EA580C",
  onAccent: "#FFFFFF",
  danger: "#F87171", // red-400
  dangerSoft: "rgba(248,113,113,0.12)",
  success: "#34D399",
  inverse: "#F5F5F4",
  inverseText: "#1C1917",
  overlay: "rgba(0,0,0,0.7)",
  noteGradient: ["#1F1D33", "#1B1A27", "#17171D"],
  noteBorder: "#2F2C4A",
  noteBg: "#1D1C2B",
  shadow: "#000000",
};

export const palettes = { light, dark };

/**
 * Newsreader is the web's serif (next/font). Custom fonts ignore
 * fontWeight on Android, so each weight/style is its own family.
 * Body text stays on the platform font — the closest match to Inter.
 */
export const fonts = {
  serif: "Newsreader_400Regular",
  serifItalic: "Newsreader_400Regular_Italic",
  serifMedium: "Newsreader_500Medium",
  serifBold: "Newsreader_700Bold",
  mono: Platform.select({ ios: "Menlo", default: "monospace" }),
} as const;

export const radius = {
  xs: 6,
  sm: 10, // rounded-lg (0.625rem)
  md: 14, // rounded-xl
  lg: 16, // rounded-2xl — cards and modals
  xl: 24,
  full: 999,
} as const;

export const space = {
  gutter: 16,
  section: 28,
} as const;

/** Minimum touch target on every platform (Apple HIG: 44pt). */
export const HIT = 44;

export function useTheme(): Palette {
  const system = useColorScheme();
  const { theme } = usePrefs();
  const scheme = theme === "system" ? (system === "dark" ? "dark" : "light") : theme;
  return scheme === "dark" ? dark : light;
}

/**
 * Builds a StyleSheet from the active palette; recomputed only when the
 * palette flips between light and dark.
 */
export function useStyles<T>(factory: (c: Palette) => T): T {
  const c = useTheme();
  return useMemo(() => factory(c), [factory, c]);
}

/** `#RRGGBB` → `rgba(r,g,b,a)`; used for fades that end on a surface color. */
export function alpha(hex: string, a: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
