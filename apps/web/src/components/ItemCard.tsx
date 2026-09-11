"use client";

import type { ComponentType, MouseEvent, ReactNode } from "react";
import {
  Ellipsis,
  FileSpreadsheet,
  FileText,
  Heart,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Newspaper,
  Play,
  Presentation,
  Repeat2,
  StickyNote,
  TriangleAlert,
} from "lucide-react";
import type { Card } from "./types";

/* ------------------------------------------------------------------ */
/* Shell + shared bits                                                 */
/* ------------------------------------------------------------------ */

// --card is the surface colour; media fades into it so feature images feel
// part of the card rather than pasted on top. Keep it in sync with the hover bg.
const SHELL =
  "group relative mb-5 break-inside-avoid overflow-hidden rounded-2xl border transition-all duration-200 " +
  "[--card:#ffffff] dark:[--card:#17171d] dark:hover:[--card:#1b1b22] " +
  "border-stone-200/80 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.18)] " +
  "dark:border-white/[0.06] dark:bg-[#17171d] dark:shadow-none dark:hover:border-white/[0.13] dark:hover:bg-[#1b1b22] dark:hover:shadow-[0_16px_40px_-16px_rgba(0,0,0,0.7)]";

const TITLE =
  "text-[15px] font-semibold leading-snug tracking-[-0.01em] text-stone-900 dark:text-[#f1f1f4]";
const BODY = "text-[13px] leading-relaxed text-stone-500 dark:text-[#9a9aa6]";
const META = "text-[11.5px] text-stone-400 dark:text-[#6e6e7a]";

