# MindVault — Product & Technical Spec

> A private, AI-organized personal knowledge base inspired by mymind.
> "Remember everything. Organize nothing."
> *(Working name — rename freely.)*

---

## 1. Product Vision

One private place to save **web articles, X posts, Instagram posts/reels, images, and quick notes**. You never organize — an AI pipeline auto-tags, summarizes, and indexes everything. Retrieval happens through search (full-text + semantic), not folders.

**Non-goals (v1):** collaboration, social features, multi-user accounts, public sharing, notifications.

**Core promise:** capture in < 2 seconds, find in < 2 seconds.

---

## 2. Content Types (Priority Order)

| Type | Capture Source | Extraction Strategy |
|---|---|---|
| **Web articles** | Web extension, mobile share, paste URL | Server-side fetch → Mozilla `@mozilla/readability` (in Node action) → clean text + hero image. Reader mode built from extracted HTML. Fallback: `r.jina.ai` (free reader API) for JS-heavy pages. |
| **X posts** | Mobile share, paste URL | `api.fxtwitter.com/<user>/status/<id>` (free, no auth) → text, author, media, stats. Render custom card. Fallback: official `platform.twitter.com` embed widget. |
| **Instagram posts/reels** | Mobile share, paste URL | Metadata via **ddinstagram** og-tags (free proxy exposing og:image/description). Playback via official embed iframe (`instagram.com/p/{id}/embed`, `/reel/{id}/embed`) — works for public posts, no login. |
| **Images** | Mobile share, web | Upload to Convex File Storage; extract dominant colors (`node-vibrant`); OCR via AI vision. |
| **Quick notes** | Web + mobile app | Plain text/markdown, first-class card. |
| **PDFs** | Later | Upload + text extraction (`pdf-parse`) + same AI pipeline. |
| **YouTube/videos** | Later | oEmbed + thumbnail + transcript (optional). |

**Universal fallback:** if extraction fails → elegant gradient placeholder card with type icon + URL. Never a broken-looking card. (Node actions allow Playwright later if ever needed.)

---

## 3. Architecture (Convex)

**Chosen stack: Convex as the entire backend.** One service replaces Postgres + pgvector + QStash + R2 + REST routes. Frontend deploys free on Vercel.

```
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│ Next.js Web      │   │ Expo Mobile      │   │ Share ext /      │
│ (Vercel, free)   │   │ + share ext      │   │ bookmarklet      │
│ convex-react     │   │ convex-rn client │   │ httpAction       │
└────────┬─────────┘   └────────┬─────────┘   └────────┬─────────┘
         │   typed reactive RPC │                      │ POST /api/capture
         └──────────────┬───────┴──────────────────────┘
                        ▼
        ┌───────────────────────────────────────┐
        │              CONVEX                   │
        │                                       │
        │  capture (mutation)                   │
        │    ├─ insert item(status=pending)     │
        │    └─ scheduler.runAfter(0, enrich)   │ ← durable, in-DB queue
        │                                       │
        │  enrich (action, Node runtime)        │
        │    ├─ extract (readability/fxtwitter/ │
        │    │   ddinstagram/jina fallback)     │
        │    ├─ store thumb/html → File Storage │
        │    └─ runMutation(persistResults)     │
        │                                       │
        │  aiEnrich (action)                    │
        │    ├─ OpenRouter chat: summary + tags │
        │    ├─ OpenRouter embeddings           │
        │    └─ runMutation(persistAiResults)   │
        │                                       │
        │  DB: items/tags/highlights/spaces     │
        │  + searchIndex + vectorIndex          │
        └───────────────────────────────────────┘
                        ▲
            live subscription: cards update
            reactively when enrichment lands
```

**Key patterns:**
- Mutations are transactional & exactly-once; actions (external side effects) are at-most-once → retry pattern: failure handler mutation checks attempt count and reschedules the action.
- Actions never touch `ctx.db` directly — they call `ctx.runMutation(internal.x.persist)` to write results.
- Big payloads (full article HTML > ~500KB) go to File Storage; the doc keeps text + storage ID (1 MiB doc limit).

