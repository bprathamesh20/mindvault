import { createStore, useStore } from "./store";
import type { ItemType } from "./types";

/**
 * What the Vault grid is showing. Lives outside the screen so the item
 * detail (tap a tag) and Settings (open a Space) can drive it too.
 */
export type VaultFilter = {
  type?: ItemType;
  tag?: string;
  spaceId?: string;
};

export const vaultFilterStore = createStore<VaultFilter>({});

export function useVaultFilter() {
  return useStore(vaultFilterStore);
}

export function setVaultFilter(next: VaultFilter) {
  vaultFilterStore.set(next);
}

/** A question handed to the Ask tab from elsewhere (search, a tag). */
export const pendingAskStore = createStore<string | null>(null);
