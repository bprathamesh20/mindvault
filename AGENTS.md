# MindVault — Agent Handbook

Instructions for AI coding agents (and humans) working on this repo.
Product vision & roadmap: [`SPEC.md`](./SPEC.md) · User-facing docs: [`README.md`](./README.md)

## What this is

A private, single-user, AI-organized personal knowledge base ("mymind clone").
Save articles, X posts, Instagram reels, images and notes; an async pipeline
extracts, thumbnails, tags, summarizes and embeds everything. Retrieval is via
hybrid search — never folders.

**Stack:** Convex (entire backend) · Next.js 16 web · Expo SDK 57 Android app ·
OpenRouter (chat + embeddings).

## Repo map

```
mindvault/
├── SPEC.md                  # product spec, phases, data model, decisions
├── apps/web/
│   ├── convex/              # THE BACKEND — all server logic lives here
│   │   ├── schema.ts        # items/tags/itemTags/spaces + search & vector indexes
│   │   ├── auth.ts          # Convex Auth, single-passphrase ConvexCredentials provider
│   │   ├── items.ts         # public: list/captureUrl/captureNote/get/update/remove
│   │   ├── pipeline.ts      # "use node" actions: extractors + cron sweep
│   │   ├── pipelineDb.ts    # internal queries/mutations for the pipeline
│   │   ├── ai.ts            # "use node" action: OpenRouter summary+tags+embedding
│   │   ├── aiDb.ts          # internal persistence for AI results, tag upserts
│   │   ├── search.ts        # public hybrid search action (FTS + vector + RRF)
│   │   ├── searchDb.ts      # internal FTS query + card hydration
│   │   └── crons.ts         # hourly sweep of stuck pending items
│   └── src/                 # Next.js UI (capture bar, grid, cards, reader /item/[id])
└── apps/mobile/             # Expo app; imports web's convex/_generated/api directly
```

## Commands

| Task | Command | Where |
|---|---|---|
| Install everything | `pnpm install` | repo root |
| Backend dev (pushes on save) | `npx convex dev` | `apps/web` |
| Web dev | `pnpm dev --port 3100` | `apps/web` |
| Web typecheck / lint / build | `npx tsc --noEmit` / `pnpm lint` / `pnpm build` | `apps/web` |
| Push backend without login | `CONVEX_AGENT_MODE=anonymous npx convex dev --once` | `apps/web` |
| Mobile dev | `npx expo start` (press `a`) | `apps/mobile` |
| Mobile typecheck (no device needed) | `npx tsc --noEmit` | `apps/mobile` |
| Mobile bundle verification | `npx expo export --platform android` then delete `dist/` | `apps/mobile` |

Port 3000 is often occupied on this machine — run web on **3100**.

## Environment variables

Convex env vars are **per deployment**, set via `npx convex env set NAME=VALUE`
(dashboard for cloud). ⚠️ `.env.local` is NOT auto-synced to anonymous local
deployments — set them explicitly with the CLI. Use the `"NAME=$VALUE"` form
(leading `-` in values parses as a flag otherwise).

| Var | Purpose |
|---|---|
| `PASSPHRASE` | the only credential (single-user app) |
| `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` | Convex Auth signing (generate headlessly with `jose`, see .agents/skills/convex-auth) |
| `OPENROUTER_API_KEY` | one key for chat + embeddings |
| `CHAT_MODEL` | default `deepseek/deepseek-v4-flash` |
| `EMBEDDING_MODEL` | `openai/text-embedding-3-small` (1536 dims — must match schema vectorIndex) |
| `NEXT_PUBLIC_CONVEX_URL` | written by `npx convex dev` into `apps/web/.env.local` |
| `EXPO_PUBLIC_CONVEX_URL` | in `apps/mobile/.env.local`; emulator: `http://10.0.2.2:3210` |

## Architecture rules

### Convex (read `apps/web/convex/_generated/ai/guidelines.md` first — always current)

- Object-form functions with **args AND returns validators** on every function.
- Imports: `query/mutation/action/internalQuery/internalMutation/internalAction`
  from `./_generated/server`; `api`/`internal` from `./_generated/api`.
- **Public functions are filtered OUT of the `internal` object** (`FilterApi`).
  If `internal.x.y` doesn't typecheck, the function is probably registered public.