**Monorepo layout (Turborepo + pnpm):**

```
mindvault/
├── apps/
│   ├── web/        # Next.js 15 — UI + convex/ folder (schema, functions)
│   └── mobile/     # Expo — viewer + capture + share extension
├── packages/
│   ├── shared/     # zod schemas, types, constants (shared web/mobile)
│   └── config/     # eslint, tsconfig presets
└── turbo.json
```

*(Convex functions live in `apps/web/convex/`; the mobile app imports the generated API from the web app or a shared `packages/backend` if preferred.)*

---

## 4. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Backend | **Convex** (free plan) | DB + reactive queries + durable scheduler + file storage + FTS + vector search in one; first-class Expo client |
| Web framework | **Next.js 15 + TypeScript** on Vercel Hobby | UI only; all backend logic lives in Convex |
| UI | **Tailwind CSS + shadcn/ui** | Fast to build the calm editorial aesthetic |
| Mobile | **Expo (managed)** + `expo-share-extension` + `convex/react-native` | Share-sheet capture on iOS; intent filters on Android; same reactive backend as web |
| Extraction | `@mozilla/readability` (+`linkedom`) in Node action → `r.jina.ai` fallback | No infra needed; fast HTTP chain |
| AI | **OpenRouter** — one key for all AI tasks. Chat/vision: `openai/gpt-4o-mini` (or any `:free` model). Embeddings: `openai/text-embedding-3-small` via `/api/v1/embeddings` | Single account, single bill, model swaps via env var; free models available |
| Colors | `node-vibrant` | Search-by-color |
| Auth | **Convex Auth** or Clerk free tier, single allow-listed email | Personal app, one user |
| Hosting | Vercel (web) + Convex cloud (backend) | Both free at this scale |

**Why Convex over Postgres+QStash+R2:** fewer moving parts, real-time UI updates for free, identical backend for web & mobile, generous free tier at personal volume. Trade-off accepted: vendor lock-in (export via `npx convex export`).

---

## 5. Data Model (`convex/schema.ts`)

```ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  items: defineTable({
    type: v.union(
      v.literal("article"), v.literal("tweet"), v.literal("instagram"),
      v.literal("image"), v.literal("note"), v.literal("pdf"), v.literal("link"),
    ),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    sourceDomain: v.optional(v.string()),
    contentText: v.optional(v.string()),          // extracted clean text
    htmlStorageId: v.optional(v.id("_storage")),  // reader-mode HTML if large
    summary: v.optional(v.string()),
    thumbnailStorageId: v.optional(v.id("_storage")),
    embedJson: v.optional(v.any()),               // tweet data, ig shortcode, colors…
    dominantColors: v.optional(v.array(v.string())),
    readingTime: v.optional(v.number()),
    status: v.union(v.literal("pending"), v.literal("ready"), v.literal("failed")),
    enrichAttempts: v.optional(v.number()),
    savedAt: v.number(),
  })
    .index("by_status_saved", ["status", "savedAt"])
    .index("by_type", ["type"])
    .index("by_url", ["url"])
    .searchIndex("search_text", {
      searchField: "contentText",
      filterFields: ["type"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["type"],
    }),

  tags: defineTable({
    name: v.string(),
    source: v.union(v.literal("ai"), v.literal("manual")),
    useCount: v.number(),
  }).index("by_name", ["name"]),

  itemTags: defineTable({
    itemId: v.id("items"),
    tagId: v.id("tags"),
  }).index("by_item", ["itemId"]).index("by_tag", ["tagId"]),

  highlights: defineTable({
    itemId: v.id("items"),
    text: v.string(),
    note: v.optional(v.string()),
  }).index("by_item", ["itemId"]),

  spaces: defineTable({                 // smart collections = saved searches
    name: v.string(),
    query: v.any(),                     // {type?, tag?, domain?, color?}
  }),
});
```

---

## 6. Functions Surface (v1)

