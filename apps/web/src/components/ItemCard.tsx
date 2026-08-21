"use client";

import Link from "next/link";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Card } from "./types";

function timeAgo(savedAt: number): string {
  const seconds = Math.floor((Date.now() - savedAt) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(savedAt).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

const cardBase =
  "mb-5 break-inside-avoid overflow-hidden rounded-xl border border-stone-200/90 bg-white shadow-sm transition-all duration-200 hover:shadow-md hover:border-stone-300 dark:border-stone-800/80 dark:bg-stone-900/60 dark:shadow-none dark:hover:border-stone-700";

function Thumb({ src, alt }: { src: string; alt: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="max-h-96 w-full object-cover brightness-[0.98] dark:brightness-[0.82] dark:contrast-[1.02]"
    />
  );
}

function Meta({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-4 pb-3.5 text-xs text-stone-500 dark:text-stone-400">
      {children}
    </div>
  );
}

type QuoteInfo = {
  handle?: string;
  name?: string;
  text?: string;
  thumbnailUrl?: string;
};

export default function ItemCard({
  item,
  onTagClick,
}: {
  item: Card;
  onTagClick?: (tag: string) => void;
}) {
  const removeItem = useMutation(api.items.removeItem);
  const isTweet = item.type === "tweet";
  const quote = isTweet
    ? (item.embedJson as { quote?: QuoteInfo } | null)?.quote
    : undefined;

  if (item.status === "pending") {
    return (
      <div className={`${cardBase} animate-pulse p-5`}>
        <div className="h-3 w-1/3 rounded bg-stone-200 dark:bg-stone-800" />
        <div className="mt-3 h-3 w-full rounded bg-stone-200 dark:bg-stone-800/70" />
        <div className="mt-2 h-3 w-2/3 rounded bg-stone-200 dark:bg-stone-800/50" />
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div className={cardBase}>
        <div className="p-5">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Couldn&apos;t save this one.
          </p>
          {item.url && (
            <p className="mt-1 truncate text-xs text-stone-400 dark:text-stone-600">
              {item.url}
            </p>
          )}
        </div>
        <Meta>
          <span>{item.sourceDomain}</span>
          <span>·</span>
          <span>{timeAgo(item.savedAt)}</span>
        </Meta>
      </div>
    );
  }

  if (item.type === "note") {
    return (
      <div className="mb-5 break-inside-avoid rounded-xl border border-amber-200/70 bg-amber-50 p-5 shadow-sm transition hover:shadow-md dark:border-amber-900/50 dark:bg-amber-950/30">
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed">
          {item.preview}
        </p>
        {item.summary && (
          <p className="mt-2 line-clamp-2 text-xs italic text-stone-500 dark:text-stone-400">
            {item.summary}
          </p>
        )}
        <CardTags tags={item.tags} onTagClick={onTagClick} />
        <Meta>
          <span className="text-amber-700/70 dark:text-amber-500/70">
            {timeAgo(item.savedAt)}
          </span>
        </Meta>
      </div>
    );
  }

  const body = (
    <>
      {(isTweet || item.type === "instagram") && (
        <div className="flex items-center gap-2 px-4 pt-3.5 text-sm">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 font-serif text-xs italic dark:bg-stone-800">
            {(item.author ?? "?").replace(/^@/, "").charAt(0).toUpperCase()}
          </span>
          <span className="font-medium">{item.author}</span>
        </div>
      )}
      {item.thumbnailUrl && (
        <div className={isTweet || item.type === "instagram" ? "mt-3" : ""}>
          <Thumb src={item.thumbnailUrl} alt={item.title ?? "saved item"} />
        </div>
      )}
      <div className="px-4 pt-3.5">
        {item.title && !isTweet && (
          <h2 className="font-serif text-[17px] leading-snug">{item.title}</h2>
        )}
        {isTweet && item.preview && (
          <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-stone-700 dark:text-stone-200">
            {item.preview}
          </p>
        )}
        {quote && (
          <div className="mt-3 rounded-lg border border-stone-200 bg-stone-50/60 p-3 dark:border-stone-700/70 dark:bg-stone-800/40">
            <p className="text-xs">
              <span className="font-medium">
                {quote.name ?? quote.handle}
              </span>
              {quote.handle && (
                <span className="text-stone-400 dark:text-stone-500">
                  {" "}
                  @{quote.handle}
                </span>
              )}
            </p>
            {quote.text && (
              <p className="mt-1 line-clamp-4 text-[13px] leading-relaxed text-stone-600 dark:text-stone-300">
                {quote.text}
              </p>
            )}
            {quote.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={quote.thumbnailUrl}
                alt="quoted post"
                className="mt-2 max-h-48 w-full rounded-md object-cover"
              />
            )}
          </div>
        )}
        {item.summary && !isTweet && item.type !== "instagram" && (
          <p className="mt-2 line-clamp-2 text-[13px] italic leading-relaxed text-stone-500 dark:text-stone-400">
            {item.summary}
          </p>
        )}
        <CardTags tags={item.tags} onTagClick={onTagClick} />
      </div>
      <Meta>
        {item.sourceDomain && <span>{item.sourceDomain}</span>}
        {item.sourceDomain && <span>·</span>}
        <span>{timeAgo(item.savedAt)}</span>
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void removeItem({ id: item.id as Id<"items"> });
          }}
          className="ml-auto opacity-0 transition hover:text-red-500 [div:hover>&]:opacity-100"
          aria-label="Remove"
        >
          ✕
        </button>
      </Meta>
    </>
  );

  if (item.type === "article" && item.status === "ready") {
    return (
      <Link href={`/item/${item.id}`} className={`${cardBase} block`}>
        {body}
      </Link>
    );
  }

  return <div className={cardBase}>{body}</div>;
}

function CardTags({
  tags,
  onTagClick,
}: {
  tags: string[];
  onTagClick?: (tag: string) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-2.5 flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onTagClick?.(tag);
          }}
          className="rounded-full bg-stone-100 px-2 py-0.5 text-[11px] text-stone-500 transition hover:bg-stone-200 hover:text-stone-700 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700 dark:hover:text-stone-200"
        >
          #{tag}
        </button>
      ))}
    </div>
  );
}
