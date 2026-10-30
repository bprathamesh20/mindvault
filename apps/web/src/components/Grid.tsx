"use client";

import { Component, useEffect, useRef, useState, type ReactNode } from "react";
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

const PAGE_SIZE = 24;
// Start the next page while the sentinel is still below the fold, so the
// floating search dock never covers a dead end. One viewport is enough.
const SENTINEL_ROOT_MARGIN = "0px 0px 640px 0px";

const SKELETON_CLASS =
  "mb-5 h-48 break-inside-avoid animate-pulse rounded-xl bg-stone-200 dark:bg-[#232329]";

function uniqueById<T extends { id: string }>(items: readonly T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    unique.push(item);
  }
  return unique;
}

function MasonrySkeletons({ count }: { count: number }) {
  return Array.from({ length: count }, (_, i) => (
    <div key={i} className={SKELETON_CLASS} />
  ));
}

export function GridSkeleton() {
  return (
    <div className={MASONRY} aria-busy="true" aria-label="Loading memories">
      <MasonrySkeletons count={8} />
    </div>
  );
}

function CardMasonry({
  cards,
  onOpen,
  append,
}: {
  cards: readonly Card[];
  onOpen?: (item: Card) => void;
  append?: ReactNode;
}) {
  return (
    <div className={MASONRY}>
      {cards.map((item) => (
        <ItemCard key={item.id} item={item} onOpen={onOpen} />
      ))}
      {append}
    </div>
  );
}

type BoundaryState = { hasError: boolean; resetKey: string; nonce: number };
type RememberedCards = { key: string; cards: Card[] };

class FeedErrorBoundary extends Component<
  {
    resetKey: string;
    fallback: (retry: () => void, cards: readonly Card[]) => ReactNode;
    children: (remember: (key: string, cards: Card[]) => void) => ReactNode;
  },
  BoundaryState
> {
  state: BoundaryState = {
    hasError: false,
    resetKey: this.props.resetKey,
    nonce: 0,
  };

  last: RememberedCards = { key: "", cards: [] };

  static getDerivedStateFromError(): Partial<BoundaryState> {
    return { hasError: true };
  }

  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: BoundaryState,
  ): Partial<BoundaryState> | null {
    if (props.resetKey === state.resetKey) return null;
    return { hasError: false, resetKey: props.resetKey, nonce: state.nonce + 1 };
  }

  retry = () => {
    this.setState((state) => ({ hasError: false, nonce: state.nonce + 1 }));
  };

  remember = (key: string, cards: Card[]) => {
    this.last = { key, cards };
  };

  render() {
    if (this.state.hasError) {
      const cards = this.last.key === this.props.resetKey ? this.last.cards : [];
      return this.props.fallback(this.retry, cards);
    }
    return <div key={this.state.nonce}>{this.props.children(this.remember)}</div>;
  }
}

function FeedRecovery({
  cards,
  onOpen,
  onRetry,
}: {
  cards: readonly Card[];
  onOpen?: (item: Card) => void;
  onRetry: () => void;
}) {
  return (
    <>
      {cards.length > 0 ? <CardMasonry cards={cards} onOpen={onOpen} /> : null}
      <div className="mt-4 pb-16 text-center">
        <p className="font-serif text-lg italic text-stone-400 dark:text-[#6b6b75]">
          {cards.length > 0 ? "Couldn't load more." : "Couldn't load your vault."}
        </p>
        <button
          type="button"
          onClick={onRetry}
          data-testid="feed-retry"
          className="mt-4 min-h-11 rounded-full border border-stone-300 px-5 py-2 text-sm text-stone-600 transition hover:bg-stone-100 dark:border-[#2a2a31] dark:text-[#9b9ba4] dark:hover:bg-[#1f1f25]"
        >
          Try again
        </button>
      </div>
    </>
  );
}