```ts
// queries (reactive — UI subscribes)
items.list({ type?, q?, tagId?, domain?, color?, cursor })   // paginated grid
items.get({ id })
search.hybrid({ q })        // FTS + vectorSearch merged, re-ranked
serendipity.random()        // old-item resurfacing

// mutations
capture.url({ url })        // dedupe by url → insert pending → schedule enrich
capture.note({ text })
capture.image({ storageId })
items.update({ id, title?, isArchived? })
items.remove({ id })
highlights.add({ itemId, text, note? })

// internal (pipeline)
internal.enrich.extract({ itemId })       // action: fetch/extract/store media
internal.ai.tagAndEmbed({ itemId })       // action: OpenAI summary/tags/embedding
internal.persist.*                        // mutations writing results
internal.retry.stale()                    // cron: re-enqueue stuck pendings

// httpActions (for share extension / bookmarklet)
/api/capture   POST { url } + secret header
```

**Capture flow:** `capture.url` validates + dedupes + inserts `pending` + `scheduler.runAfter(0, internal.enrich.extract)` atomically. Client sees the placeholder card instantly; it reactively upgrades when enrichment lands.

---

## 7. Autotagging Pipeline (Deep Dive)

Runs in `internal.ai.tagAndEmbed` after extraction succeeds. Four stages:

### Stage 1 — Gather tagging input (per type)
| Type | Input to tagger |
|---|---|
| Article | title + first ~3,000 chars of extracted text + domain |
| X post | tweet text + author name/handle |
| IG post/reel | caption (og:description via ddinstagram) + author handle |
| Image | vision call first (chat model via OpenRouter: OCR + one-line description) → output feeds the same tagger |

### Stage 2 — Deterministic tags (free, no LLM)
- Content type: `#article`, `#tweet`, `#reel`, `#note`, `#image`
- Domain-derived: `#instagram`, `#twitter`, `#github`, `#substack`…
- Author handle as tag: `@naval`

### Stage 3 — Single combined LLM call (via OpenRouter)
One chat request produces summary + tags together:

```
POST https://openrouter.ai/api/v1/chat/completions
model: ${CHAT_MODEL}   // env: e.g. openai/gpt-4o-mini, google/gemini-2.0-flash, or a :free model

System: You organize a personal knowledge base. Given content,
return JSON: { "summary": string (≤2 sentences),
               "tags": string[] (2–5, lowercase, singular).
Prefer reusing tags from the user's existing vocabulary:
{existing_top_tags}. Never invent near-duplicates of them. }
User: {title} \n\n {content_truncated}
```

**Vocabulary steering** is the key trick: inject the user's top ~50 existing tags (by `useCount`), so the model writes `javascript` not `js`, keeping your tag cloud clean over time.

Post-processing: lowercase → trim → synonym map (`ml→machine-learning`) → dedupe → upsert into `tags` (increment `useCount`).

### Stage 4 — Embedding & extras
- Embedding via OpenRouter `POST /api/v1/embeddings` (`openai/text-embedding-3-small`, 1536-dim) on `title + summary + contentText[:2000]` → written to `items.embedding` (picked up by the vector index). Batch-capable; deterministic output makes caching by URL hash safe.
- `node-vibrant` on thumbnail → `dominantColors[]`
- Reading time from word count

**Cost:** ~1–2k input tokens/item → ≈ $0.0003 per save → **$0.30 per 1,000 saves**.

---

## 8. Mobile App (Expo)

**Screens:**
1. **Home grid** — masonry cards, pull-to-refresh, infinite scroll (reactive via `useQuery`)
2. **Capture** — paste URL, quick note, photo
3. **Search** — hybrid search + tag filter
4. **Item detail** — reader mode (articles), embed (X/IG), image viewer

**Sharing into the app (the critical feature):**
- **Android:** `intentFilters` in `app.json` handle `ACTION_SEND` text/URLs → app opens with shared URL → `capture.url`.
- **iOS:** `expo-share-extension` config plugin adds a Share Extension target → shared URL goes straight to Convex via the `/api/capture` httpAction (works without fully opening the app).
- Both paths toast "Saved to MindVault" and never block the user.

---

## 9. Design Language (from mymind research)

