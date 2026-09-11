"use client";

// Design gallery: one card of every type with fixture data. Not linked from
// the app — open /dev/cards directly while iterating on ItemCard.

import { useEffect, useState } from "react";
import { ItemCard } from "../../../components/ItemCard";
import { MASONRY } from "../../../components/layout";
import { getTheme, onThemeChange, setTheme, toggleTheme, type Theme } from "../../../components/theme";
import type { Card } from "../../../components/types";

const H = 60 * 60 * 1000;
const D = 24 * H;
const now = Date.now();

const pic = (seed: string, w: number, h: number) =>
  `https://picsum.photos/seed/${seed}/${w}/${h}`;

const FIXTURES: Card[] = [
  {
    id: "article-1",
    type: "article",
    status: "ready",
    url: "https://www.theverge.com/ai/creativity",
    title: "The Next Era of Human Creativity",
    preview: "How AI tools are expanding what it means to be creative, not replacing it.",
    summary: "How AI tools are expanding what it means to be creative, not replacing it.",
    sourceDomain: "theverge.com",
    tags: ["ai", "creativity", "leverage"],
    savedAt: now - 2 * H,
    thumbnailUrl: pic("canyon", 800, 500),
    thumbWidth: 800,
    thumbHeight: 500,
    embedJson: { siteName: "The Verge", wordCount: 1760 },
  },
  {
    id: "tweet-1",
    type: "tweet",
    status: "ready",
    url: "https://x.com/SahilBloom/status/1",
    title: "The highest leverage skill in 2024 isn't prompt engineering.",
    author: "@SahilBloom",
    preview: "The highest leverage skill in 2024 isn't prompt engineering.\n\nIt's knowing what to think about.",
    sourceDomain: "x.com",
    tags: ["ai", "creativity", "leverage"],
    savedAt: now - 3 * H,
    embedJson: { provider: "x", handle: "SahilBloom", likes: 12000, retweets: 2100 },
  },
  {
    id: "ig-1",
    type: "instagram",
    status: "ready",
    url: "https://www.instagram.com/reel/abc/",
    title: "A focused life hits different.",
    author: "@deepwork",
    preview: "A focused life hits different.",
    sourceDomain: "instagram.com",
    tags: ["focus", "mindset", "productivity"],
    savedAt: now - 5 * H,
    thumbnailUrl: pic("desk", 720, 520),
    thumbWidth: 720,
    thumbHeight: 520,
    embedJson: { provider: "instagram", kind: "reel" },
  },
  {
    id: "note-1",
    type: "note",
    status: "ready",
    title: "Ideas for my next project",
    preview:
      "- Personal knowledge graph\n- AI-powered daily digest\n- Browser extension\n- Mobile app (later)\n- Focus on beautiful UX",
    tags: [],
    savedAt: now - 1 * D,
  },
  {
    id: "image-1",
    type: "image",
    status: "ready",
    title: "Mount Fuji at sunrise",
    summary: "A reminder to dream bigger.",
    tags: ["travel", "japan", "inspiration"],
    savedAt: now - 3 * D,
    thumbnailUrl: pic("fuji", 800, 560),
    thumbWidth: 800,
    thumbHeight: 560,
  },
  {
    id: "yt-1",
    type: "youtube",
    status: "ready",
    url: "https://www.youtube.com/watch?v=jvqFAi7vkBc",
    title: "Sam Altman: The Next 10 Years of AI | Lex Fridman Podcast",
    author: "Lex Fridman",
    sourceDomain: "youtube.com",
    tags: ["ai", "podcast"],
    savedAt: now - 1 * D,
    thumbnailUrl: "https://i.ytimg.com/vi/jvqFAi7vkBc/mqdefault.jpg",
    thumbWidth: 320,
    thumbHeight: 180,
    embedJson: { provider: "youtube", videoId: "jvqFAi7vkBc", kind: "video" },
  },
  {
    id: "doc-1",
    type: "document",
    status: "ready",
    title: "Building with LLMs",
    author: "Andrej Karpathy",
    sourceDomain: "pdf",
    preview:
      "# Building with LLMs\n\nLarge language models are best understood as a new kind of computer. This document covers prompting, retrieval, evaluation and the failure modes we hit in production.\n\n- Context windows\n- Tool use\n- Evals",
    summary: "A practical field guide to shipping LLM features, from prompting to evals.",
    tags: ["ai", "llm", "research"],
    savedAt: now - 2 * D,
    embedJson: { filename: "building-with-llms.pdf", format: "pdf", pages: 48, bytes: 2516582, words: 14200 },
  },
  {
    id: "article-2",
    type: "article",
    status: "ready",
    url: "https://fs.blog/second-brain",
    title: "Why a Second Brain Changes Everything",
    summary: "A practical guide to building your digital memory and living a more intentional life.",
    sourceDomain: "fs.blog",
    tags: ["pkm", "productivity"],
    savedAt: now - 3 * D,
    thumbnailUrl: pic("wave", 800, 440),
    thumbWidth: 800,
    thumbHeight: 440,
    embedJson: { siteName: "Farnam Street", wordCount: 1100 },
  },
  {
    id: "link-1",
    type: "link",
    status: "ready",
    url: "https://github.com/shadcn-ui/ui",
    title: "Design Resources",
    summary: "A collection of beautiful UI references.",
    sourceDomain: "github.com",
    tags: ["design"],
    savedAt: now - 4 * D,
    thumbnailUrl: pic("ui", 800, 400),
    thumbWidth: 800,
    thumbHeight: 400,
  },
  {
    id: "tweet-2",
    type: "tweet",
    status: "ready",
    url: "https://x.com/naval/status/2",
    title: "A quiet mind is a superpower.",
    author: "@naval",
    preview: "A quiet mind is a superpower.",
    sourceDomain: "x.com",
    tags: ["mindset", "philosophy"],
    savedAt: now - 5 * D,
    thumbnailUrl: pic("mountains", 800, 500),
    thumbWidth: 800,
    thumbHeight: 500,
    embedJson: {
      provider: "x",
      handle: "naval",
      likes: 32000,
      retweets: 8400,
      mediaType: "photo",
      quote: {
        name: "Paul Graham",
        handle: "paulg",
        text: "The best ideas are lonely at first.",
      },
    },
  },
  {
    id: "ig-2",
    type: "instagram",
    status: "ready",
    url: "https://www.instagram.com/p/xyz/",
    title: "Good design makes a better tomorrow.",
    author: "@archdaily",
    sourceDomain: "instagram.com",
    tags: ["design", "architecture"],
    savedAt: now - 5 * D,
    thumbnailUrl: pic("palms", 700, 560),
    thumbWidth: 700,
    thumbHeight: 560,
    embedJson: { provider: "instagram", kind: "post" },
  },
  {
    id: "article-3",
    type: "article",
    status: "ready",
    url: "https://paulgraham.com/greatwork.html",
    title: "How to Do Great Work",
    summary:
      "Choose a field, learn enough to reach the frontier, notice gaps, and explore them with genuine curiosity.",
    sourceDomain: "paulgraham.com",
    tags: ["essays", "work"],
    savedAt: now - 6 * D,
  },
  {
    id: "note-2",
    type: "note",
    status: "ready",
    preview:
      "Book recommendations\nSapiens, The Almanack of Naval Ravikant, Thinking Fast and Slow, Zero to One. Start with Sapiens, it reframes everything after it.",
    tags: ["books"],
    savedAt: now - 8 * D,
  },
  {
    id: "doc-2",
    type: "document",
    status: "ready",
    title: "Q3 Planning",
    sourceDomain: "docx",
    preview:
      "## Goals\n\n1. Ship the browser extension\n2. Launch mobile beta\n3. Cut pipeline latency by 40%\n\n## Risks\n\nOpenRouter rate limits during the digest cron.",
    tags: ["planning"],
    savedAt: now - 9 * D,
    embedJson: { filename: "q3-planning.docx", format: "docx", bytes: 184320, words: 2150 },
  },
  {
    id: "doc-3",
    type: "document",
    status: "ready",
    title: "Building a Second Brain (pdf guide)",
    sourceDomain: "pdf",
    preview: "# Building a Second Brain\n\nA practical framework for a calmer, smarter you.",
    summary: "A practical framework for a calmer, smarter you.",
    tags: ["guide", "productivity", "pdf"],
    savedAt: now - 7 * D,
    embedJson: { filename: "second-brain-guide.pdf", format: "pdf", pages: 12, bytes: 4404019, words: 3900 },
  },
  {
    id: "doc-4",
    type: "document",
    status: "ready",
    title: "Q3 budget",
    sourceDomain: "xlsx",
    preview: "| Line | Q3 | Notes |\n|---|---|---|\n| Infra | 4,200 | Convex + OpenRouter |",
    tags: ["finance"],
    savedAt: now - 11 * D,
    embedJson: { filename: "q3-budget.xlsx", format: "xlsx", bytes: 61440, words: 640 },
  },
  {
    id: "link-2",
    type: "link",
    status: "ready",
    url: "https://pin.it/abc",
    title: "My Life OS",
    summary: "A workspace for a better me.",
    sourceDomain: "pin.it",
    tags: ["lifeos"],
    savedAt: now - 10 * D,
  },
  {
    id: "yt-2",
    type: "youtube",
    status: "ready",
    url: "https://www.youtube.com/shorts/aqz-KE-bpKQ",
    title: "Big Buck Bunny in 60 seconds",
    author: "Blender",
    sourceDomain: "youtube.com",
    tags: ["animation"],
    savedAt: now - 12 * D,
    thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/mqdefault.jpg",
    thumbWidth: 320,
    thumbHeight: 180,
    embedJson: { provider: "youtube", videoId: "aqz-KE-bpKQ", kind: "short" },
  },
  {
    id: "pending-1",
    type: "article",
    status: "pending",
    url: "https://stratechery.com/2026/aggregation",
    tags: [],
    savedAt: now - 20 * 1000,
  },
  {
    id: "failed-1",
    type: "article",
    status: "failed",
    url: "https://example.com/paywalled-piece",
    title: "The piece behind a paywall",
    sourceDomain: "example.com",
    tags: [],
    savedAt: now - 40 * 60 * 1000,
  },
];

export default function CardsGallery() {
  const [theme, setThemeState] = useState<Theme>(getTheme);
  useEffect(() => onThemeChange(setThemeState), []);
  // ?theme=light|dark forces a theme (used for headless screenshots).
  useEffect(() => {
    const forced = new URLSearchParams(window.location.search).get("theme");
    if (forced === "light" || forced === "dark") setTheme(forced);
  }, []);

  return (
    <main className="mx-auto max-w-[1600px] px-6 py-8">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Mind <span className="text-violet-400">Vault</span>
          </h1>
          <p className="text-sm text-stone-500 dark:text-[#8a8a96]">
            Card gallery · every type, fixture data
          </p>
        </div>
        <button
          onClick={() => setThemeState(toggleTheme())}
          className="rounded-full border border-stone-300 px-4 py-1.5 text-sm text-stone-600 dark:border-white/10 dark:text-[#b4b4bf]"
        >
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      </div>
      <div className={MASONRY}>
        {FIXTURES.map((item) => (
          <ItemCard key={item.id} item={item} onOpen={() => {}} />
        ))}
      </div>
    </main>
  );
}