function VaultFeed({
  type,
  tag,
  suspended,
  feedKey,
  onOpen,
  onRecovered,
}: {
  type: ItemType | undefined;
  tag: string | null;
  suspended: boolean;
  feedKey: string;
  onOpen?: (item: Card) => void;
  onRecovered: (key: string, cards: Card[]) => void;
}) {
  const [cached] = useState(peekCardCache);
  const { results, status, loadMore, isLoading } = usePaginatedQuery(
    api.items.list,
    { type, tag: tag ?? undefined },
    { initialNumItems: PAGE_SIZE },
  );
  const live = uniqueById(results);
  const cards: Card[] =
    live.length > 0
      ? live
      : isLoading && !type && !tag
        ? uniqueById(cached)
        : [];

  const sentinelRef = useRef<HTMLDivElement>(null);
  const pendingRef = useRef(false);
  const autoLoad = status === "CanLoadMore" && !suspended;

  useEffect(() => {
    if (type || tag || isLoading) return;
    writeCardCache(results);
  }, [results, type, tag, isLoading]);

  useEffect(() => {
    if (results.length === 0) return;
    onRecovered(feedKey, uniqueById(results));
  }, [results, feedKey, onRecovered]);

  useEffect(() => {
    if (!autoLoad) {
      pendingRef.current = false;
      return;
    }
    const node = sentinelRef.current;
    if (!node) return;

    let cancelled = false;
    const observer = new IntersectionObserver(
      (entries) => {
        if (cancelled || pendingRef.current) return;
        if (!entries.some((entry) => entry.isIntersecting)) return;
        // Drop the observer before requesting so a sentinel that stays inside
        // the root margin cannot schedule a second page for this cursor.
        pendingRef.current = true;
        cancelled = true;
        observer.disconnect();
        loadMore(PAGE_SIZE);
      },
      { root: null, rootMargin: SENTINEL_ROOT_MARGIN, threshold: 0 },
    );
    observer.observe(node);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [autoLoad, loadMore]);

  return (
    <div data-testid="vault-feed" data-feed-status={status}>
      {cards.length === 0 && isLoading ? (
        <GridSkeleton />
      ) : cards.length === 0 ? (
        <div className="py-24 text-center">
          <p className="font-serif text-2xl italic text-stone-400 dark:text-[#6b6b75]">
            {type || tag ? "Nothing here yet." : "Your vault is empty."}
          </p>
        </div>
      ) : (
        <CardMasonry
          cards={cards}
          onOpen={onOpen}
          append={
            status === "LoadingMore" ? <MasonrySkeletons count={4} /> : null
          }
        />
      )}
      {status === "LoadingMore" && cards.length > 0 ? (
        <p role="status" className="sr-only">
          Loading more memories
        </p>
      ) : null}
      {autoLoad ? (
        <div
          ref={sentinelRef}
          className="h-px w-full overflow-anchor-none"
          aria-hidden
          data-testid="feed-sentinel"
        />
      ) : null}
      {status === "Exhausted" && cards.length > 0 ? (
        <p
          data-testid="feed-end"
          className="mt-6 pb-8 text-center font-serif text-lg italic text-stone-400 dark:text-[#6b6b75]"
        >
          End of your vault.
        </p>
      ) : null}
    </div>
  );
}

export default function Grid({
  onOpen,
  type,
  onTypeChange,
  suspended = false,
  searchQuery = "",
}: {
  onOpen?: (item: Card) => void;
  // Owned by the page so the command menu can drive it too.
  type: ItemType | undefined;
  onTypeChange: (type: ItemType | undefined) => void;
  // Search and Ask replace the feed. Don't keep paging it in the background.
  suspended?: boolean;
  // Debounced search text. Included in the feed key so a new query starts
  // again at the first page instead of appending to the previous one.
  searchQuery?: string;
}) {
  const spaces = useQuery(api.spaces.list);
  const createSpace = useMutation(api.spaces.create);
  const removeSpace = useMutation(api.spaces.remove);

  const [tag, setTag] = useState<string | null>(null);
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [spaceName, setSpaceName] = useState("");
  const feedKey = `${type ?? ""}|${tag ?? ""}|${suspended ? "1" : "0"}|${searchQuery}`;
  const prevFeedKey = useRef(feedKey);
  useEffect(() => {
    if (prevFeedKey.current === feedKey) return;
    prevFeedKey.current = feedKey;
    if (!suspended) window.scrollTo(0, 0);
  }, [feedKey, suspended]);

  function applyType(value: ItemType | undefined) {
    onTypeChange(value);
    setActiveSpaceId(null);
  }
  function applyTag(next: string | null) {
    setTag(next);
    setActiveSpaceId(null);
  }

  const filterActive = type !== undefined || tag !== null;

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

      <FeedErrorBoundary
        resetKey={feedKey}
        fallback={(retry, cards) => (
          <FeedRecovery cards={cards} onOpen={onOpen} onRetry={retry} />
        )}
      >
        {(remember) => (
          <VaultFeed
            type={type}
            tag={tag}
            suspended={suspended}
            feedKey={feedKey}
            onOpen={onOpen}
            onRecovered={remember}
          />
        )}
      </FeedErrorBoundary>
    </>
  );
}
