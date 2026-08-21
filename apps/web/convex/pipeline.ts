"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import * as cheerio from "cheerio";
import { parseHTML } from "linkedom";
import { Readability } from "@mozilla/readability";
import { YoutubeTranscript } from "youtube-transcript";
import type { Id } from "./_generated/dataModel";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

type Extracted = {
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

  // Transcript → the actual spoken content becomes searchable
  let transcript: string | undefined;
  try {
    const parts = await YoutubeTranscript.fetchTranscript(videoId);
    if (parts && parts.length > 0) {
      transcript = parts
        .map((p) => p.text.replace(/\s+/g, " "))
        .join(" ")
        .slice(0, 50000);
    }
  } catch {
    // captions disabled or blocked — video still saves with title/summary-less text
  }

  return {
    title,
    author: author ? `${author} (YouTube)` : undefined,
    text: transcript ?? title,
    thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
    embedJson: { provider: "youtube", videoId, kind },
  };
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

export const enrich = internalAction({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.pipelineDb.getItem, {
      itemId: args.itemId,
    });
    if (!item) return null;
    if (!item.url) return null;

    try {
      const url = new URL(item.url);
      const host = url.hostname.replace(/^(www|m)\./, "");
      let extracted: Extracted;
      if (host === "x.com" || host === "twitter.com" || host === "mobile.twitter.com") {
        extracted = await extractTweet(url);
      } else if (host === "instagram.com") {
        extracted = await extractInstagram(url);
      } else if (host === "youtube.com" || host === "youtu.be") {
        extracted = await extractYouTube(url);
      } else {
        extracted = await extractArticle(url);
      }

      let thumbnailStorageId: Id<"_storage"> | undefined;
      if (extracted.thumbnailUrl) {
        try {
          const imgRes = await fetch(extracted.thumbnailUrl, {
            headers: { "User-Agent": UA },
            redirect: "follow",
          });
          if (imgRes.ok) {
            const bytes = await imgRes.arrayBuffer();
            if (bytes.byteLength > 0 && bytes.byteLength < 10 * 1024 * 1024) {
              const blob = new Blob([bytes], {
                type: imgRes.headers.get("content-type") ?? "image/jpeg",
              });
              thumbnailStorageId = await ctx.storage.store(blob);
            }
          }
        } catch {
          // thumbnail is optional — never fail enrichment over it
        }
      }

      let htmlStorageId: Id<"_storage"> | undefined;
      if (extracted.html && extracted.html.length > 20000) {
        const blob = new Blob([extracted.html], { type: "text/html" });
        htmlStorageId = await ctx.storage.store(blob);
      }

      await ctx.runMutation(internal.pipelineDb.persistMeta, {
        itemId: args.itemId,
        title: extracted.title,
        author: extracted.author,
        contentText: extracted.text?.slice(0, 50000),
        htmlStorageId,
        thumbnailStorageId,
        embedJson: extracted.embedJson,
        sourceDomain: host,
      });
    } catch (error) {
      await ctx.runMutation(internal.pipelineDb.markFailed, {
        itemId: args.itemId,
        reason: error instanceof Error ? error.message : String(error),
      });
    }
    return null;
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
