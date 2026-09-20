"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as cheerio from "cheerio";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { YoutubeTranscript } from "youtube-transcript";
import {
  formatFromBytes,
  formatFromExtension,
  toMarkdownBytes,
} from "@firecrawl/anydoc";
import type { Id } from "./_generated/dataModel";
import { imageSize } from "./imageSize";
import { DOCUMENT_MAX_BYTES, extensionOf } from "./shared";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

type Extracted = {
  // Set when extraction reclassifies the item (e.g. article → product).
  type?: "product";
  title?: string;
  author?: string;
  text?: string;
  html?: string;
  thumbnailUrl?: string;
  embedJson?: Record<string, unknown>;
};

function absolute(src: string, base: string): string | undefined {
  try {
    return new URL(src, base).href;
  } catch {
    return undefined;
  }
}

async function extractTweet(url: URL): Promise<Extracted> {
  const match = url.pathname.match(/\/([^/]+)\/status(?:es)?\/(\d+)/);
  if (!match) throw new Error("Could not parse tweet URL");
  const api = `https://api.fxtwitter.com/i/status/${match[2]}`;
  const res = await fetch(api, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`fxtwitter responded ${res.status}`);
  const json = (await res.json()) as Record<string, unknown>;
  const tweet = json?.tweet as Record<string, unknown> | undefined;
  if (!tweet) throw new Error("Unexpected fxtwitter response");

  const author = tweet.author as Record<string, unknown> | undefined;
  const handle =
    typeof author?.screen_name === "string"
      ? author.screen_name
      : typeof author?.username === "string"
        ? author.username
        : match[1];
  const text = typeof tweet.text === "string" ? tweet.text : undefined;

  const media = tweet.media as Record<string, unknown> | undefined;
  const allMedia = Array.isArray(media?.all)
    ? (media.all as Array<Record<string, unknown>>)
    : [];

  // Prefer a real image; for videos/GIFs use the poster frame — never an .mp4
  let thumbnailUrl: string | undefined;
  const photo =
    allMedia.find((m) => m.type === "photo") ??
    (Array.isArray(media?.photos)
      ? (media.photos as Array<Record<string, unknown>>)[0]
      : undefined);
  if (typeof photo?.url === "string") {
    thumbnailUrl = photo.url;
  } else {
    const video =
      allMedia.find((m) => m.type === "video" || m.type === "gif") ??
      (Array.isArray(media?.videos)
        ? (media.videos as Array<Record<string, unknown>>)[0]
        : undefined);
    if (typeof video?.thumbnail_url === "string") {
      thumbnailUrl = video.thumbnail_url;
    }
  }

  const likes = tweet.likes as Record<string, unknown> | undefined;
  const retweets = tweet.retweets as Record<string, unknown> | undefined;

  // Quoted post — same shape as a tweet, nested under "quote"
  let quoteJson: Record<string, unknown> | undefined;
  const quote = tweet.quote as Record<string, unknown> | undefined;
  if (quote && typeof quote === "object") {
    const qAuthor = quote.author as Record<string, unknown> | undefined;
    const qHandle =
      typeof qAuthor?.screen_name === "string"
        ? qAuthor.screen_name
        : typeof qAuthor?.username === "string"
          ? qAuthor.username
          : undefined;
    const qName =
      typeof qAuthor?.name === "string" ? qAuthor.name : undefined;
    const qText = typeof quote.text === "string" ? quote.text : undefined;
    const qMedia = quote.media as Record<string, unknown> | undefined;
    const qAll = Array.isArray(qMedia?.all)
      ? (qMedia.all as Array<Record<string, unknown>>)
      : [];
    const qPhoto = qAll.find((m) => m.type === "photo");
    quoteJson = {
      handle: qHandle,
      name: qName,
      text: qText?.slice(0, 500),
      thumbnailUrl:
        typeof qPhoto?.url === "string" ? (qPhoto.url as string) : undefined,
    };
  }

  return {
    title: text ? text.slice(0, 120) : `Post by @${handle}`,
    author: `@${handle}`,
    text,
    thumbnailUrl,
    embedJson: {
      provider: "x",
      tweetId: typeof tweet.id === "string" ? tweet.id : match[2],
      handle,
      likes: typeof likes?.count === "number" ? likes.count : undefined,
      retweets: typeof retweets?.count === "number" ? retweets.count : undefined,
      mediaType: typeof allMedia[0]?.type === "string" ? allMedia[0].type : undefined,
      ...(quoteJson ? { quote: quoteJson } : {}),
    },
  };
}

