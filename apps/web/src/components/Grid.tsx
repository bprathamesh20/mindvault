"use client";

import { useEffect, useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { peekCardCache, writeCardCache } from "../lib/card-cache";
import { ItemCard } from "./ItemCard";
import { MASONRY } from "./layout";
import type { Card, ItemType } from "./types";

const FILTERS = [
  { label: "All", value: undefined },
  { label: "Articles", value: "article" },
  { label: "Tweets", value: "tweet" },
  { label: "Instagram", value: "instagram" },
  { label: "YouTube", value: "youtube" },
  { label: "Products", value: "product" },
  { label: "Documents", value: "document" },
  { label: "GitHub", value: "github" },
  { label: "Notes", value: "note" },
] as const;

export function GridSkeleton() {
  return (
    <div className={MASONRY}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="mb-5 h-48 break-inside-avoid animate-pulse rounded-xl bg-stone-200 dark:bg-[#232329]"
        />
      ))}
    </div>
  );
}

export default function Grid({
  onOpen,
  type,
  onTypeChange,
}: {
  onOpen?: (item: Card) => void;
  // Owned by the page so the command menu can drive it too.
  type: ItemType | undefined;
  onTypeChange: (type: ItemType | undefined) => void;
}) {
  const spaces = useQuery(api.spaces.list);
  const createSpace = useMutation(api.spaces.create);
  const removeSpace = useMutation(api.spaces.remove);

  const [tag, setTag] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [spaceName, setSpaceName] = useState("");

  const [cached] = useState(peekCardCache);
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.items.list,
    { type, tag: tag ?? undefined },
    { initialNumItems: 24 },
  );

  useEffect(() => {
    if (type || tag || isLoading) return;
    writeCardCache(results);
  }, [results, type, tag, isLoading]);

  const cards =
    results.length > 0
      ? results
      : isLoading && !type && !tag
        ? cached
        : [];

  const filterActive = type !== undefined || tag !== null;

  function applyType(value: ItemType | undefined) {
    onTypeChange(value);
    setActiveSpaceId(null);
  }
  function applyTag(next: string | null) {
    setTag(next);
    setActiveSpaceId(null);
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => applyType(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
              type === f.value && !activeSpaceId
                ? "bg-stone-800 text-stone-100 dark:bg-stone-200 dark:text-stone-900"
                : "text-stone-500 hover:bg-stone-200/50 dark:text-[#8b8b94] dark:hover:bg-[#232329]"
            }`}
          >
            {f.label}
          </button>
        ))}
        {tag && (
          <button
            onClick={() => applyTag(null)}
            className="rounded-full bg-stone-800 px-3.5 py-1.5 text-[13px] text-stone-100 dark:bg-stone-200 dark:text-stone-900"
          >
            #{tag} ✕
          </button>
        )}
      </div>

      {(filterActive || (spaces && spaces.length > 0)) && createSpace && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-1.5">
          {spaces?.map((s) => (
            <span
              key={s.id}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] transition ${
                activeSpaceId === s.id
                  ? "border-stone-400 bg-stone-100 text-stone-900 dark:border-[#4a4a55] dark:bg-[#232329] dark:text-stone-100"
                  : "border-stone-200 text-stone-500 hover:border-stone-400 dark:border-[#2a2a31] dark:text-[#8b8b94] dark:hover:border-[#4a4a55]"
              }`}
            >
              <button onClick={() => { onTypeChange(s.type); setTag(s.tag ?? null); setActiveSpaceId(s.id); }}>
                ✦ {s.name}
              </button>
              {activeSpaceId === s.id && (
                <button
                  aria-label={`Delete space ${s.name}`}
                  onClick={() => { void removeSpace({ id: s.id }); setActiveSpaceId(null); }}
                  className="text-stone-400 hover:text-red-400"
                >
                  ✕
                </button>
              )}
            </span>
          ))}
          {filterActive && !naming && (
            <button
              onClick={() => setNaming(true)}
              className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-[12px] text-stone-400 hover:border-stone-500 dark:border-[#3a3a42] dark:hover:border-[#5b5b64]"
            >
              ＋ Save view as Space
            </button>
          )}
          {naming && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const name = spaceName.trim();
                if (name) {
                  createSpace({ name, type, tag: tag ?? undefined }).then(
                    (id: string) => setActiveSpaceId(id),
                  );
                }
                setNaming(false);
                setSpaceName("");
              }}
              className="inline-flex items-center gap-1"
            >
              <input
                autoFocus
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                placeholder="Space name…"
                className="w-36 rounded-full border border-stone-300 bg-transparent px-3 py-1 text-[12px] outline-none dark:border-[#3a3a42]"
              />
              <button type="submit" className="rounded-full bg-stone-800 px-3 py-1 text-[12px] text-stone-100 dark:bg-stone-200 dark:text-stone-900">
                Save
              </button>
            </form>
          )}
        </div>
      )}

      {cards.length === 0 && isLoading ? (
        <GridSkeleton />
      ) : cards.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif text-2xl italic text-stone-400 dark:text-[#6b6b75]">
            {filterActive ? "Nothing here yet." : "Your vault is empty."}
          </p>
        </div>
      ) : (
        <div className={MASONRY}>
          {cards.map((item) => (
            <ItemCard key={item.id} item={item} onOpen={onOpen} />
          ))}
        </div>
      )}

      {status === "CanLoadMore" && (
        <div className="mt-4 pb-16 text-center">
          <button
            onClick={() => loadMore(24)}
            className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-600 transition hover:bg-stone-100 dark:border-[#2a2a31] dark:text-[#9b9ba4] dark:hover:bg-[#1f1f25]"
          >
            Load more
          </button>
        </div>
      )}
    </>
  );
}