- `"use node"` only at the top of action-only files. A file with `"use node"`
  can never export queries/mutations. Mutations cannot fetch; actions cannot
  touch `ctx.db`. Pattern: **mutation → action → mutation**, glued by
  `ctx.scheduler.runAfter(...)` (durable queue).
- Don't call `internal.sameFile.fn` from a file — TS circularity errors. Split
  queries/mutations into a sibling file (see `search.ts` ↔ `searchDb.ts`,
  `ai.ts` ↔ `aiDb.ts`, `pipeline.ts` ↔ `pipelineDb.ts`).
- Index, don't filter. Every read path needs an index in schema.ts. Bounded
  reads only (`.take(n)` / `.paginate`). Index names include all fields
  (`by_status_and_savedAt`).
- Storage: store `Id<"_storage">` in docs, call `ctx.storage.getUrl()` at read
  time. Never store URLs.
- Vector index dimensions are hardcoded to **1536** in schema.ts — if you change
  EMBEDDING_MODEL, dimensions must match or the index silently skips docs.

### Capture pipeline (memorize this flow)

```
captureUrl (mutation, instant ack)
  → insert {status:"pending"} + schedule enrich
enrich (node action): extract by domain → download thumbnail (NEVER a video file)
  → persistMeta (mutation, status:"ready") → schedule enrichAi
enrichAi (node action): OpenRouter chat {summary,tags} + embedding
  → persistAi (mutation: summary/searchText/embedding + tag upserts)
failures: markFailed → retry ×3 with backoff → status:"failed" (graceful card)
crons.ts sweeps pending >15min hourly
```

Re-pasting a URL: `duplicate` if ready, `retrying` (reset+re-enrich) if failed.

## Extractor notes (hard-won)

- **X/Twitter**: `api.fxtwitter.com/i/status/{id}` (the `/i/` form works for all
  URL shapes). Author comes from the response (`screen_name`), never from the
  URL. Videos/GIFs: use `thumbnail_url` poster frame — storing the `.mp4` as an
  image produces broken cards. Quoted posts live under `tweet.quote`.
- **Instagram**: ddinstagram is DEAD (404s even for famous posts). Fetch
  `instagram.com/{pathname}` directly with UA `facebookexternalhit/1.1` — IG
  serves full og-tags to that crawler. Parse author from og:description
  (`- username on <date>: "caption"`).
- **Articles**: fetch → cheerio og-tags + Readability(`linkedom`) → fallback
  `r.jina.ai/{url}` (free reader). Store reader HTML in File Storage when >20KB.
- Thumbnails: skip silently on failure — extraction must never fail because of
  a missing image.

## AI models

- Chat: `deepseek/deepseek-v4-flash` is a **reasoning model** — emits ~500
  hidden reasoning tokens, so `max_tokens` must be ≥2000 (300 truncates JSON).
  Cheaper non-reasoning alternative verified working: `qwen/qwen3.7-flash`.
- Embeddings: `openai/text-embedding-3-small` via OpenRouter `/api/v1/embeddings`
  (batch-capable, deterministic → cacheable by URL hash).

## Verification checklist (before claiming done)

1. `npx tsc --noEmit` in `apps/web` AND `apps/mobile`
2. `pnpm lint` in `apps/web`
3. `pnpm build` in `apps/web`
4. Backend pushes clean: stop any running `convex dev`, then
   `CONVEX_AGENT_MODE=anonymous npx convex dev --once`
5. If mobile touched: `npx expo export --platform android`, then `rm -rf dist`

## Known gotchas

- Generated `convex/_generated/api.d.ts` can lag within the same `convex dev`
  run — re-run before trusting "does not exist" type errors.
- The local anonymous backend does NOT read `.env.local` (cloud dev deployments
  do). Set env vars explicitly.
- `useAction` comes from `convex/react`; `useConvexAuth` from
  `@convex-dev/auth/react`. Easy to swap by accident.
- React hooks lint (`react-hooks/set-state-in-effect`) forbids synchronous
  setState in effects — derive display state instead (see `page.tsx` search).
- Mobile share intents do NOT work in Expo Go — test with a dev build
  (`npx expo run:android`).
- No Android SDK on this machine; verify mobile via tsc + expo export only.
