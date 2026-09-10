import type { Card } from "./types";

let seed: Card | null = null;

export function setCardSeed(card: Card) {
  seed = card;
}

export function peekCardSeed(id: string): Card | null {
  return seed?.id === id ? seed : null;
}
