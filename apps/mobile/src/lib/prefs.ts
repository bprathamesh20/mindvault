import { storage } from "./storage";
import { createStore, useStore } from "./store";

export type ThemePreference = "system" | "light" | "dark";

export const ASK_MODELS = [
  { id: "z-ai/glm-5.3-flash", name: "GLM 5.3 Flash" },
  { id: "deepseek/deepseek-v4.1-flash", name: "DeepSeek 4.1 Flash" },
  { id: "deepseek/deepseek-v4-flash", name: "DeepSeek 4 Flash" },
  { id: "qwen/qwen3.7-flash", name: "Qwen 3.7 Flash" },
] as const;

export type Prefs = {
  theme: ThemePreference;
  askModel: string;
  recentSearches: string[];
};

const KEY = "mv_prefs";
const MAX_RECENTS = 8;

const defaults: Prefs = {
  theme: "system",
  askModel: ASK_MODELS[0].id,
  recentSearches: [],
};

export const prefsStore = createStore<Prefs>(defaults);

let hydrated = false;

/** Loads saved prefs once; safe to call from several places. */
export async function hydratePrefs() {
  if (hydrated) return;
  hydrated = true;
  try {
    const raw = await storage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as Partial<Prefs>;
    prefsStore.set((p) => ({ ...p, ...saved }));
  } catch {
    // Corrupt prefs are not worth a crash — fall back to defaults.
  }
}

export function setPrefs(patch: Partial<Prefs>) {
  prefsStore.set((p) => ({ ...p, ...patch }));
  void storage.setItem(KEY, JSON.stringify(prefsStore.get())).catch(() => {});
}

export function rememberSearch(q: string) {
  const term = q.trim();
  if (term.length < 2) return;
  const rest = prefsStore
    .get()
    .recentSearches.filter((s) => s.toLowerCase() !== term.toLowerCase());
  setPrefs({ recentSearches: [term, ...rest].slice(0, MAX_RECENTS) });
}

export function usePrefs(): Prefs {
  return useStore(prefsStore);
}

export function modelName(id: string): string {
  return ASK_MODELS.find((m) => m.id === id)?.name ?? id;
}
