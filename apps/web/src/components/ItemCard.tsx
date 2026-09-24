"use client";

import type { ComponentType, KeyboardEvent, ReactNode } from "react";
import {
  FileSpreadsheet,
  FileText,
  Image as ImageIcon,
  Link2,
  LoaderCircle,
  Newspaper,
  Play,
  Presentation,
  ShoppingBag,
  Star,
  StickyNote,
  TriangleAlert,
} from "lucide-react";
import type { Card } from "./types";
import { formatPrice, priceLabel, productInfo, type ProductInfo } from "../lib/product";

/**
 * Pinterest-style cards, shared with the mobile app: the picture does the
 * talking. Each card is a rounded tile — the thumbnail, or a designed
 * stand-in when there isn't one — with a small type tag on it, and at most
 * a two-line heading below. Summaries, tags and dates live in the modal.
 */

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

function GitHubMark({ size = 14, className }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" className={className} aria-hidden>
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  );
}

/* Wrap the brand marks so they satisfy the BadgeSpec icon signature. */
const IGIcon = (p: MarkProps) => <InstagramMark {...p} />;
const YTIcon = (p: MarkProps) => <YouTubeMark {...p} />;
const GHIcon = (p: MarkProps) => <GitHubMark {...p} />;

/* ------------------------------------------------------------------ */
/* Type tags                                                           */
/* ------------------------------------------------------------------ */

type TagSpec = {
  label: string;
  Icon: ComponentType<{ size?: number; strokeWidth?: number; className?: string }>;
  chip: string;
};

const ARTICLE: TagSpec = { label: "Article", Icon: Newspaper, chip: "bg-indigo-500 text-white" };
const IMAGE: TagSpec = { label: "Image", Icon: ImageIcon, chip: "bg-emerald-500 text-white" };
const NOTE: TagSpec = { label: "Note", Icon: StickyNote, chip: "bg-violet-500 text-white" };
const LINK: TagSpec = { label: "Link", Icon: Link2, chip: "bg-sky-500 text-white" };
const PRODUCT: TagSpec = { label: "Product", Icon: ShoppingBag, chip: "bg-emerald-600 text-white" };
const TWEET: TagSpec = { label: "Post", Icon: (p) => <XMark {...p} size={10} />, chip: "bg-black text-white dark:bg-white dark:text-black" };
const GITHUB: TagSpec = { label: "GitHub", Icon: GHIcon, chip: "bg-[#24292f] text-white" };
const PENDING: TagSpec = { label: "Saving…", Icon: (p) => <LoaderCircle {...p} className="animate-spin" />, chip: "bg-white/25 text-white" };
const FAILED: TagSpec = { label: "Couldn't save", Icon: TriangleAlert, chip: "bg-amber-500 text-white" };

function specFor(item: Card): TagSpec {
  if (item.status === "pending") return PENDING;
  if (item.status === "failed") return FAILED;
  switch (item.type) {
    case "instagram":
      return {
        label: embedString(item.embedJson, "kind") === "reel" ? "Reel" : "Post",
        Icon: IGIcon,
        chip: "bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7] text-white",
      };
    case "youtube":
      return {
        label: embedString(item.embedJson, "kind") === "short" ? "Short" : "YouTube",
        Icon: YTIcon,
        chip: "bg-[#ff0033] text-white",
      };
    case "document": {
      const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "file").toLowerCase();
      if (format === "pdf") return { label: "PDF", Icon: FileText, chip: "bg-red-500 text-white" };
      if (format === "xlsx" || format === "csv") return { label: format.toUpperCase(), Icon: FileSpreadsheet, chip: "bg-emerald-600 text-white" };
      if (format === "pptx") return { label: "Slides", Icon: Presentation, chip: "bg-orange-500 text-white" };
      return { label: format.toUpperCase(), Icon: FileText, chip: "bg-blue-500 text-white" };
    }
    case "tweet":
      return TWEET;
    case "note":
      return NOTE;
    case "image":
      return IMAGE;
    case "link":
      return LINK;
    case "github":
      return GITHUB;
    case "product":
      return PRODUCT;
    default:
      return ARTICLE;
  }
}

