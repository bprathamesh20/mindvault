import { useSyncExternalStore } from "react";
import type { Card } from "../components/types";

const KEY = "mv-cards";
const EMPTY: Card[] = [];

export function writeCardCache(cards: Card[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(cards.slice(0, 24)));
  } catch {
    /* quota */
  }
}

export function readCardCache(): Card[] {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Card[];
    return Array.isArray(parsed) ? parsed.slice(0, 24) : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function useCardCache(): Card[] {
  return useSyncExternalStore(
    (onStoreChange) => {
      window.addEventListener("storage", onStoreChange);
      return () => window.removeEventListener("storage", onStoreChange);
    },
    readCardCache,
    () => EMPTY,
  );
}
