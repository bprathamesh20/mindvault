import type { OptimisticLocalStore } from "convex/browser";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

export function optimisticRemoveItem(
  localStore: OptimisticLocalStore,
  id: Id<"items">,
) {
  localStore.setQuery(api.items.get, { id }, null);
  for (const q of localStore.getAllQueries(api.items.list)) {
    if (q.value && Array.isArray(q.value.page)) {
      localStore.setQuery(api.items.list, q.args, {
        ...q.value,
        page: q.value.page.filter((c) => c.id !== id),
      });
    }
  }
  for (const q of localStore.getAllQueries(api.search.keyword)) {
    if (Array.isArray(q.value)) {
      localStore.setQuery(
        api.search.keyword,
        q.args,
        q.value.filter((c) => c.id !== id),
      );
    }
  }
}

export function optimisticPatchItem(
  localStore: OptimisticLocalStore,
  id: Id<"items">,
  patch: {
    title?: string;
    userNote?: string;
    isDone?: boolean;
    tags?: string[];
  },
) {
  const current = localStore.getQuery(api.items.get, { id });
  if (current) {
    localStore.setQuery(api.items.get, { id }, { ...current, ...patch });
  }
}