function shortcodeFromPath(pathname: string): string | undefined {
  const match = pathname.match(/\/(?:p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return match?.[1];
}

async function extractInstagram(url: URL): Promise<Extracted> {
  // Instagram serves full og-metadata to the facebookexternalhit crawler UA
  const res = await fetch(`https://www.instagram.com${url.pathname}`, {
    headers: {
      "User-Agent": "facebookexternalhit/1.1",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });
  if (!res.ok) throw new Error(`Instagram responded ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const og = (prop: string) =>
    $(`meta[property="${prop}"]`).attr("content") ?? undefined;

  const title = og("og:title");
  const description = og("og:description");
  const image = og("og:image");
  if (!title && !description && !image) {
    throw new Error("No Instagram metadata returned");
  }

  // description shape: "328K likes, 699 comments - username on July 30, 2026: "caption""
  let author: string | undefined;
  let caption: string | undefined;
  if (description) {
    const authorMatch = description.match(/-\s*([A-Za-z0-9._]+)\s+on\s+[A-Z]/);
    if (authorMatch) author = `@${authorMatch[1]}`;
    const captionMatch = description.match(/:\s*"([\s\S]*)"?$/);
    if (captionMatch) caption = captionMatch[1].trim();
  }

  return {
    title: caption?.slice(0, 140) ?? title,
    author,
    text: caption ?? description,
    thumbnailUrl: image,
    embedJson: {
      provider: "instagram",
      shortcode: shortcodeFromPath(url.pathname),
      kind: url.pathname.includes("/reel") ? "reel" : ("post" as const),
    },
  };
}

function youTubeVideoId(url: URL): string | undefined {
  const host = url.hostname.replace(/^(www|m)\./, "");
  if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || undefined;
  const v = url.searchParams.get("v");
  if (v) return v;
  const m = url.pathname.match(/\/(?:shorts|live|embed)\/([A-Za-z0-9_-]+)/);
  return m?.[1];
}

async function extractYouTube(url: URL): Promise<Extracted> {
  const videoId = youTubeVideoId(url);
  if (!videoId) throw new Error("Could not parse YouTube video ID");
  const kind = url.pathname.includes("/shorts/") ? "short" : "video";

  // oEmbed: free, no key, reliable metadata
  let title: string | undefined;
  let author: string | undefined;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { headers: { "User-Agent": UA } },
    );
    if (res.ok) {
      const j = (await res.json()) as Record<string, unknown>;
      if (typeof j.title === "string") title = j.title;
      if (typeof j.author_name === "string") author = j.author_name;
    }
  } catch {
    // fall through — thumbnail URL is deterministic anyway
  }
  if (!title) throw new Error("YouTube metadata unavailable (private video?)");

  return {
    title,
    author: author ? `${author} (YouTube)` : undefined,
    text: title,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
    embedJson: { provider: "youtube", videoId, kind },
  };
}

async function fetchYouTubeTranscript(videoId: string): Promise<string | undefined> {
  try {
    const parts = await YoutubeTranscript.fetchTranscript(videoId);
    if (parts && parts.length > 0) {
      return parts
        .map((p) => p.text.replace(/\s+/g, " "))
        .join(" ")
        .slice(0, 50000);
    }
  } catch {
    return undefined;
  }
  return undefined;
}

async function extractArticle(url: URL): Promise<Extracted> {
  let html: string | undefined;
  try {
    const res = await fetch(url.href, {
      headers: { "User-Agent": UA, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (res.ok) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("html")) {
        html = await res.text();
      }
    }
  } catch {
    // fall through to jina
  }

  if (html) {
    const $ = cheerio.load(html);
    const ogTitle = $('meta[property="og:title"]').attr("content") ?? undefined;
    const ogDesc =
      $('meta[property="og:description"]').attr("content") ?? undefined;
    const ogImage = $('meta[property="og:image"]').attr("content") ?? undefined;
    const ogSiteName =
      $('meta[property="og:site_name"]').attr("content") ?? undefined;

    let parsedTitle: string | undefined;
    let byline: string | undefined;
    let textContent: string | undefined;
    let readerHtml: string | undefined;

    try {
      const { document } = parseHTML(html);
      const article = new Readability(document as unknown as Document).parse();
      if (article) {
        parsedTitle = article.title ?? undefined;
        byline = article.byline ?? undefined;
        textContent = article.textContent?.replace(/\s+/g, " ").trim();
        readerHtml = article.content ?? undefined;
      }
    } catch {
      // readability can choke on odd DOMs — og tags still save the card
    }

    // Product pages reclassify the item: card shows price + buy link instead
    // of reader prose, so we don't bother storing reader HTML for them.
    const product =
      parseProduct($) ?? (await extractShopifyProduct(url, html));
    if (product) {
      const { name, image, description, ...info } = product;
      return {
        type: "product",
        title: stripSiteSuffix(ogTitle ?? name ?? parsedTitle, ogSiteName),
        author: product.brand,
        text: description ?? ogDesc ?? textContent,
        thumbnailUrl:
          (ogImage ? absolute(ogImage, url.href) : undefined) ??
          (image ? absolute(image, url.href) : undefined),
        embedJson: {
          provider: "product",
          ...(ogSiteName ? { siteName: ogSiteName } : {}),
          ...info,
        },
      };
    }

    return {
      title: parsedTitle ?? ogTitle,
      author: byline,
      text: textContent ?? ogDesc,
      html: readerHtml,
      thumbnailUrl: ogImage ? absolute(ogImage, url.href) : undefined,
      embedJson: ogSiteName ? { siteName: ogSiteName } : undefined,
    };
  }

  // Fallback: r.jina.ai reader (free, handles JS-heavy pages)
  const jinaRes = await fetch(`https://r.jina.ai/${url.href}`, {
    headers: { "User-Agent": UA },
  });
  if (!jinaRes.ok) throw new Error(`Fetch failed (${jinaRes.status})`);
  const markdown = await jinaRes.text();
  const titleMatch = markdown.match(/^Title:\s*(.+)$/m);
  return {
    title: titleMatch?.[1]?.trim(),
    text: markdown.slice(0, 100000),
  };
}

/* ------------------------------------------------------------------ */
/* GitHub — repos, issues, pull requests and profiles via the REST API */
/* ------------------------------------------------------------------ */

const GH_API = "https://api.github.com";

function ghHeaders(accept = "application/vnd.github+json"): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: accept,
    "User-Agent": UA,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  // Optional: raises the unauthenticated 60 req/h limit to 5000.
  const token = process.env.GITHUB_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function ghJson(path: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${GH_API}${path}`, { headers: ghHeaders() });
  if (!res.ok) throw new Error(`GitHub API ${res.status} for ${path}`);
  return (await res.json()) as Record<string, unknown>;
}

const str = (v: unknown): string | undefined => (typeof v === "string" && v.length > 0 ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" ? v : undefined);

function ghAvatar(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const u = new URL(url);
    u.searchParams.set("s", "160");
    return u.href;
  } catch {
    return url;
  }
}

async function extractGitHub(url: URL): Promise<Extracted> {
  const parts = url.pathname.split("/").filter(Boolean);
  const [owner, repo, section, number] = parts;
  if (!owner) throw new Error("Not a GitHub page");
  const base = { provider: "github", owner };

  if (!repo) {
    const user = await ghJson(`/users/${owner}`);
    const name = str(user.name) ?? owner;
    const bio = str(user.bio);
    return {
      title: name,
      author: owner,
      text: [bio, str(user.company), str(user.location)].filter(Boolean).join("\n"),
      thumbnailUrl: ghAvatar(str(user.avatar_url)),
      embedJson: {
        ...base,
        kind: "user",
        login: owner,
        name,
        bio,
        followers: num(user.followers),
        publicRepos: num(user.public_repos),
      },
    };
  }

  if ((section === "issues" || section === "pull") && number && /^\d+$/.test(number)) {
    const issue = await ghJson(`/repos/${owner}/${repo}/issues/${number}`);
    const isPull = section === "pull" || "pull_request" in issue;
    let state = str(issue.state) ?? "open";
    let diff: Record<string, unknown> = {};
    if (isPull) {
      try {
        const pr = await ghJson(`/repos/${owner}/${repo}/pulls/${number}`);
        if (pr.merged === true) state = "merged";
        diff = {
          additions: num(pr.additions),
          deletions: num(pr.deletions),
          changedFiles: num(pr.changed_files),
        };
      } catch {
        // The issues endpoint already gave us enough for a card.
      }
    }
    const user = issue.user as Record<string, unknown> | undefined;
    const labels = Array.isArray(issue.labels)
      ? issue.labels
          .map((l) => (l && typeof l === "object" && "name" in l ? str((l as { name: unknown }).name) : str(l)))
          .filter((l): l is string => Boolean(l))
          .slice(0, 5)
      : [];
    return {
      title: str(issue.title),
      author: str(user?.login),
      text: str(issue.body)?.slice(0, 50000),
      thumbnailUrl: ghAvatar(str(user?.avatar_url)),
      embedJson: {
        ...base,
        repo,
        fullName: `${owner}/${repo}`,
        kind: isPull ? "pull" : "issue",
        number: Number(number),
        state,
        comments: num(issue.comments),
        labels,
        ...diff,
      },
    };
  }

  const r = await ghJson(`/repos/${owner}/${repo}`);
  const ownerObj = r.owner as Record<string, unknown> | undefined;
  let readme: string | undefined;
  try {
    const res = await fetch(`${GH_API}/repos/${owner}/${repo}/readme`, {
      headers: ghHeaders("application/vnd.github.raw+json"),
    });
    if (res.ok) readme = (await res.text()).slice(0, 60000);
  } catch {
    // README is a nice-to-have for search and summaries.
  }
  const description = str(r.description);
  const fullName = str(r.full_name) ?? `${owner}/${repo}`;
  const license = r.license as Record<string, unknown> | null | undefined;
  return {
    title: fullName,
    author: str(ownerObj?.login) ?? owner,
    text: [description, readme].filter(Boolean).join("\n\n"),
    thumbnailUrl: ghAvatar(str(ownerObj?.avatar_url)),
    embedJson: {
      ...base,
      repo,
      fullName,
      kind: "repo",
      description,
      stars: num(r.stargazers_count),
      forks: num(r.forks_count),
      openIssues: num(r.open_issues_count),
      language: str(r.language),
      topics: Array.isArray(r.topics) ? r.topics.filter((t): t is string => typeof t === "string").slice(0, 6) : [],
      license: str(license?.spdx_id),
      homepage: str(r.homepage),
      archived: r.archived === true,
      pushedAt: str(r.pushed_at),
      ...(section ? { path: parts.slice(2).join("/") } : {}),
    },
  };
}

/* ------------------------------------------------------------------ */
/* Products — og:product meta, JSON-LD Product nodes, microdata        */
/* ------------------------------------------------------------------ */

type ProductInfo = {
  name?: string;
  price?: number;
  priceText?: string;
  currency?: string;
  compareAtPrice?: number;
  brand?: string;
  availability?: string;
  image?: string;
  description?: string;
};

const CURRENCY_SYMBOLS: Record<string, string> = {
  $: "USD",
  "₹": "INR",
  "€": "EUR",
  "£": "GBP",
  "¥": "JPY",
  "₩": "KRW",
};

function cleanCurrency(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  const c = raw.trim();
  if (/^[A-Za-z]{3}$/.test(c)) return c.toUpperCase();
  return CURRENCY_SYMBOLS[c];
}

function parsePrice(raw: unknown): number | undefined {
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : undefined;
  if (typeof raw !== "string") return undefined;
  let s = raw.trim().replace(/[^\d.,]/g, "");
  if (!s) return undefined;
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  if (lastComma >= 0 && lastDot >= 0) {
    // Both separators: the rightmost one is the decimal point.
    s =
      lastComma > lastDot
        ? s.replace(/\./g, "").replace(",", ".")
        : s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    // Comma only: three digits after it means thousands ("1,299"), else decimal.
    s =
      s.length - lastComma - 1 === 3
        ? s.replace(/,/g, "")
        : s.replace(",", ".");
  }
  const n = Number.parseFloat(s);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

const AVAILABILITY_LABELS: Record<string, string> = {
  instock: "In stock",
  outofstock: "Out of stock",
  soldout: "Sold out",
  preorder: "Pre-order",
  presale: "Pre-sale",
  limitedavailability: "Low stock",
  backorder: "Backorder",
  discontinued: "Discontinued",
  instoreonly: "In store only",
  onlineonly: "Online only",
};

function availabilityLabel(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  // JSON-LD gives "https://schema.org/InStock"; og meta gives "in stock".
  const key = raw.split("/").pop() ?? raw;
  return AVAILABILITY_LABELS[key.toLowerCase().replace(/[\s_-]/g, "")];
}

function ldType(node: Record<string, unknown>): string[] {
  const t = node["@type"];
  return (Array.isArray(t) ? t : [t]).filter(
    (x): x is string => typeof x === "string",
  );
}

type LdProduct = {
  product?: Record<string, unknown>;
  group?: Record<string, unknown>;
};

// Walks JSON-LD trees — arrays, @graph, hasVariant — collecting the first
// Product node and the first ProductGroup node it sees. ProductGroup wraps
// variants (Shopify); the group's name is cleaner than a variant's.
function collectLdProducts(node: unknown, out: LdProduct): void {
  if (Array.isArray(node)) {
    for (const n of node) {
      collectLdProducts(n, out);
      if (out.product) return;
    }
    return;
  }
  if (!node || typeof node !== "object") return;
  const obj = node as Record<string, unknown>;
  const types = ldType(obj).map((t) => t.toLowerCase());
  if (!out.product && types.includes("product")) out.product = obj;
  if (!out.group && types.includes("productgroup")) out.group = obj;
  if (out.product) return;
  for (const key of ["@graph", "hasVariant", "itemListElement", "mainEntity"]) {
    if (key in obj) collectLdProducts(obj[key], out);
  }
}

// Some stores append junk after the JSON-LD object, which breaks JSON.parse —
// extract just the first balanced {…} (string- and escape-aware).
function firstJsonObject(text: string): unknown {
  const start = text.indexOf("{");
  if (start < 0) throw new Error("no object");
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
  }
  throw new Error("unbalanced");
}

// JSON-LD strings sometimes carry literal HTML entities ("Men&#39;s").
function decodeEntities(s: string | undefined): string | undefined {
  if (!s || !s.includes("&")) return s;
  const { document } = parseHTML(`<span>${s}</span>`);
  return document.querySelector("span")?.textContent ?? s;
}

function ldImage(node: Record<string, unknown>): string | undefined {
  const img = node.image;
  const first = Array.isArray(img) ? img[0] : img;
  if (typeof first === "string") return first;
  if (first && typeof first === "object") {
    const url = (first as Record<string, unknown>).url;
    if (typeof url === "string") return url;
  }
  return undefined;
}

function ldBrand(node: Record<string, unknown>): string | undefined {
  const brand = node.brand;
  if (typeof brand === "string") return brand;
  if (brand && typeof brand === "object") {
    const name = (brand as Record<string, unknown>).name;
    if (typeof name === "string") return name;
  }
  return undefined;
}

function offerFields(node: Record<string, unknown>): {
  price?: number;
  priceText?: string;
  currency?: string;
  availability?: string;
} {
  let offers = node.offers;
  if (Array.isArray(offers)) offers = offers[0];
  if (!offers || typeof offers !== "object") return {};
  const o = offers as Record<string, unknown>;
  const rawPrice = o.price ?? o.lowPrice;
  return {
    price: parsePrice(rawPrice),
    priceText:
      parsePrice(rawPrice) === undefined && typeof rawPrice === "string"
        ? rawPrice
        : undefined,
    currency: cleanCurrency(o.priceCurrency),
    availability: availabilityLabel(o.availability),
  };
}

/** Pull product metadata out of a product page, or undefined when the page
 * carries no product signals (og:type, JSON-LD Product, price meta). */
function parseProduct(
  $: ReturnType<typeof cheerio.load>,
): ProductInfo | undefined {
  const meta = (name: string) =>
    $(`meta[property="${name}"], meta[name="${name}"]`).attr("content") ??
    undefined;

  const ogType = meta("og:type")?.toLowerCase() ?? "";

  const ld: LdProduct = {};
  $("script[type^='application/ld+json']").each((_, el) => {
    if (ld.product) return;
    try {
      collectLdProducts(firstJsonObject($(el).contents().text()), ld);
    } catch {
      // malformed JSON-LD — keep looking
    }
  });
  const node = ld.product ?? ld.group;

  const isProduct =
    ogType === "product" ||
    ogType.startsWith("product.") ||
    node !== undefined ||
    meta("product:price:amount") !== undefined;
  if (!isProduct) return undefined;

  const offer = node ? offerFields(node) : {};
  const microPrice =
    $('[itemprop="price"]').first().attr("content") ??
    $('[itemprop="price"]').first().text().trim();

  const price =
    offer.price ??
    parsePrice(meta("product:price:amount")) ??
    parsePrice(meta("og:price:amount")) ??
    parsePrice(meta("twitter:data1")) ??
    parsePrice(microPrice);
  const priceText =
    price === undefined
      ? (meta("product:price:amount") ??
        meta("og:price:amount") ??
        offer.priceText)
      : undefined;

  // A variant's name is "Shoe - Black/42"; the group's is just "Shoe".
  const nameSource = ld.group ?? ld.product;
  const name =
    nameSource && typeof nameSource.name === "string"
      ? decodeEntities(nameSource.name)
      : undefined;
  const descSource = ld.group ?? ld.product;

  return {
    name,
    price,
    priceText,
    currency:
      offer.currency ??
      cleanCurrency(meta("product:price:currency")) ??
      cleanCurrency(meta("og:price:currency")) ??
      cleanCurrency(
        $('[itemprop="priceCurrency"]').first().attr("content"),
      ),
    compareAtPrice:
      parsePrice(meta("product:original_price:amount")) ??
      parsePrice(meta("product:pretax_price:amount")),
    brand:
      (node ? decodeEntities(ldBrand(node)) : undefined) ??
      meta("og:brand") ??
      meta("product:brand"),
    availability:
      offer.availability ?? availabilityLabel(meta("product:availability")),
    image: node ? ldImage(node) : undefined,
    description:
      descSource && typeof descSource.description === "string"
        ? decodeEntities(descSource.description)
        : undefined,
  };
}

/** Shopify storefronts expose /products/{handle}.js — this reaches
 * JS-rendered stores whose HTML carries no og/JSON-LD product markup. */
async function extractShopifyProduct(
  url: URL,
  html: string,
): Promise<ProductInfo | undefined> {
  const handle = url.pathname.match(/\/products\/([a-z0-9-]+)/i)?.[1];
  if (!handle) return undefined;
  if (
    !/cdn\.shopify\.com|myshopify\.com|Shopify\.theme|window\.Shopify\b/.test(
      html,
    )
  ) {
    return undefined;
  }
  let p: Record<string, unknown> | undefined;
  // Some stores only serve the endpoint under the locale prefix
  // (/en-us/products/x.js), others at the root — try both.
  for (const endpoint of [
    `${url.origin}/products/${handle}.js`,
    `${url.origin}${url.pathname}.js`,
  ]) {
    try {
      const res = await fetch(endpoint, { headers: { "User-Agent": UA } });
      if (!res.ok) continue;
      const data = (await res.json()) as Record<string, unknown>;
      if (typeof data.title === "string") {
        p = data;
        break;
      }
    } catch {
      continue;
    }
  }
  if (!p) return undefined;

  // ?variant= pins the price to the exact variant the user saved.
  const variants = Array.isArray(p.variants)
    ? (p.variants as Array<Record<string, unknown>>)
    : [];
  const variantId = url.searchParams.get("variant");
  const variant = variantId
    ? variants.find((vv) => String(vv.id) === variantId)
    : undefined;

  // The .js endpoint reports prices in minor units (cents).
  const cents = (value: unknown) =>
    typeof value === "number" ? value / 100 : undefined;
  const price = cents(variant?.price) ?? cents(p.price);
  const compareAt =
    cents(variant?.compare_at_price) ?? cents(p.compare_at_price);
  const available =
    typeof variant?.available === "boolean"
      ? variant.available
      : typeof p.available === "boolean"
        ? p.available
        : undefined;
  const currency =
    html.match(/Shopify\.currency\s*=\s*\{[^}]*"active"\s*:\s*"([A-Z]{3})"/)?.[1] ??
    html.match(/"currencyCode"\s*:\s*"([A-Z]{3})"/)?.[1] ??
    html.match(/currency\s*=\s*'([A-Z]{3})'/)?.[1];

  const description =
    typeof p.description === "string" && p.description.length > 0
      ? cheerio
          .load(`<div>${p.description}</div>`)("div")
          .text()
          .replace(/\s+/g, " ")
          .trim()
      : undefined;

  return {
    name: typeof p.title === "string" ? p.title : undefined,
    price,
    currency,
    compareAtPrice:
      compareAt !== undefined && price !== undefined && compareAt > price
        ? compareAt
        : undefined,
    brand: typeof p.vendor === "string" ? p.vendor : undefined,
    availability:
      available === true
        ? "In stock"
        : available === false
          ? "Out of stock"
          : undefined,
    image:
      typeof p.featured_image === "string" ? p.featured_image : undefined,
    description,
  };
}

/** "Lone Peak 9 | Altra Running" → "Lone Peak 9" */
function stripSiteSuffix(
  title: string | undefined,
  siteName: string | undefined,
): string | undefined {
  if (!title || !siteName) return title;
  const esc = siteName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const stripped = title.replace(
    new RegExp(`\\s*[|–—-]\\s*${esc}\\s*$`, "i"),
    "",
  );
  return stripped || title;
}

function convertFailureMessage(error: unknown): string {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code: unknown }).code)
      : undefined;
  if (code === "needsOcr") {
    return "This PDF looks scanned. Set FIRECRAWL_API_KEY to OCR it, or upload a text-based PDF.";
  }
  if (code === "encrypted") return "This file is password-protected";
  if (code === "unsupported") return "That file type couldn't be converted";
  if (code === "malformed")
    return "That file doesn't look like a readable document";
  return error instanceof Error ? error.message : String(error);
}

async function extractUploadedDocument(args: {
  bytes: Uint8Array;
  filename: string;
}): Promise<{ text: string; format?: string }> {
  const ext = extensionOf(args.filename);
  const format =
    formatFromExtension(ext) ?? formatFromBytes(args.bytes) ?? undefined;
  const apiKey = process.env.FIRECRAWL_API_KEY;
  const markdown = await toMarkdownBytes(
    args.bytes,
    format,
    apiKey ? { ocr: "hosted", apiKey } : undefined,
  );
  const text = markdown.trim();
  if (!text) throw new Error("No text could be extracted from that file");
  return { text, format: format ?? (ext || undefined) };
}

/**
 * Cheap metadata for document cards: size in bytes, word count, and for PDFs
 * a page count from the object table. Counting `/Type /Page` objects misses
 * pages packed into object streams, so it is a best-effort number.
 */
function documentStats(
  bytes: Uint8Array,
  extracted: { text: string; format?: string },
): { bytes: number; words: number; pages?: number } {
  const words = extracted.text.split(/\s+/).filter(Boolean).length;
  let pages: number | undefined;
  if (extracted.format === "pdf") {
    const head = new TextDecoder("latin1").decode(bytes);
    const matches = head.match(/\/Type\s*\/Page(?![s\w])/g);
    if (matches && matches.length > 0) pages = matches.length;
  }
  return { bytes: bytes.byteLength, words, ...(pages ? { pages } : {}) };
}

async function persistThumb(
  ctx: { storage: { store: (blob: Blob) => Promise<Id<"_storage">> } },
  url: string,
): Promise<{
  thumbnailStorageId: Id<"_storage">;
  thumbWidth?: number;
  thumbHeight?: number;
} | undefined> {
  try {
    const imgRes = await fetch(url, {
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    if (!imgRes.ok) return undefined;
    const bytes = await imgRes.arrayBuffer();
    if (bytes.byteLength === 0 || bytes.byteLength >= 10 * 1024 * 1024) {
      return undefined;
    }
    const size = imageSize(bytes);
    const blob = new Blob([bytes], {
      type: imgRes.headers.get("content-type") ?? "image/jpeg",
    });
    const thumbnailStorageId = await ctx.storage.store(blob);
    return {
      thumbnailStorageId,
      thumbWidth: size?.width,
      thumbHeight: size?.height,
    };
  } catch {
    return undefined;
  }
}

function filenameFromItem(item: {
  title?: string;
  embedJson?: unknown;
}): string {
  if (
    item.embedJson &&
    typeof item.embedJson === "object" &&
    "filename" in item.embedJson &&
    typeof (item.embedJson as { filename: unknown }).filename === "string"
  ) {
    return (item.embedJson as { filename: string }).filename;
  }
  return item.title ?? "document";
}

export const enrich = internalAction({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.pipelineDb.getItem, {
      itemId: args.itemId,
    });
    if (!item) return null;

    try {
      if (item.fileStorageId) {
        const blob = await ctx.storage.get(item.fileStorageId);
        if (!blob) throw new Error("Uploaded file is missing");
        const buffer = await blob.arrayBuffer();
        if (buffer.byteLength === 0) throw new Error("File is empty");
        if (buffer.byteLength > DOCUMENT_MAX_BYTES) {
          throw new Error("File is too large (max 15 MB)");
        }
        const filename = filenameFromItem(item);
        const extracted = await extractUploadedDocument({
          bytes: new Uint8Array(buffer),
          filename,
        });
        const prior =
          item.embedJson && typeof item.embedJson === "object"
            ? (item.embedJson as Record<string, unknown>)
            : {};
        const stats = documentStats(new Uint8Array(buffer), extracted);
        await ctx.runMutation(internal.pipelineDb.persistMeta, {
          itemId: args.itemId,
          title: item.title,
          contentText: extracted.text.slice(0, 50000),
          sourceDomain: extracted.format,
          embedJson: { ...prior, format: extracted.format, ...stats },
        });
        return null;
      }

      if (!item.url) return null;

      const url = new URL(item.url);
      const host = url.hostname.replace(/^(www|m)\./, "");
      let extracted: Extracted;
      if (host === "x.com" || host === "twitter.com" || host === "mobile.twitter.com") {
        extracted = await extractTweet(url);
      } else if (host === "instagram.com") {
        extracted = await extractInstagram(url);
      } else if (host === "youtube.com" || host === "youtu.be") {
        extracted = await extractYouTube(url);
      } else if (host === "github.com") {
        try {
          extracted = await extractGitHub(url);
        } catch {
          // Rate limited or an unusual page: keep the GitHub card, fall back
          // to the page's own metadata.
          extracted = await extractArticle(url);
          extracted.embedJson = { ...(extracted.embedJson ?? {}), provider: "github", kind: "page" };
        }
      } else {
        extracted = await extractArticle(url);
      }

      const thumb = extracted.thumbnailUrl
        ? await persistThumb(ctx, extracted.thumbnailUrl)
        : undefined;

      let htmlStorageId: Id<"_storage"> | undefined;
      if (extracted.html && extracted.html.length > 20000) {
        const blob = new Blob([extracted.html], { type: "text/html" });
        htmlStorageId = await ctx.storage.store(blob);
      }

      const isYouTube = host === "youtube.com" || host === "youtu.be";
      await ctx.runMutation(internal.pipelineDb.persistMeta, {
        itemId: args.itemId,
        title: extracted.title,
        author: extracted.author,
        contentText: extracted.text?.slice(0, 50000),
        htmlStorageId,
        thumbnailStorageId: thumb?.thumbnailStorageId,
        thumbWidth: thumb?.thumbWidth,
        thumbHeight: thumb?.thumbHeight,
        embedJson: extracted.embedJson,
        sourceDomain: host,
        skipAi: isYouTube,
        type: extracted.type,
      });

      if (isYouTube) {
        const videoId =
          extracted.embedJson && typeof extracted.embedJson.videoId === "string"
            ? extracted.embedJson.videoId
            : undefined;
        if (videoId) {
          const transcript = await fetchYouTubeTranscript(videoId);
          if (transcript) {
            await ctx.runMutation(internal.pipelineDb.patchContent, {
              itemId: args.itemId,
              contentText: transcript,
            });
          }
        }
        await ctx.runMutation(internal.pipelineDb.kickAi, {
          itemId: args.itemId,
        });
      }
    } catch (error) {
      await ctx.runMutation(internal.pipelineDb.markFailed, {
        itemId: args.itemId,
        reason: convertFailureMessage(error),
      });
    }
    return null;
  },
});

export const stampThumbSizes = internalAction({
  args: {},
  returns: v.number(),
  handler: async (ctx) => {
    const pending: Array<{
      itemId: Id<"items">;
      thumbnailStorageId: Id<"_storage">;
    }> = await ctx.runQuery(internal.pipelineDb.thumbsNeedingResize, {});
    let n = 0;
    for (const row of pending) {
      try {
        const blob = await ctx.storage.get(row.thumbnailStorageId);
        if (!blob) continue;
        const size = imageSize(await blob.arrayBuffer());
        if (!size) continue;
        await ctx.runMutation(internal.pipelineDb.replaceThumb, {
          itemId: row.itemId,
          thumbnailStorageId: row.thumbnailStorageId,
          thumbWidth: size.width,
          thumbHeight: size.height,
        });
        n += 1;
      } catch {
        continue;
      }
    }
    return n;
  },
});

export const sweepStale = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const stale = await ctx.runQuery(internal.pipelineDb.getStalePending, {
      before: Date.now() - 15 * 60 * 1000,
    });
    for (const itemId of stale) {
      await ctx.runMutation(internal.pipelineDb.scheduleRetry, { itemId });
    }
    return null;
  },
});
