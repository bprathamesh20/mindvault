"use client";

import { useState } from "react";
import { useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import ItemCard from "./ItemCard";

const FILTERS = [
  { label: "All", value: undefined },
  { label: "Articles", value: "article" },
  { label: "Tweets", value: "tweet" },
  { label: "Instagram", value: "instagram" },
  { label: "Notes", value: "note" },
] as const;

type ItemType = "article" | "tweet" | "instagram" | "image" | "note" | "link";
type Space = {
  id: string;
  name: string;
  type?: ItemType;
  tag?: string;
};

export default function Grid() {
  const spaces = useQuery(api.spaces.list);
  const createSpace = useMutation(api.spaces.create);
  const removeSpace = useMutation(api.spaces.remove);

  const [type, setType] = useState<ItemType | undefined>(undefined);
  const [tag, setTag] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [spaceName, setSpaceName] = useState("");

  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.items.list,
    { type, tag: tag ?? undefined },
    { initialNumItems: 24 },
  );

  const filterActive = type !== undefined || tag !== null;
  const activeSpace = spaces?.find((s) => s.id === activeSpaceId);

  function applyType(value: ItemType | undefined) {
    setType(value);
    setActiveSpaceId(null);
  }

  function applyTag(next: string | null) {
    setTag(next);
    setActiveSpaceId(null);
  }

  function applySpace(space: Space) {
    setType(space.type);
    setTag(space.tag ?? null);
    setActiveSpaceId(space.id);
  }

  async function saveSpace() {
    const name = spaceName.trim();
    if (!name) return;
    try {
      const id = await createSpace({
        name,
        type: type ?? undefined,
        tag: tag ?? undefined,
      });
      setActiveSpaceId(id);
      setNaming(false);
      setSpaceName("");
    } catch {
      // duplicate-ish failures are non-fatal for a personal app
      setNaming(false);
      setSpaceName("");
    }
  }

  return (
    <section className="mx-auto w-full max-w-6xl px-6">
      <div className="mb-3 flex flex-wrap items-center justify-center gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.label}
            onClick={() => applyType(f.value)}
            className={`rounded-full px-3.5 py-1.5 text-[13px] transition ${
              type === f.value && !activeSpaceId
                ? "bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900"
                : "text-stone-500 hover:bg-stone-200/60 dark:text-stone-400 dark:hover:bg-stone-800/60"
            }`}
          >
            {f.label}
          </button>
        ))}
        {tag && (
          <button
            onClick={() => applyTag(null)}
            className="rounded-full bg-stone-900 px-3.5 py-1.5 text-[13px] text-white transition hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
          >
            #{tag} ✕
          </button>
        )}
      </div>

      {(filterActive || (spaces && spaces.length > 0)) && (
        <div className="mb-8 flex flex-wrap items-center justify-center gap-1.5">
          {spaces?.map((s) => (
            <span
              key={s.id}
              className={`group inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] transition ${
                activeSpaceId === s.id
                  ? "border-stone-400 bg-stone-100 text-stone-900 dark:border-stone-500 dark:bg-stone-800 dark:text-stone-100"
                  : "border-stone-200 text-stone-500 hover:border-stone-300 hover:text-stone-700 dark:border-stone-800 dark:text-stone-400 dark:hover:border-stone-600 dark:hover:text-stone-200"
              }`}
            >
              <button onClick={() => applySpace(s)}>✦ {s.name}</button>
              {activeSpaceId === s.id && (
                <button
                  aria-label={`Delete space ${s.name}`}
                  className="text-stone-400 transition hover:text-red-500"
                  onClick={() => {
                    void removeSpace({ id: s.id });
                    setActiveSpaceId(null);
                  }}
                >
                  ✕
                </button>
              )}
            </span>
          ))}
          {filterActive && !naming && (
            <button
              onClick={() => setNaming(true)}
              className="rounded-full border border-dashed border-stone-300 px-3 py-1 text-[12px] text-stone-400 transition hover:border-stone-500 hover:text-stone-600 dark:border-stone-700 dark:hover:border-stone-500 dark:hover:text-stone-300"
            >
              ＋ Save view as Space
            </button>
          )}
          {naming && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveSpace();
              }}
              className="inline-flex items-center gap-1"
            >
              <input
                autoFocus
                value={spaceName}
                onChange={(e) => setSpaceName(e.target.value)}
                onBlur={() => {
                  if (!spaceName.trim()) setNaming(false);
                }}
                placeholder="Space name…"
                className="w-36 rounded-full border border-stone-300 bg-transparent px-3 py-1 text-[12px] outline-none focus:border-stone-500 dark:border-stone-600 dark:focus:border-stone-400"
              />
              <button
                type="submit"
                className="rounded-full bg-stone-900 px-3 py-1 text-[12px] text-white dark:bg-stone-100 dark:text-stone-900"
              >
                Save
              </button>
            </form>
          )}
        </div>
      )}

      {activeSpace && (
        <p className="mb-6 text-center font-serif text-lg italic text-stone-500 dark:text-stone-400">
          ✦ {activeSpace.name}
        </p>
      )}

      {results.length === 0 && !isLoading ? (
        <div className="py-24 text-center">
          <p className="font-serif text-2xl italic text-stone-400 dark:text-stone-500">
            {filterActive ? "Nothing here yet." : "Your mind is empty."}
          </p>
          <p className="mt-2 text-sm text-stone-400 dark:text-stone-500">
            {filterActive
              ? "Save something that matches this view."
              : "Paste a link or jot a thought above."}
          </p>
        </div>
      ) : (
        <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 2xl:columns-4">
          {results.map((item) => (
            <ItemCard key={item.id} item={item} onTagClick={applyTag} />
          ))}
        </div>
      )}

      {status === "CanLoadMore" && (
        <div className="mt-4 pb-16 text-center">
          <button
            onClick={() => loadMore(24)}
            className="rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-600 transition hover:bg-stone-100 dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}
