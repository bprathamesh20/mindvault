import { useSyncExternalStore } from "react";
import type { Card } from "../components/types";

const KEY = "mv-cards";
const EMPTY: Card[] = [];
const listeners = new Set<() => void>();
let snapshot: Card[] = EMPTY;
let loaded = false;

function parseCache(): Card[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Card[];
    if (!Array.isArray(parsed) || parsed.length === 0) return EMPTY;
    return parsed.slice(0, 24);
  } catch {
    return EMPTY;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function writeCardCache(cards: Card[]) {
  const next = cards.slice(0, 24);
  try {
    if (next.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota */
  }
  snapshot = next.length === 0 ? EMPTY : next;
  loaded = true;
  emit();
}

export function readCardCache(): Card[] {
  return snapshot;
}

export function useCardCache(): Card[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (!loaded) {
        snapshot = parseCache();
        loaded = true;
      }
      listeners.add(onStoreChange);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== KEY && e.key !== null) return;
        snapshot = parseCache();
        onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onStoreChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    readCardCache,
    () => EMPTY,
  );
}
