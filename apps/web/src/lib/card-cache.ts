import { useSyncExternalStore } from "react";
import type { Card } from "../components/types";

const KEY = "mv-cards";
const EMPTY: Card[] = [];
const listeners = new Set<() => void>();
let snapshot: Card[] = EMPTY;
let lastJson = "";
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

function hydrate() {
  if (loaded) return;
  snapshot = parseCache();
  lastJson = snapshot === EMPTY ? "" : JSON.stringify(snapshot);
  loaded = true;
}

function emit() {
  for (const listener of listeners) listener();
}

export function writeCardCache(cards: Card[]) {
  const next = cards.slice(0, 24);
  const json = next.length === 0 ? "" : JSON.stringify(next);
  if (json === lastJson) return;
  lastJson = json;
  try {
    if (next.length === 0) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, json);
  } catch {
    /* quota */
  }
  snapshot = next.length === 0 ? EMPTY : next;
  loaded = true;
  emit();
}

export function peekCardCache(): Card[] {
  if (typeof window !== "undefined") hydrate();
  return snapshot;
}

export function useCardCache(): Card[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      hydrate();
      listeners.add(onStoreChange);
      const onStorage = (e: StorageEvent) => {
        if (e.key !== KEY && e.key !== null) return;
        loaded = false;
        hydrate();
        onStoreChange();
      };
      window.addEventListener("storage", onStorage);
      return () => {
        listeners.delete(onStoreChange);
        window.removeEventListener("storage", onStorage);
      };
    },
    peekCardCache,
    () => EMPTY,
  );
}
