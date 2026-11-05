"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { optimisticPatchItem, optimisticRemoveItem } from "../lib/optimistic";
import { DocumentPreview } from "./DocumentPreview";
import { formatPrice, priceLabel, productInfo } from "../lib/product";
import type { Card } from "./types";

function timeAgo(savedAt: number): string {
  const s = Math.floor((Date.now() - savedAt) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d} day${d === 1 ? "" : "s"} ago`;
  if (d < 365) return `${Math.floor(d / 30)} months ago`;
  return `about 1 year ago`;
}

type Detail = {
  id: string;
  type: string;
  url?: string;
  title?: string;
  author?: string;
  sourceDomain?: string;
  contentText?: string;
  summary?: string;
  htmlUrl?: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  embedJson?: unknown;
  userNote?: string;
  tags?: string[];
  savedAt: number;
};

function previewAsDetail(card: Card): Detail {
  return {
    id: card.id,
    type: card.type,
    url: card.url,
    title: card.title,
    author: card.author,
    sourceDomain: card.sourceDomain,
    contentText: card.preview,
    summary: card.summary,
    thumbnailUrl: card.thumbnailUrl,
    embedJson: card.embedJson,
    tags: card.tags,
    savedAt: card.savedAt,
  };
}

export function ItemModal({
  itemId,
  preview,
  onClose,
}: {
  itemId: string;
  preview?: Card;
  onClose: () => void;
}) {
  const item = useQuery(api.items.get, { id: itemId as Id<"items"> });
  const update = useMutation(api.items.update).withOptimisticUpdate(
    (localStore, args) =>
      optimisticPatchItem(localStore, args.id, {
        title: args.title,
        userNote: args.userNote,
        isDone: args.isDone,
      }),
  );
  const addTag = useMutation(api.items.addTag).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.items.get, { id: args.id });
      const name = args.name.trim().toLowerCase().slice(0, 30);
      if (current && name.length > 0 && !current.tags.includes(name)) {
        optimisticPatchItem(localStore, args.id, {
          tags: [...current.tags, name],
        });
      }
    },
  );
  const removeTag = useMutation(api.items.removeTag).withOptimisticUpdate(
    (localStore, args) => {
      const current = localStore.getQuery(api.items.get, { id: args.id });
      if (current) {
        optimisticPatchItem(localStore, args.id, {
          tags: current.tags.filter((t) => t !== args.name.trim().toLowerCase()),
        });
      }
    },
  );
  const removeItem = useMutation(api.items.removeItem).withOptimisticUpdate(
    (localStore, args) => optimisticRemoveItem(localStore, args.id),
  );

  const [loaded, setLoaded] = useState<{ url: string; text: string } | null>(
    null,
  );
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [tagging, setTagging] = useState(false);
  const [tagDraft, setTagDraft] = useState("");
  const [playEmbed, setPlayEmbed] = useState(false);
  const titleDraftRef = useRef<string | null>(null);
  const noteDraftRef = useRef<string | null>(null);
  const tagDraftRef = useRef("");
  const taggingRef = useRef(false);
  const committingTag = useRef(false);

  const saveField = useCallback(
    (patch: { title?: string; userNote?: string }) => {
      void update({ id: itemId as Id<"items">, ...patch });
    },
    [update, itemId],
  );

  const flush = useCallback(() => {
    const title = titleDraftRef.current;
    const note = noteDraftRef.current;
    const patch: { title?: string; userNote?: string } = {};
    if (title !== null) patch.title = title;
    if (note !== null) patch.userNote = note;
    if (Object.keys(patch).length > 0) saveField(patch);
    const name = tagDraftRef.current.trim();
    if (taggingRef.current && name.length > 0 && !committingTag.current) {
      committingTag.current = true;
      void addTag({ id: itemId as Id<"items">, name });
    }
  }, [saveField, addTag, itemId]);

  const handleClose = useCallback(() => {
    flush();
    onClose();
  }, [flush, onClose]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleClose]);

  useEffect(() => {
    let cancelled = false;
    const url = item?.htmlUrl;
    if (!url) return;
    fetch(url)
      .then((r) => r.text())
      .then((text) => {
        if (!cancelled) setLoaded({ url, text });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [item?.htmlUrl]);

  const it: Detail | undefined =
    item ??
    (preview && preview.id === itemId ? previewAsDetail(preview) : undefined);

  if (it === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
        <p className="font-serif italic text-stone-400">Loading…</p>
      </div>
    );
  }
  if (item === null) return null;
  const embed =
    typeof it.embedJson === "object" && it.embedJson !== null
      ? (it.embedJson as Record<string, unknown>)
      : {};
  const isYouTube = it.type === "youtube";
  const isInstagram = it.type === "instagram";
  const isDocument = it.type === "document";
  const product = it.type === "product" ? productInfo(it.embedJson) : undefined;
  const openUrl = it.url ?? it.fileUrl;

  async function commitTag() {
    if (committingTag.current) return;
    const name = tagDraft.trim();
    if (!name) {
      setTagging(false);
      taggingRef.current = false;
      return;
    }
    committingTag.current = true;
    try {
      await addTag({ id: itemId as Id<"items">, name });
      setTagDraft("");
      tagDraftRef.current = "";
      setTagging(false);
      taggingRef.current = false;
    } catch {
      /* keep the input so a failed tag isn't lost */
    } finally {
      committingTag.current = false;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-black/70 backdrop-blur-sm md:p-8"
      onClick={handleClose}
    >
      <div
        className="relative flex h-dvh w-full flex-col overflow-y-auto overscroll-contain bg-stone-50 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)] md:my-auto md:h-auto md:max-h-[85dvh] md:w-[min(1400px,94vw)] md:flex-row md:overflow-hidden md:rounded-2xl md:border md:border-stone-200 md:p-0 md:shadow-2xl dark:bg-[#17171b] md:dark:border-[#2a2a31]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={handleClose}
          className="fixed right-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-10 flex h-10 w-10 md:absolute md:right-3 md:top-3 items-center justify-center rounded-full border border-stone-300 bg-white text-xl leading-none text-stone-700 shadow-md transition hover:bg-stone-100 hover:text-stone-900 dark:border-[#3a3a42] dark:bg-[#2a2a31] dark:text-stone-200 dark:hover:bg-[#33333b]"
        >
          ×
        </button>
        {/* Content pane */}
        <div
          className={`min-w-0 flex-none p-6 pt-16 md:min-h-0 md:flex-1 md:overflow-y-auto md:p-10 ${
            isDocument ? "items-start" : "flex items-center justify-center"
          }`}
        >
          {isYouTube && typeof embed.videoId === "string" ? (
            playEmbed ? (
              <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${embed.videoId}?autoplay=1`}
                  title={it.title ?? "YouTube video"}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="h-full w-full"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPlayEmbed(true)}
                className="relative aspect-video w-full overflow-hidden rounded-xl bg-black"
              >
                {typeof embed.videoId === "string" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`https://i.ytimg.com/vi/${embed.videoId}/maxresdefault.jpg`}
                    alt={it.title ?? ""}
                    className="h-full w-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = `https://i.ytimg.com/vi/${embed.videoId}/mqdefault.jpg`;
                    }}
                  />
                ) : it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.thumbnailUrl}
                    alt={it.title ?? ""}
                    className="h-full w-full object-cover"
                  />
                ) : null}
                <span className="absolute inset-0 grid place-items-center bg-black/30 text-5xl text-white">
                  ▶
                </span>
              </button>
            )
          ) : isInstagram && typeof embed.shortcode === "string" ? (
            playEmbed ? (
              <div className="flex w-full max-w-[420px] justify-center">
                <iframe
                  src={`https://www.instagram.com/${embed.kind === "reel" ? "reel" : "p"}/${embed.shortcode}/embed`}
                  title={it.title ?? "Instagram post"}
                  className="max-h-[70vh] min-h-[420px] w-full rounded-xl bg-white"
                  frameBorder={0}
                  scrolling="no"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setPlayEmbed(true)}
                className="relative w-full max-w-[420px] overflow-hidden rounded-xl bg-black"
              >
                {it.thumbnailUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={it.thumbnailUrl}
                    alt={it.title ?? ""}
                    className="w-full object-cover"
                  />
                ) : (
                  <span className="block py-24 text-white">Open Instagram</span>
                )}
              </button>
            )
          ) : it.thumbnailUrl && it.type !== "note" && it.type !== "github" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={it.thumbnailUrl}
              alt={it.title ?? ""}
              className="max-h-[75vh] w-auto max-w-full rounded-xl object-contain"
            />
          ) : it.type === "note" ? (
            <p className="whitespace-pre-wrap font-serif text-2xl leading-relaxed text-stone-700 dark:text-stone-200">
              {it.contentText}
            </p>
          ) : isDocument ? (
            <DocumentPreview
              markdown={it.contentText}
              embedJson={it.embedJson}
            />
          ) : (
            <div className="prose prose-stone max-w-none dark:prose-invert">
              {loaded && loaded.url === it.htmlUrl ? (
                <div dangerouslySetInnerHTML={{ __html: loaded.text }} />
              ) : (
                <p className="whitespace-pre-wrap leading-relaxed">
                  {it.contentText?.slice(0, 20000)}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Side panel */}
        <div className="flex w-full shrink-0 flex-col gap-5 border-t border-stone-200 p-6 md:min-h-0 md:w-[380px] md:overflow-y-auto md:border-l md:border-t-0 dark:border-[#2a2a31]">
          <div>
            <input
              value={titleDraft ?? it.title ?? ""}
              onChange={(e) => {
                titleDraftRef.current = e.target.value;
                setTitleDraft(e.target.value);
              }}
              onBlur={() => {
                if (titleDraft !== null && titleDraft !== it.title)
                  saveField({ title: titleDraft });
              }}
              placeholder="Title goes here"
              className="w-full bg-transparent font-serif text-2xl outline-none placeholder:text-stone-400 dark:placeholder:text-[#5b5b64]"
            />
            <p className="mt-1 text-sm text-stone-500 dark:text-[#8b8b94]">
              {timeAgo(it.savedAt)}
              {it.url && (
                <>
                  {" · "}
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:underline"
                  >
                    ↗ {it.sourceDomain ?? it.type}
                  </a>
                </>
              )}
            </p>
          </div>

          {product ? (
            <div className="flex items-baseline gap-2.5">
              <span className="text-xl font-semibold tracking-tight text-stone-900 dark:text-[#f1f1f4]">
                {priceLabel(product)}
              </span>
              {product.compareAtPrice !== undefined &&
              product.price !== undefined &&
              product.compareAtPrice > product.price ? (
                <span className="text-sm text-stone-400 line-through dark:text-[#6e6e7a]">
                  {formatPrice(product.compareAtPrice, product.currency)}
                </span>
              ) : null}
              {product.availability ? (
                <span className="text-xs text-stone-500 dark:text-[#9b9ba4]">
                  {product.availability}
                </span>
              ) : null}
            </div>
          ) : null}

          {it.summary && (
            <div>
              <p className="mb-1.5 font-serif text-sm italic tracking-wide text-stone-500 dark:text-[#8b8b94]">
                {isYouTube ? "TLDW" : "TLDR"}
              </p>
              <div className="rounded-xl border border-stone-200 p-3.5 text-sm leading-relaxed text-stone-600 dark:border-[#2a2a31] dark:text-[#b6b6bf]">
                {it.summary}
              </div>
            </div>
          )}

          {openUrl ? (
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="block w-full rounded-full bg-stone-200/70 py-3 text-center text-sm text-stone-700 transition hover:bg-stone-300/70 dark:bg-[#232329] dark:text-[#c9c9d1] dark:hover:bg-[#2a2a31]"
            >
              Open original ↗
            </a>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-medium tracking-widest text-stone-400 dark:text-[#6b6b75]">
              VAULT TAGS
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(it.tags ?? []).map((t) => (
                <span
                  key={t}
                  className="group/tag inline-flex items-center gap-1.5 rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500 dark:border-[#2a2a31] dark:text-[#9b9ba4]"
                >
                  {t}
                  <button
                    type="button"
                    aria-label={`Remove tag ${t}`}
                    onClick={() =>
                      void removeTag({ id: itemId as Id<"items">, name: t })
                    }
                    className="text-stone-300 transition hover:text-red-400 dark:text-[#55555e] dark:hover:text-red-400"
                  >
                    ✕
                  </button>
                </span>
              ))}
              {tagging ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    void commitTag();
                  }}
                >
                  <input
                    autoFocus
                    value={tagDraft}
                    onChange={(e) => {
                      tagDraftRef.current = e.target.value;
                      setTagDraft(e.target.value);
                    }}
                    onBlur={() => void commitTag()}
                    placeholder="tag name…"
                    className="w-28 rounded-full border border-stone-300 bg-transparent px-3 py-1 text-base outline-none md:text-xs dark:border-[#3a3a42]"
                  />
                </form>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    taggingRef.current = true;
                    setTagging(true);
                  }}
                  className="rounded-full bg-orange-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-orange-500"
                >
                  + Add tag
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium tracking-widest text-stone-400 dark:text-[#6b6b75]">
              VAULT NOTES
            </p>
            <textarea
              value={noteDraft ?? it.userNote ?? ""}
              onChange={(e) => {
                noteDraftRef.current = e.target.value;
                setNoteDraft(e.target.value);
              }}
              onBlur={() => {
                if (noteDraft !== null && noteDraft !== (it.userNote ?? ""))
                  saveField({ userNote: noteDraft });
              }}
              placeholder="Type here to add a note…"
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 bg-transparent p-3 text-base outline-none md:text-sm placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2a2a31] dark:placeholder:text-[#5b5b64] dark:focus:border-[#4a4a55]"
            />
          </div>

          <div className="mt-auto flex items-center justify-end gap-3 pt-2">
            {it.fileUrl && (
              <a
                href={it.fileUrl}
                target="_blank"
                rel="noreferrer"
                title="Download original"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-sm text-stone-500 transition hover:text-stone-800 dark:border-[#2a2a31] dark:text-[#9b9ba4] dark:hover:text-stone-100"
              >
                ↓
              </a>
            )}
            {it.url && (
              <a
                href={it.url}
                target="_blank"
                rel="noreferrer"
                title="Open original"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-sm text-stone-500 transition hover:text-stone-800 dark:border-[#2a2a31] dark:text-[#9b9ba4] dark:hover:text-stone-100"
              >
                ↗
              </a>
            )}
            <button
              title="Delete"
              onClick={() => {
                void removeItem({ id: itemId as Id<"items"> });
                onClose();
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-stone-200 text-sm text-stone-500 transition hover:border-red-300 hover:text-red-500 dark:border-[#2a2a31] dark:text-[#9b9ba4]"
            >
              🗑
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