- Masonry card grid; every card styled by its **type** (article = hero image + headline; tweet = avatar + text + media; IG = embed/screenshot; note = paper texture; image = full-bleed)
- Calm editorial aesthetic: generous whitespace, serif display type (*Instrument Serif* / *Newsreader*) + clean sans body (*Inter*), muted palette, dark mode first-class
- **No folders, no dropdowns** — search bar is the primary navigation
- Micro-moments: soft card hover, quiet save animation, "Serendipity" shuffle button
- Zero notifications, zero badges

---

## 10. Build Phases

| Phase | Scope | You end up with |
|---|---|---|
| **1. Capture & Browse** | Monorepo scaffold, Convex project, single-user auth, web UI: paste URL / write note → capture mutation → enrich pipeline (readability, fxtwitter, ddinstagram extractors, thumbnails → File Storage) → type-aware masonry card grid with live updates | A working product: save articles/tweets/IG posts from web, browse them beautifully |
| **2. AI + Search** | OpenRouter integration: auto-tags, summaries, embeddings; full-text search + filters (type/domain/tag/color); hybrid semantic search; reader mode; vision OCR for images | The "magic": it organizes itself and finds anything by meaning |
| **3. Mobile (Expo, Android-first)** | Expo app: grid, search, capture screens on same reactive backend; Android `ACTION_SEND` intent filter (share from any app); EAS dev build | Save from your phone in 2 taps; everything syncs live |
| **4. Delight** | Serendipity resurfacing, Top of Mind pins, Spaces (smart collections), highlights, dark mode polish; optional: iOS share extension, browser extension | The mymind feel, complete |

Each phase ships something usable on its own. Nothing in Phase 1 depends on later phases.

---

## 11. Deployment & Cost (all free-tier)

| Concern | Service | Free tier fit |
|---|---|---|
| Web UI | Vercel Hobby | Non-commercial single-user |
| Entire backend | Convex Free | 1M fn calls/mo (we'll use ~15k), 20 GB-hr actions, 0.5GB DB, 1GB files |
| Email auth | Resend / Convex Auth | 100/day free |
| AI | OpenRouter (chat + vision + embeddings) | `:free` chat models → tagging can cost $0; embeddings ~$0.02/1M tokens; set spend cap in OpenRouter dashboard |

**Watch-outs:**
- **File egress (1GB/mo)** is the tightest limit → compress thumbnails to ~40KB webp, lazy-load, and if needed move images to R2 via Convex's official Cloudflare R2 component (10GB free).
- **0.5GB DB** ≈ several years of text items at personal volume.
- Daily Convex **cron** (`internal.retry.stale`) re-enqueues items stuck in `pending` > 15 min.

### Environment variables (Convex dashboard)
```
OPENROUTER_API_KEY=            # one key: chat, vision, embeddings
CHAT_MODEL=                    # e.g. openai/gpt-4o-mini | google/gemini-2.0-flash | meta-llama/...:free
EMBEDDING_MODEL=               # e.g. openai/text-embedding-3-small
EMBEDDING_DIMENSIONS=1536
CAPTURE_SECRET=                # for httpAction share-extension endpoint
ALLOWED_EMAIL=
AUTH_*                         # Convex Auth / Clerk keys
```

---

## 12. Key Risks & Mitigations

| Risk | Mitigation |
|---|---|
| IG/X block scraping | Embeds for playback + ddinstagram for IG metadata; never depend on their APIs |
| fxtwitter goes down | Abstract behind `extractors/` module; fallback to official embed widget |
| Convex lock-in | Data export supported; `extractors/` + AI modules stay framework-agnostic |
| File egress cap | Compressed webp thumbs; R2 component upgrade path |
| 1 MiB doc limit | Large HTML → File Storage, doc keeps text + storage ref |
| AI cost creep | `:free` OpenRouter models available; cache by URL hash; embeddings only for text-bearing items |
| OpenRouter outage/rate limits | Single dependency, but model routing + fallbacks built in; pipeline retries via Convex scheduler |
| Scope creep | The phases above; nothing in v1 beyond single-user capture/search |