function Shell({
  item,
  onOpen,
  className = "",
  children,
}: {
  item: Card;
  onOpen?: (item: Card) => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <article
      onClick={() => onOpen?.(item)}
      className={`${SHELL} ${onOpen ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </article>
  );
}

function Kebab({
  overlay,
  onClick,
}: {
  overlay?: boolean;
  onClick?: (e: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label="Open"
      onClick={onClick}
      className={
        overlay
          ? "grid h-7 w-7 place-items-center rounded-full bg-black/40 text-white/90 backdrop-blur-md transition hover:bg-black/60"
          : "-mr-1.5 grid h-7 w-7 place-items-center rounded-full text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 dark:text-[#6e6e7a] dark:hover:bg-white/[0.06] dark:hover:text-[#e6e6ea]"
      }
    >
      <Ellipsis size={16} strokeWidth={2.25} />
    </button>
  );
}

type BadgeSpec = {
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  chip: string;
};

function TypeBadge({ spec, overlay }: { spec: BadgeSpec; overlay?: boolean }) {
  const { label, Icon, chip } = spec;
  if (overlay) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 py-1 pl-1 pr-2.5 text-[11.5px] font-medium text-stone-800 ring-1 ring-black/[0.06] shadow-sm backdrop-blur-md dark:bg-black/45 dark:text-white dark:ring-white/10">
        <span className={`grid h-5 w-5 place-items-center rounded-md ${chip}`}>
          <Icon size={11} strokeWidth={2.5} />
        </span>
        {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 text-[12px] font-medium text-stone-500 dark:text-[#a3a3ae]">
      <span className={`grid h-7 w-7 place-items-center rounded-lg ${chip}`}>
        <Icon size={14} strokeWidth={2.25} />
      </span>
      {label}
    </span>
  );
}

function Header({ spec, onKebab }: { spec: BadgeSpec; onKebab?: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pt-3.5">
      <TypeBadge spec={spec} />
      <Kebab onClick={(e) => { e.stopPropagation(); onKebab?.(); }} />
    </div>
  );
}

function Tags({ tags, max = 3 }: { tags: string[]; max?: number }) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {tags.slice(0, max).map((tag) => (
        <span
          key={tag}
          className="rounded-full bg-stone-100 px-2.5 py-1 text-[11px] font-medium text-stone-600 dark:bg-white/[0.06] dark:text-[#b4b4bf]"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}

function Footer({ left, savedAt }: { left?: ReactNode; savedAt: number }) {
  return (
    <div className={`mt-3 flex items-center justify-between gap-3 ${META}`}>
      <span className="min-w-0 truncate">{left}</span>
      <span className="shrink-0">Saved {timeAgo(savedAt)}</span>
    </div>
  );
}

function Media({
  item,
  spec,
  play,
  cornerLabel,
  maxH = "max-h-[300px]",
  onKebab,
}: {
  item: Card;
  spec: BadgeSpec;
  play?: boolean;
  cornerLabel?: string;
  maxH?: string;
  onKebab?: () => void;
}) {
  const size = saneThumb(item.thumbWidth, item.thumbHeight);
  return (
    <div className="relative -mb-1 overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.thumbnailUrl}
        alt={item.title ?? ""}
        width={size?.w}
        height={size?.h}
        loading="lazy"
        decoding="async"
        className={`${maxH} w-full object-cover dark:brightness-[0.9] dark:saturate-[0.95]`}
        style={size ? { aspectRatio: `${size.w} / ${size.h}` } : { aspectRatio: "16 / 10" }}
      />
      {/* Bleed the bottom of the image into the card surface. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[46%] bg-gradient-to-t from-(--card) from-[4%] via-(--card)/70 via-[40%] to-transparent dark:h-[58%] dark:from-[6%] dark:via-[42%] transition-colors duration-200" />
      {/* Soft vignette at the top keeps the kebab readable on bright images. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/35 to-transparent" />
      {play ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-12 w-12 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md transition group-hover:scale-105">
            <Play size={18} className="ml-0.5 fill-current" />
          </span>
        </div>
      ) : null}
      <div className="absolute left-4 bottom-2">
        <TypeBadge spec={spec} overlay />
      </div>
      {cornerLabel ? (
        <span className="absolute right-4 bottom-2.5 text-[11.5px] font-medium text-stone-700 dark:text-white/80">
          {cornerLabel}
        </span>
      ) : null}
      <div className="absolute right-2.5 top-2.5">
        <Kebab overlay onClick={(e) => { e.stopPropagation(); onKebab?.(); }} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Brand marks (Lucide dropped brand icons)                            */
/* ------------------------------------------------------------------ */

type MarkProps = { size?: number; className?: string; strokeWidth?: number };

function XMark({ size = 14, className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramMark({ size = 14, className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.6" cy="6.4" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function YouTubeMark({ size = 14, className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden>
      <path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.6 15.6V8.4l6.2 3.6-6.2 3.6z" />
    </svg>
  );
}

/* Wrap the brand marks so they satisfy the BadgeSpec icon signature. */
const IGIcon = (p: MarkProps) => <InstagramMark {...p} />;
const YTIcon = (p: MarkProps) => <YouTubeMark {...p} />;

/* ------------------------------------------------------------------ */
/* Per-type badge specs                                                */
/* ------------------------------------------------------------------ */

const ARTICLE: BadgeSpec = { label: "Article", Icon: Newspaper, chip: "bg-indigo-500 text-white" };
const YOUTUBE: BadgeSpec = { label: "YouTube", Icon: YTIcon, chip: "bg-[#ff0033] text-white" };
const IMAGE: BadgeSpec = { label: "Image", Icon: ImageIcon, chip: "bg-emerald-500 text-white" };
const NOTE: BadgeSpec = { label: "Note", Icon: StickyNote, chip: "bg-violet-500 text-white" };
const LINK: BadgeSpec = { label: "Link", Icon: Link2, chip: "bg-sky-500 text-white" };
const PENDING: BadgeSpec = { label: "Saving…", Icon: (p) => <LoaderCircle {...p} className="animate-spin" />, chip: "bg-stone-200 text-stone-500 dark:bg-white/[0.08] dark:text-[#b4b4bf]" };
const FAILED: BadgeSpec = { label: "Couldn't save", Icon: TriangleAlert, chip: "bg-amber-500 text-white" };

function instagramSpec(item: Card): BadgeSpec {
  const kind = embedString(item.embedJson, "kind");
  return {
    label: kind === "reel" ? "Reel" : "Post",
    Icon: IGIcon,
    chip: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white",
  };
}

function documentSpec(item: Card): BadgeSpec {
  const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "file").toLowerCase();
  if (format === "pdf") return { label: "PDF", Icon: FileText, chip: "bg-red-500 text-white" };
  if (format === "xlsx" || format === "csv") return { label: format.toUpperCase(), Icon: FileSpreadsheet, chip: "bg-emerald-600 text-white" };
  if (format === "pptx") return { label: "Slides", Icon: Presentation, chip: "bg-orange-500 text-white" };
  return { label: format.toUpperCase(), Icon: FileText, chip: "bg-blue-500 text-white" };
}

/* ------------------------------------------------------------------ */
/* The card                                                            */
/* ------------------------------------------------------------------ */

export function ItemCard({
  item,
  onOpen,
}: {
  item: Card;
  onOpen?: (item: Card) => void;
}) {
  const open = onOpen ? () => onOpen(item) : undefined;

  if (item.status === "pending") {
    return (
      <Shell item={item} onOpen={onOpen}>
        <Header spec={PENDING} onKebab={open} />
        <div className="px-4 pb-4 pt-3">
          <div className="mv-shimmer h-3.5 w-3/4 rounded" />
          <div className="mv-shimmer mt-2.5 h-3 w-full rounded" />
          <div className="mv-shimmer mt-2 h-3 w-5/6 rounded" />
          <div className="mt-4 flex gap-1.5">
            <div className="mv-shimmer h-5 w-14 rounded-full" />
            <div className="mv-shimmer h-5 w-16 rounded-full" />
          </div>
          {item.url ? (
            <p className={`mt-3 truncate ${META}`}>{domainOf(item.url) ?? item.url}</p>
          ) : null}
        </div>
      </Shell>
    );
  }

  if (item.status === "failed") {
    return (
      <Shell item={item} onOpen={onOpen} className="border-dashed">
        <Header spec={FAILED} onKebab={open} />
        <div className="px-4 pb-4 pt-3">
          <p className={`${TITLE} line-clamp-2`}>{item.title ?? item.url ?? "Unknown item"}</p>
          {item.title && item.url ? (
            <p className={`mt-1 truncate ${BODY}`}>{item.url}</p>
          ) : null}
          <Footer left={item.sourceDomain} savedAt={item.savedAt} />
        </div>
      </Shell>
    );
  }

  switch (item.type) {
    case "tweet":
      return <TweetCard item={item} onOpen={onOpen} />;
    case "instagram":
      return <MediaCard item={item} onOpen={onOpen} spec={instagramSpec(item)} play={embedString(item.embedJson, "kind") === "reel"} />;
    case "youtube":
      return <MediaCard item={item} onOpen={onOpen} spec={{ ...YOUTUBE, label: embedString(item.embedJson, "kind") === "short" ? "Short" : "YouTube" }} play showAuthor />;
    case "image":
      return <ImageCard item={item} onOpen={onOpen} />;
    case "note":
      return <NoteCard item={item} onOpen={onOpen} />;
    case "link":
      return <LinkCard item={item} onOpen={onOpen} />;
    case "document":
      return <DocumentCard item={item} onOpen={onOpen} />;
    case "article":
    default:
      return <ArticleCard item={item} onOpen={onOpen} />;
  }
}

type Props = { item: Card; onOpen?: (item: Card) => void };

function ArticleCard({ item, onOpen }: Props) {
  const open = onOpen ? () => onOpen(item) : undefined;
  const description = item.summary ?? item.preview;
  const siteName = embedString(item.embedJson, "siteName");
  return (
    <Shell item={item} onOpen={onOpen}>
      {item.thumbnailUrl ? (
        <Media item={item} spec={ARTICLE} cornerLabel={readTime(item)} onKebab={open} />
      ) : (
        <Header spec={ARTICLE} onKebab={open} />
      )}
      <div className={item.thumbnailUrl ? "px-4 pb-4 pt-2" : "px-4 pb-4 pt-3"}>
        {item.title ? <h2 className={`${TITLE} line-clamp-2`}>{item.title}</h2> : null}
        {description ? (
          <p className={`${BODY} mt-1.5 line-clamp-3`}>{description}</p>
        ) : null}
        <Tags tags={item.tags ?? []} />
        <Footer left={siteName ?? item.sourceDomain} savedAt={item.savedAt} />
      </div>
    </Shell>
  );
}

function TweetCard({ item, onOpen }: Props) {
  const open = onOpen ? () => onOpen(item) : undefined;
  const handle = (embedString(item.embedJson, "handle") ?? item.author ?? "").replace(/^@/, "");
  const likes = embedNumber(item.embedJson, "likes");
  const retweets = embedNumber(item.embedJson, "retweets");
  const quote = tweetQuote(item);
  const text = item.preview ?? item.title;
  return (
    <Shell item={item} onOpen={onOpen}>
      <div className="flex items-center justify-between px-4 pt-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Avatar seed={handle || "x"} />
          <div className="min-w-0 leading-tight">
            <p className="flex items-center gap-1.5 text-[13px] font-semibold text-stone-900 dark:text-[#f1f1f4]">
              <span className="truncate">{displayName(handle)}</span>
              <XMark size={11} className="shrink-0 text-stone-400 dark:text-[#8a8a96]" />
            </p>
            <p className={`truncate ${META}`}>@{handle}</p>
          </div>
        </div>
        <span className={`ml-3 shrink-0 ${META}`}>{timeAgo(item.savedAt)}</span>
      </div>
      <div className="px-4 pb-4 pt-3">
        {text ? (
          <p className="line-clamp-6 whitespace-pre-line text-[14px] leading-relaxed text-stone-800 dark:text-[#e6e6ea]">
            {text}
          </p>
        ) : null}
        {item.thumbnailUrl ? (
          <div className="relative mt-3 overflow-hidden rounded-xl border border-stone-200/70 dark:border-white/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="max-h-[280px] w-full object-cover dark:brightness-[0.92]"
              style={aspect(item)}
            />
            {embedString(item.embedJson, "mediaType") === "video" ||
            embedString(item.embedJson, "mediaType") === "gif" ? (
              <span className="absolute inset-0 grid place-items-center">
                <span className="grid h-11 w-11 place-items-center rounded-full border border-white/25 bg-black/45 text-white backdrop-blur-md">
                  <Play size={16} className="ml-0.5 fill-current" />
                </span>
              </span>
            ) : null}
          </div>
        ) : null}
        {quote ? (
          <div className="mt-3 rounded-xl border border-stone-200/80 bg-stone-50 p-3 dark:border-white/[0.06] dark:bg-white/[0.03]">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-stone-800 dark:text-[#e6e6ea]">
              <span className="truncate">{quote.name ?? quote.handle}</span>
              {quote.handle ? (
                <span className="truncate font-normal text-stone-400 dark:text-[#6e6e7a]">@{quote.handle}</span>
              ) : null}
            </p>
            {quote.text ? (
              <p className="mt-1 line-clamp-3 text-[12.5px] leading-relaxed text-stone-600 dark:text-[#a3a3ae]">
                {quote.text}
              </p>
            ) : null}
          </div>
        ) : null}
        {likes !== undefined || retweets !== undefined ? (
          <div className="mt-3 flex items-center gap-5 text-[12px] text-stone-400 dark:text-[#7c7c88]">
            {retweets !== undefined ? (
              <span className="inline-flex items-center gap-1.5"><Repeat2 size={15} />{compact(retweets)}</span>
            ) : null}
            {likes !== undefined ? (
              <span className="inline-flex items-center gap-1.5"><Heart size={14} />{compact(likes)}</span>
            ) : null}
          </div>
        ) : null}
        <div className="flex items-end justify-between gap-2">
          <Tags tags={item.tags ?? []} />
          <span className="-mb-1 -mr-1.5 mt-3 shrink-0"><Kebab onClick={(e) => { e.stopPropagation(); open?.(); }} /></span>
        </div>
      </div>
    </Shell>
  );
}

function MediaCard({
  item,
  onOpen,
  spec,
  play,
  showAuthor,
}: Props & { spec: BadgeSpec; play?: boolean; showAuthor?: boolean }) {
  const open = onOpen ? () => onOpen(item) : undefined;
  const author = item.author?.replace(/^@/, "");
  return (
    <Shell item={item} onOpen={onOpen}>
      {item.thumbnailUrl ? (
        <Media item={item} spec={spec} play={play} onKebab={open} />
      ) : (
        <Header spec={spec} onKebab={open} />
      )}
      <div className={item.thumbnailUrl ? "px-4 pb-4 pt-2" : "px-4 pb-4 pt-3"}>
        {item.title ? <h2 className={`${TITLE} line-clamp-2`}>{item.title}</h2> : null}
        {author ? (
          showAuthor ? (
            <p className="mt-2 flex items-center gap-2 text-[12.5px] text-stone-500 dark:text-[#a3a3ae]">
              <Avatar seed={author} size={20} />
              <span className="truncate">{author}</span>
            </p>
          ) : (
            <p className={`mt-1 ${META}`}>@{author}</p>
          )
        ) : null}
        {!item.title && item.preview ? (
          <p className={`${BODY} line-clamp-3`}>{item.preview}</p>
        ) : null}
        <Tags tags={item.tags ?? []} />
        <Footer left={item.sourceDomain} savedAt={item.savedAt} />
      </div>
    </Shell>
  );
}

function ImageCard({ item, onOpen }: Props) {
  const open = onOpen ? () => onOpen(item) : undefined;
  const caption = item.summary ?? item.preview;
  return (
    <Shell item={item} onOpen={onOpen}>
      {item.thumbnailUrl ? (
        <Media item={item} spec={IMAGE} maxH="max-h-[420px]" onKebab={open} />
      ) : (
        <Header spec={IMAGE} onKebab={open} />
      )}
      <div className={item.thumbnailUrl ? "px-4 pb-4 pt-2" : "px-4 pb-4 pt-3"}>
        {item.title ? <h2 className={`${TITLE} line-clamp-2`}>{item.title}</h2> : null}
        {caption ? <p className={`${BODY} mt-1 line-clamp-2`}>{caption}</p> : null}
        <Tags tags={item.tags ?? []} />
        <Footer left={item.sourceDomain} savedAt={item.savedAt} />
      </div>
    </Shell>
  );
}

function NoteCard({ item, onOpen }: Props) {
  const open = onOpen ? () => onOpen(item) : undefined;
  const body = item.preview?.trim() ?? "";
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const bulletRe = /^([-*•]|\d+[.)])\s+/;
  const bullets = lines.filter((l) => bulletRe.test(l));
  const asList = lines.length >= 2 && bullets.length >= Math.ceil(lines.length / 2);
  // Notes without an explicit title use their first line as one.
  const title = item.title ?? (asList ? undefined : lines[0]);
  const rest = !item.title && !asList ? lines.slice(1).join(" ") : asList ? undefined : body;
  return (
    <Shell
      item={item}
      onOpen={onOpen}
      className="border-indigo-200/70 bg-gradient-to-br from-indigo-50 via-violet-50/70 to-white hover:border-indigo-300 dark:border-indigo-300/15 dark:from-[#27274d] dark:via-[#222247] dark:to-[#1c1c3a] dark:hover:border-indigo-300/30 dark:hover:from-[#2b2b54] dark:hover:via-[#25254d] dark:hover:to-[#1f1f40]"
    >
      <Header spec={NOTE} onKebab={open} />
      <div className="px-4 pb-4 pt-3">
        {title ? <h2 className={`${TITLE} line-clamp-2`}>{title}</h2> : null}
        {asList ? (
          <ul className="mt-2 space-y-1">
            {lines.slice(0, 6).map((l, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-stone-600 dark:text-[#c3c3d6]">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400/80" />
                <span className="line-clamp-1">{l.replace(bulletRe, "")}</span>
              </li>
            ))}
          </ul>
        ) : rest ? (
          <p className={`mt-1.5 line-clamp-5 whitespace-pre-line text-[13px] leading-relaxed text-stone-600 dark:text-[#c3c3d6]`}>
            {rest}
          </p>
        ) : null}
        <Tags tags={item.tags ?? []} />
        <Footer savedAt={item.savedAt} />
      </div>
    </Shell>
  );
}

