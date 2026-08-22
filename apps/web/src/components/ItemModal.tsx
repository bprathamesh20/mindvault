"use client";

import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

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
  thumbnailUrl?: string;
  embedJson?: unknown;
  userNote?: string;
  isDone?: boolean;
  savedAt: number;
};

export function ItemModal({
  itemId,
  onClose,
}: {
  itemId: string;
  onClose: () => void;
}) {
  const item = useQuery(api.items.get, { id: itemId as Id<"items"> });
  const update = useMutation(api.items.update);
  const addTag = useMutation(api.items.addTag);
  const removeItem = useMutation(api.items.removeItem);

  const [loaded, setLoaded] = useState<{ url: string; text: string } | null>(
    null,
  );
  const [titleDraft, setTitleDraft] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<string | null>(null);
  const [tagging, setTagging] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

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

  const saveField = useCallback(
    (patch: { title?: string; userNote?: string; isDone?: boolean }) => {
      void update({ id: itemId as Id<"items">, ...patch });
    },
    [update, itemId],
  );

  if (item === undefined) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <p className="font-serif italic text-stone-400">Loading…</p>
      </div>
    );
  }
  if (item === null) return null;

  const it = item as Detail;
  const embed =
    typeof it.embedJson === "object" && it.embedJson !== null
      ? (it.embedJson as Record<string, unknown>)
      : {};
  const isYouTube = it.type === "youtube";
  const isInstagram = it.type === "instagram";
  const doneLabel =
    it.type === "instagram"
      ? "I've watched this reel"
      : isYouTube
        ? "I've watched this video"
        : it.type === "article"
          ? "Mark as read"
          : "Mark as done";

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="mx-auto my-6 flex w-[min(1400px,94vw)] flex-col gap-0 overflow-hidden rounded-2xl border border-stone-200 bg-stone-50 shadow-2xl md:flex-row dark:border-[#2a2a31] dark:bg-[#17171b]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content pane */}
        <div className="flex min-h-[50vh] flex-1 items-center justify-center p-6 md:p-10">
          {isYouTube && typeof embed.videoId === "string" ? (
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                src={`https://www.youtube.com/embed/${embed.videoId}`}
                title={it.title ?? "YouTube video"}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="h-full w-full"
              />
            </div>
          ) : isInstagram && typeof embed.shortcode === "string" ? (
            <div className="flex w-full max-w-[420px] justify-center">
              <iframe
                src={`https://www.instagram.com/${embed.kind === "reel" ? "reel" : "p"}/${embed.shortcode}/embed`}
                title={it.title ?? "Instagram post"}
                className="max-h-[70vh] min-h-[420px] w-full rounded-xl bg-white"
                frameBorder={0}
                scrolling="no"
              />
            </div>
          ) : it.thumbnailUrl && it.type !== "note" ? (
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
        <div className="flex w-full flex-col gap-5 border-t border-stone-200 p-6 md:w-[380px] md:border-l md:border-t-0 dark:border-[#2a2a31]">
          <div>
            <input
              value={titleDraft ?? it.title ?? ""}
              onChange={(e) => setTitleDraft(e.target.value)}
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

          <button
            onClick={() => saveField({ isDone: !it.isDone })}
            className={`w-full rounded-full py-3 text-sm transition ${
              it.isDone
                ? "bg-emerald-700/20 text-emerald-500 dark:text-emerald-400"
                : "bg-stone-200/70 text-stone-700 hover:bg-stone-300/70 dark:bg-[#232329] dark:text-[#c9c9d1] dark:hover:bg-[#2a2a31]"
            }`}
          >
            {it.isDone ? "✓ Done" : doneLabel}
          </button>

          <div>
            <p className="mb-2 text-xs font-medium tracking-widest text-stone-400 dark:text-[#6b6b75]">
              MIND TAGS
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {(item as Detail & { tags?: string[] }).tags?.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-stone-200 px-3 py-1 text-xs text-stone-500 dark:border-[#2a2a31] dark:text-[#9b9ba4]"
                >
                  {t}
                </span>
              ))}
              {tagging ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (tagDraft.trim()) {
                      void addTag({ id: itemId as Id<"items">, name: tagDraft });
                    }
                    setTagDraft("");
                    setTagging(false);
                  }}
                >
                  <input
                    autoFocus
                    value={tagDraft}
                    onChange={(e) => setTagDraft(e.target.value)}
                    onBlur={() => setTagging(false)}
                    placeholder="tag name…"
                    className="w-28 rounded-full border border-stone-300 bg-transparent px-3 py-1 text-xs outline-none dark:border-[#3a3a42]"
                  />
                </form>
              ) : (
                <button
                  onClick={() => setTagging(true)}
                  className="rounded-full bg-orange-600 px-3 py-1 text-xs font-medium text-white transition hover:bg-orange-500"
                >
                  + Add tag
                </button>
              )}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium tracking-widest text-stone-400 dark:text-[#6b6b75]">
              MIND NOTES
            </p>
            <textarea
              value={noteDraft ?? it.userNote ?? ""}
              onChange={(e) => setNoteDraft(e.target.value)}
              onBlur={() => {
                if (noteDraft !== null && noteDraft !== it.userNote)
                  saveField({ userNote: noteDraft });
              }}
              placeholder="Type here to add a note…"
              rows={3}
              className="w-full resize-none rounded-xl border border-stone-200 bg-transparent p-3 text-sm outline-none placeholder:text-stone-400 focus:border-stone-400 dark:border-[#2a2a31] dark:placeholder:text-[#5b5b64] dark:focus:border-[#4a4a55]"
            />
          </div>

          <div className="mt-auto flex items-center justify-end gap-3 pt-2">
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
