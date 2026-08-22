"use client";

import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Card } from "./types";

export function ItemCard({
  item,
  onOpen,
}: {
  item: Card;
  onOpen?: (id: string) => void;
}) {
  const removeItem = useMutation(api.items.removeItem);

  if (item.status === "pending") {
    return (
      <div className="surface mb-5 break-inside-avoid animate-pulse rounded-xl border p-5 opacity-70">
        <div className="h-3 w-1/3 rounded bg-stone-200 dark:bg-[#2a2a31]" />
        <div className="mt-3 h-3 w-full rounded bg-stone-200 dark:bg-[#26262c]" />
        <div className="mt-2 h-3 w-2/3 rounded bg-stone-200 dark:bg-[#232329]" />
      </div>
    );
  }

  if (item.status === "failed") {
    return (
      <div className="surface mb-5 break-inside-avoid rounded-xl border p-5">
        <p className="text-sm text-stone-500 dark:text-[#8b8b94]">
          Couldn&apos;t save this one.
        </p>
        {item.url && (
          <p className="mt-1 truncate text-xs text-stone-400 dark:text-[#5b5b64]">
            {item.url}
          </p>
        )}
      </div>
    );
  }

  const isSocial = item.type === "tweet" || item.type === "instagram";
  const quote =
    isTweetCard(item) ? item.embedJson?.quote : undefined;

  return (
    <div
      onClick={() => onOpen?.(item.id)}
      className={`surface group mb-5 break-inside-avoid overflow-hidden rounded-xl border shadow-sm transition-all duration-200 hover:shadow-lg hover:brightness-[1.02] dark:shadow-none ${
        item.type === "note"
          ? "border-amber-200/70 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-950/20"
          : ""
      } ${onOpen ? "cursor-pointer" : ""}`}
    >
      {isSocial && item.author ? (
        <p className="px-4 pt-3.5 text-xs font-medium text-stone-500 dark:text-[#9b9ba4]">
          {item.author}
        </p>
      ) : null}
      {item.thumbnailUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.thumbnailUrl}
          alt={item.title ?? ""}
          className="mt-3 max-h-[420px] w-full object-cover brightness-[0.98] first:mt-0 dark:brightness-[0.85]"
        />
      ) : null}
      <div className={item.thumbnailUrl ? "p-4 pt-3" : "p-4"}>
        {item.title && !isTweetCard(item) ? (
          <h2 className="font-serif text-lg leading-snug text-stone-900 dark:text-[#e4e4e7]">
            {item.title}
          </h2>
        ) : null}
        {isTweetCard(item) && item.preview ? (
          <p className="text-sm leading-relaxed text-stone-700 dark:text-[#d4d4d8]">
            {item.preview}
          </p>
        ) : null}
        {!item.thumbnailUrl && !isTweetCard(item) && item.preview ? (
          <p className="mt-1.5 line-clamp-3 text-sm text-stone-500 dark:text-[#9b9ba4]">
            {item.preview}
          </p>
        ) : null}
        {quote ? (
          <div className="mt-3 rounded-lg border border-stone-200 p-3 dark:border-[#2a2a31] dark:bg-[#202027]">
            <p className="text-xs font-medium text-stone-600 dark:text-[#b6b6bf]">
              {quote.name ?? quote.handle}
              {quote.handle ? ` @${quote.handle}` : ""}
            </p>
            {quote.text ? (
              <p className="mt-1 line-clamp-4 text-[13px] text-stone-500 dark:text-[#9b9ba4]">
                {quote.text}
              </p>
            ) : null}
          </div>
        ) : null}
        {item.summary ? (
          <p className="mt-2 line-clamp-2 text-[13px] italic text-stone-400 dark:text-[#77777f]">
            {item.summary}
          </p>
        ) : null}
        {item.tags.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {item.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-stone-200 px-2 py-0.5 text-[11px] text-stone-500 dark:border-[#2a2a31] dark:text-[#8b8b94]"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-[11px] text-stone-400 dark:text-[#6b6b75]">
          {[item.sourceDomain, timeAgo(item.savedAt)].filter(Boolean).join(" · ")}
        </p>
      </div>
      <button
        aria-label="Delete"
        onClick={(e) => {
          e.stopPropagation();
          void removeItem({ id: item.id as Id<"items"> });
        }}
        className="absolute right-2 top-2 rounded-full opacity-0 transition hover:text-red-400 [div.group:hover>&]:opacity-100"
      >
        ✕
      </button>
    </div>
  );
}

function isTweetCard(
  item: Card,
): item is Card & {
  embedJson: { quote?: { name?: string; handle?: string; text?: string } };
} {
  return item.type === "tweet" && typeof item.embedJson === "object";
}

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