function LinkCard({ item, onOpen }: Props) {
  const open = onOpen ? () => onOpen(item) : undefined;
  const description = item.summary ?? item.preview;
  return (
    <Shell item={item} onOpen={onOpen}>
      <Header spec={LINK} onKebab={open} />
      <div className="px-4 pb-4 pt-3">
        {item.title ? <h2 className={`${TITLE} line-clamp-2`}>{item.title}</h2> : null}
        {description ? <p className={`${BODY} mt-1.5 line-clamp-2`}>{description}</p> : null}
        {item.thumbnailUrl ? (
          <div className="mt-3 overflow-hidden rounded-xl border border-stone-200/70 dark:border-white/[0.06]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-28 w-full object-cover dark:brightness-[0.92]"
            />
          </div>
        ) : null}
        <Tags tags={item.tags ?? []} />
        <Footer left={item.sourceDomain} savedAt={item.savedAt} />
      </div>
    </Shell>
  );
}

function DocumentCard({ item, onOpen }: Props) {
  const open = onOpen ? () => onOpen(item) : undefined;
  const spec = documentSpec(item);
  const filename = embedString(item.embedJson, "filename");
  const title = item.title ?? filename?.replace(/\.[a-z0-9]+$/i, "");
  const meta = [
    pluralize(embedNumber(item.embedJson, "pages"), "page"),
    formatBytes(embedNumber(item.embedJson, "bytes")),
    !embedNumber(item.embedJson, "pages") ? pluralize(embedNumber(item.embedJson, "words"), "word") : undefined,
    timeAgo(item.savedAt),
  ].filter(Boolean);
  return (
    <Shell item={item} onOpen={onOpen}>
      <Header spec={spec} onKebab={open} />
      <DocumentCover item={item} spec={spec} />
      <div className="px-4 pb-4 pt-3">
        {title ? (
          <h2 className="line-clamp-2 font-serif text-[19px] leading-snug tracking-[-0.005em] text-stone-900 dark:text-[#f1f1f4]">
            {title}
          </h2>
        ) : null}
        <p className={`mt-1.5 ${META}`}>{meta.join("  ·  ")}</p>
        <Tags tags={item.tags ?? []} />
      </div>
    </Shell>
  );
}