/** The small pill that says what a card is. Dark glass over pictures. */
function Tag({ spec, onSurface }: { spec: TagSpec; onSurface?: boolean }) {
  const { label, Icon, chip } = spec;
  return (
    <span
      className={`inline-flex max-w-full items-center gap-1.5 rounded-full py-[3px] pl-[3px] pr-2.5 text-[11.5px] font-semibold ${
        onSurface
          ? "bg-white/80 text-stone-700 ring-1 ring-black/[0.05] dark:bg-white/[0.08] dark:text-[#e4e4e7] dark:ring-0"
          : "bg-black/45 text-white backdrop-blur-md"
      }`}
    >
      <span className={`grid h-[18px] w-[18px] shrink-0 place-items-center rounded-full ${chip}`}>
        <Icon size={10} strokeWidth={2.5} />
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}

function TagSlot({ spec }: { spec: TagSpec }) {
  return (
    <div className="pointer-events-none absolute inset-x-2 bottom-2 flex">
      <Tag spec={spec} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tiles                                                               */
/* ------------------------------------------------------------------ */

const TILE = "relative overflow-hidden rounded-2xl bg-stone-200/70 dark:bg-white/[0.05]";

const HUES = [
  "from-violet-500 to-fuchsia-500",
  "from-sky-500 to-indigo-500",
  "from-emerald-500 to-teal-500",
  "from-amber-500 to-orange-500",
  "from-rose-500 to-pink-500",
  "from-cyan-500 to-blue-500",
];

function hueFor(seed: string) {
  let h = 0;
  for (const ch of seed) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return HUES[h % HUES.length];
}

/** Portrait-leaning, like Pinterest — but never a sliver or a banner. */
function imageAspect(item: Card): number {
  const s = saneThumb(item.thumbWidth, item.thumbHeight);
  if (s) return Math.max(0.66, Math.min(s.w / s.h, 1.5));
  if (item.type === "youtube") return embedString(item.embedJson, "kind") === "short" ? 9 / 16 : 16 / 9;
  if (item.type === "instagram") return 4 / 5;
  return 1;
}

function isVideo(item: Card) {
  return (
    item.type === "youtube" ||
    (item.type === "instagram" && embedString(item.embedJson, "kind") === "reel") ||
    (item.type === "tweet" && ["video", "gif"].includes(embedString(item.embedJson, "mediaType") ?? ""))
  );
}

function ImageTile({ item, spec, price }: { item: Card; spec: TagSpec; price?: ProductInfo }) {
  return (
    <div className={TILE} style={{ aspectRatio: imageAspect(item) }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.thumbnailUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
      {/* A soft floor so the tag reads on bright photos. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/35 to-transparent" />
      {isVideo(item) ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-black/45 text-white ring-1 ring-white/30 backdrop-blur-md">
            <Play size={17} className="ml-0.5" fill="currentColor" />
          </span>
        </div>
      ) : null}
      {price ? (
        <span className="absolute right-2 top-2 inline-flex items-baseline gap-1.5 rounded-full bg-stone-950/80 px-2.5 py-1 text-[13px] font-bold text-white backdrop-blur-md">
          {price.compareAtPrice !== undefined && price.price !== undefined && price.compareAtPrice > price.price ? (
            <span className="text-[10.5px] font-normal text-white/55 line-through">
              {formatPrice(price.compareAtPrice, price.currency)}
            </span>
          ) : null}
          {priceLabel(price)}
        </span>
      ) : null}
      <TagSlot spec={spec} />
    </div>
  );
}

const BULLET_RE = /^([-*•]|\d+[.)])\s+/;

function NoteTile({ item, spec }: { item: Card; spec: TagSpec }) {
  const body = (item.preview ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(BULLET_RE, "• "))
    .filter(Boolean)
    .join("\n");
  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-white p-3.5 ring-1 ring-indigo-200/70 dark:from-[#1f1d33] dark:via-[#1b1a27] dark:to-[#17171d] dark:ring-[#2f2c4a]">
      <Tag spec={spec} onSurface />
      <p className="mt-3 line-clamp-[8] whitespace-pre-line font-serif text-[17px] leading-snug text-stone-700 dark:text-[#e4e4e7]">
        {body || item.title || "Empty note"}
      </p>
    </div>
  );
}

function TweetTile({ item }: { item: Card }) {
  const handle = (embedString(item.embedJson, "handle") ?? item.author ?? "").replace(/^@/, "");
  return (
    <div className="relative overflow-hidden rounded-2xl bg-white p-3.5 ring-1 ring-stone-200/80 dark:bg-[#17171d] dark:ring-white/[0.06]">
      <div className="flex items-center gap-2">
        <span
          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-br ${hueFor(handle || "x")} text-[11px] font-semibold uppercase text-white`}
          aria-hidden
        >
          {handle.slice(0, 1) || "?"}
        </span>
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-stone-500 dark:text-[#8b8b94]">@{handle || "post"}</span>
        <XMark size={12} className="text-stone-400 dark:text-[#8b8b94]" />
      </div>
      <p className="mt-2.5 line-clamp-[7] text-[14.5px] leading-snug text-stone-700 dark:text-[#e4e4e7]">
        {item.preview ?? item.title}
      </p>
    </div>
  );
}

/** Articles, links and products that came without a picture. */
function CoverTile({ item, spec, price }: { item: Card; spec: TagSpec; price?: ProductInfo }) {
  const domain = item.sourceDomain ?? (item.url ? domainOf(item.url) : undefined) ?? spec.label;
  return (
    <div className={`relative flex aspect-square flex-col justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${hueFor(domain)} p-4`}>
      <span className="font-serif text-[64px] italic leading-none text-white/90">{domain.slice(0, 1).toUpperCase()}</span>
      <span className="mb-6 mt-1 truncate text-[13px] font-semibold text-white/85">{price ? priceLabel(price) : domain}</span>
      <TagSlot spec={spec} />
    </div>
  );
}

const COVER_TONE: Record<string, string> = {
  pdf: "from-[#3b2f7a] via-[#1f1a3f] to-[#0e0d1c]",
  docx: "from-[#1e3a8a] via-[#172554] to-[#0b1024]",
  xlsx: "from-[#065f46] via-[#064e3b] to-[#0a1f1a]",
  csv: "from-[#065f46] via-[#064e3b] to-[#0a1f1a]",
  pptx: "from-[#9a3412] via-[#5a1d0a] to-[#1f0d06]",
};

/** A stack of pages with the document's first heading on the top sheet. */
function DocumentTile({ item, spec }: { item: Card; spec: TagSpec }) {
  const format = (embedString(item.embedJson, "format") ?? item.sourceDomain ?? "").toLowerCase();
  const tone = COVER_TONE[format] ?? "from-[#334155] via-[#1e293b] to-[#0b1220]";
  return (
    <div className={`${TILE} px-5 pb-11 pt-4`}>
      <div className="relative mx-auto aspect-[4/5] max-w-[220px]">
        <div className="absolute inset-x-3 inset-y-0 translate-x-1 translate-y-2.5 rotate-[2.5deg] rounded-md bg-stone-300/80 dark:bg-white/[0.10]" />
        <div className="absolute inset-x-1.5 inset-y-0 translate-x-0.5 translate-y-1 -rotate-[1deg] rounded-md bg-stone-200 dark:bg-white/[0.16]" />
        <div className={`absolute inset-0 overflow-hidden rounded-md bg-gradient-to-br ${tone} shadow-[0_10px_30px_-12px_rgba(0,0,0,0.55)]`}>
          {item.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.thumbnailUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover object-top" />
          ) : (
            <p className="absolute inset-x-0 bottom-0 line-clamp-4 p-3 font-serif text-[17px] leading-tight text-white">
              {coverHeading(item)}
            </p>
          )}
        </div>
      </div>
      <TagSlot spec={spec} />
    </div>
  );
}

function GitHubTile({ item }: { item: Card }) {
  const e = item.embedJson;
  const owner = embedString(e, "owner") ?? item.author?.replace(/^@/, "") ?? "";
  const repo = embedString(e, "repo");
  const stars = embedNumber(e, "stars");
  const language = embedString(e, "language");
  return (
    <div className="relative flex min-h-[130px] flex-col gap-2.5 overflow-hidden rounded-2xl bg-[#24292f] p-3.5 text-white">
      <div className="flex items-center gap-2">
        {item.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.thumbnailUrl} alt="" loading="lazy" className="h-6 w-6 rounded-md object-cover" />
        ) : (
          <span className={`grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br ${hueFor(owner || "gh")} text-[11px] font-semibold uppercase`}>
            {owner.slice(0, 1) || "?"}
          </span>
        )}
        <span className="min-w-0 flex-1 truncate text-[12.5px] text-white/70">{owner}</span>
      </div>
      <p className="line-clamp-2 font-mono text-[15px] font-semibold leading-snug">{repo ?? item.title ?? "GitHub"}</p>
      <div className="mt-auto flex items-center gap-3 text-[12px] text-white/70">
        {stars !== undefined ? (
          <span className="inline-flex items-center gap-1">
            <Star size={12} fill="currentColor" />
            {compact(stars)}
          </span>
        ) : null}
        {language ? <span>{language}</span> : null}
        <GitHubMark size={16} className="ml-auto text-white/80" />
      </div>
    </div>
  );
}

function StatusTile({ item, spec }: { item: Card; spec: TagSpec }) {
  return (
    <div className={`${TILE} flex aspect-square flex-col items-center justify-center gap-2 pb-6 ${item.status === "pending" ? "mv-shimmer" : ""}`}>
      {item.status === "failed" ? <TriangleAlert size={24} className="text-stone-400 dark:text-[#8b8b94]" /> : null}
      <span className="max-w-[80%] truncate text-[13px] text-stone-500 dark:text-[#8b8b94]">
        {item.url ? (domainOf(item.url) ?? item.url) : "Memory"}
      </span>
      <TagSlot spec={spec} />
    </div>
  );
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
  const spec = specFor(item);
  const price = item.type === "product" ? productInfo(item.embedJson) : undefined;

  let tile: ReactNode;
  // Text-led tiles already show their words; a heading below would repeat.
  let showHeading = true;
  if (item.status !== "ready") {
    tile = <StatusTile item={item} spec={spec} />;
  } else if (item.type === "note") {
    tile = <NoteTile item={item} spec={spec} />;
    showHeading = !!item.title && !(item.preview ?? "").startsWith(item.title);
  } else if (item.type === "document") {
    tile = <DocumentTile item={item} spec={spec} />;
    // Without a rendered page the cover already carries the title.
    showHeading = !!item.thumbnailUrl;
  } else if (item.type === "github") {
    tile = <GitHubTile item={item} />;
    showHeading = false;
  } else if (item.thumbnailUrl) {
    tile = <ImageTile item={item} spec={spec} price={price} />;
  } else if (item.type === "tweet") {
    tile = <TweetTile item={item} />;
    showHeading = false;
  } else {
    tile = <CoverTile item={item} spec={spec} price={price} />;
  }

  const heading =
    item.type === "tweet"
      ? (item.preview ?? item.title)
      : item.type === "document"
        ? (item.title ?? embedString(item.embedJson, "filename")?.replace(/\.[a-z0-9]+$/i, ""))
        : (item.title ?? item.preview ?? (item.url ? domainOf(item.url) : undefined));

  function onKeyDown(e: KeyboardEvent<HTMLElement>) {
    if (!onOpen) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onOpen(item);
    }
  }

  return (
    <article
      onClick={onOpen ? () => onOpen(item) : undefined}
      onKeyDown={onKeyDown}
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      aria-label={cardLabel(item)}
      className={`group mb-5 break-inside-avoid sm:mb-6 rounded-2xl outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-stone-400 focus-visible:ring-offset-4 focus-visible:ring-offset-[#fafaf9] dark:focus-visible:ring-[#6b6b75] dark:focus-visible:ring-offset-[#0f0f13] ${
        onOpen ? "cursor-pointer" : ""
      }`}
    >
      <div className="transition duration-200 group-hover:-translate-y-0.5 group-hover:shadow-[0_16px_36px_-18px_rgba(0,0,0,0.45)] group-active:scale-[0.99] rounded-2xl">
        {tile}
      </div>
      {showHeading && heading ? (
        <p className="mt-2 line-clamp-2 px-1 text-[14px] font-medium leading-snug text-stone-800 dark:text-[#e4e4e7]">
          {heading}
        </p>
      ) : null}
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

const TYPE_NAMES: Record<Card["type"], string> = {
  article: "Article",
  tweet: "Post on X",
  instagram: "Instagram post",
  youtube: "YouTube video",
  image: "Image",
  note: "Note",
  link: "Link",
  document: "Document",
  github: "GitHub",
  product: "Product",
};

/** What a screen reader announces for a card: kind, title, source, price, age. */
function cardLabel(item: Card): string {
  if (item.status === "pending") return `Saving ${item.url ? (domainOf(item.url) ?? "memory") : "memory"}`;
  const title = item.title ?? item.preview?.slice(0, 120) ?? item.url ?? "Untitled";
  const price = item.type === "product" ? productInfo(item.embedJson) : undefined;
  return [
    item.status === "failed" ? "Couldn't save" : TYPE_NAMES[item.type],
    title,
    item.author ? `by ${item.author.replace(/^@/, "")}` : undefined,
    item.sourceDomain,
    price ? priceLabel(price) : undefined,
    `saved ${timeAgo(item.savedAt)}`,
  ]
    .filter(Boolean)
    .join(", ");
}

function coverHeading(item: Card): string {
  const lines = (item.preview ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const firstHeading = lines.find((l) => /^#{1,3}\s+\S/.test(l))?.replace(/^#+\s+/, "");
  return item.title ?? firstHeading ?? embedString(item.embedJson, "filename") ?? "Document";
}

function compact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(n);
}

function domainOf(url: string): string | undefined {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return undefined;
  }
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

function saneThumb(width?: number, height?: number): { w: number; h: number } | undefined {
  if (!width || !height || width < 1 || height < 1 || width > 8192 || height > 8192) return undefined;
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
