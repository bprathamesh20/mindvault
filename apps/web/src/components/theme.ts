"use client";

export type Theme = "dark" | "light";

const KEY = "mv-theme";
const EVENT = "mv-theme-change";

export function getTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return localStorage.getItem(KEY) === "light" ? "light" : "dark";
}

export function setTheme(next: Theme) {
  localStorage.setItem(KEY, next);
  document.documentElement.classList.toggle("dark", next === "dark");
  // Tints Safari's toolbar and the home-screen app's status bar.
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", next === "dark" ? "#0f0f13" : "#fafaf9");
  // Lets every surface that shows the theme (rail, command menu) stay in sync
  // no matter which one flipped it.
  window.dispatchEvent(new CustomEvent<Theme>(EVENT, { detail: next }));
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  setTheme(next);
  return next;
}

export function onThemeChange(fn: (theme: Theme) => void): () => void {
  const handler = (e: Event) => fn((e as CustomEvent<Theme>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