const COVER_TONE: Record<string, string> = {
  pdf: "from-[#3b2f7a] via-[#1f1a3f] to-[#0e0d1c]",
  docx: "from-[#1e3a8a] via-[#172554] to-[#0b1024]",
  xlsx: "from-[#065f46] via-[#064e3b] to-[#0a1f1a]",
  csv: "from-[#065f46] via-[#064e3b] to-[#0a1f1a]",
  pptx: "from-[#9a3412] via-[#5a1d0a] to-[#1f0d06]",
};

/**
 * A stack of pages with the document's first heading typeset on the top
 * sheet. Uses a rendered first page when the pipeline stores one.
 */
function DocumentCover({ item, spec }: { item: Card; spec: BadgeSpec }) {
  const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "").toLowerCase();
  const tone = COVER_TONE[format] ?? "from-[#334155] via-[#1e293b] to-[#0b1220]";
  const { heading, kicker } = coverText(item);
  return (
    <div className="px-4 pt-3">
      <div className="relative aspect-[4/3]">
        {/* the sheets behind */}
        <div className="absolute inset-x-3 top-0 bottom-0 translate-x-1.5 translate-y-3.5 rotate-[2.5deg] rounded-lg bg-stone-300/80 shadow-sm dark:bg-white/[0.10]" />
        <div className="absolute inset-x-1.5 top-0 bottom-0 translate-x-0.5 translate-y-1.5 -rotate-[1deg] rounded-lg bg-stone-200 shadow-sm dark:bg-white/[0.16]" />
        {/* the top sheet */}
        <div className={`absolute inset-0 overflow-hidden rounded-lg bg-gradient-to-br ${tone} shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)] ring-1 ring-black/10 dark:ring-white/10`}>
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
          ) : (
            <>
              <div className="pointer-events-none absolute -right-10 -top-16 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-40 rounded-full bg-white/[0.06] blur-2xl" />
              <div className="absolute inset-0 flex flex-col justify-end p-4">
                <p className="font-serif text-[21px] leading-[1.15] text-white [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:3] overflow-hidden">
                  {heading}
                </p>
                {kicker ? (
                  <p className="mt-2 line-clamp-2 text-[9px] font-medium uppercase leading-relaxed tracking-[0.18em] text-white/60">
                    {kicker}
                  </p>
                ) : null}
              </div>
              <span className="absolute left-4 top-3.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-white/45">
                {spec.label}
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function coverText(item: Card): { heading: string; kicker?: string } {
  const md = item.preview ?? "";
  const lines = md.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstHeading = lines.find((l) => /^#{1,3}\s+\S/.test(l))?.replace(/^#+\s+/, "");
  const heading = item.title ?? firstHeading ?? embedString(item.embedJson, "filename") ?? "Document";
  const para = lines.find((l) => !/^#/.test(l) && !/^[-*>|]/.test(l) && l !== heading && l.length > 20);
  const kicker = item.summary ?? para;
  return { heading, kicker: kicker ? kicker.slice(0, 90) : undefined };
}

function pluralize(n: number | undefined, unit: string): string | undefined {
  if (!n) return undefined;
  return `${n.toLocaleString()} ${unit}${n === 1 ? "" : "s"}`;
}

function formatBytes(n: number | undefined): string | undefined {
  if (!n) return undefined;
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

/* ------------------------------------------------------------------ */
/* Small helpers                                                       */
/* ------------------------------------------------------------------ */

const AVATAR_HUES = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
];

function Avatar({ seed, size = 34 }: { seed: string; size?: number }) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const grad = AVATAR_HUES[h % AVATAR_HUES.length];
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br ${grad} font-semibold uppercase text-white ring-2 ring-white/70 dark:ring-white/10`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.4) }}
      aria-hidden
    >
      {seed.slice(0, 1) || "?"}
    </span>
  );
}

function displayName(handle: string): string {
  if (!handle) return "Post";
  // "sahil_bloom" → "Sahil Bloom"; CamelCase handles get spaced too.
  return handle
    .replace(/[_.]+/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

function readTime(item: Card): string | undefined {
  const words = embedNumber(item.embedJson, "wordCount");
  if (!words) return undefined;
  return `${Math.max(1, Math.round(words / 220))} min read`;
}

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
}

function aspect(item: Card) {
  const s = saneThumb(item.thumbWidth, item.thumbHeight);
  return s ? { aspectRatio: `${s.w} / ${s.h}` } : undefined;
}

function embedString(embedJson: unknown, key: string): string | undefined {
  if (embedJson && typeof embedJson === "object" && key in embedJson) {
    const v = (embedJson as Record<string, unknown>)[key];
    return typeof v === "string" ? v : undefined;
  }
  return undefined;
}

function embedNumber(embedJson: unknown, key: string): number | undefined {
  if (embedJson && typeof embedJson === "object" && key in embedJson) {
    const v = (embedJson as Record<string, unknown>)[key];
    return typeof v === "number" ? v : undefined;
  }
  return undefined;
}

function tweetQuote(
  item: Card,
): { name?: string; handle?: string; text?: string } | undefined {
  if (item.type !== "tweet" || !item.embedJson || typeof item.embedJson !== "object") return undefined;
  const q = (item.embedJson as { quote?: unknown }).quote;
  if (!q || typeof q !== "object") return undefined;
  const { name, handle, text } = q as { name?: unknown; handle?: unknown; text?: unknown };
  return {
    name: typeof name === "string" ? name : undefined,
    handle: typeof handle === "string" ? handle : undefined,
    text: typeof text === "string" ? text : undefined,
  };
}

function saneThumb(
  width?: number,
  height?: number,
): { w: number; h: number } | undefined {
  if (!width || !height || width < 1 || height < 1 || width > 8192 || height > 8192) {
    return undefined;
  }
  return { w: width, h: height };
}

function timeAgo(savedAt: number): string {
  const seconds = Math.floor((Date.now() - savedAt) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(savedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

