# MindVault

A private, AI-organized personal knowledge base. **Remember everything. Organize nothing.**

Save articles, X posts, Instagram posts/reels, images, and notes into one calm place — an async pipeline enriches every item (thumbnail, clean text, tags) while you keep scrolling.

## Status: Phase 2 — AI + Search ✅ · Phase 3 — Mobile ✅

See [SPEC.md](../SPEC.md) for the full product spec and roadmap.

## Quick start (web)

```bash
# from repo root
pnpm install

# terminal 1 — Convex backend (first run: creates a local anonymous deployment)
cd apps/web
npx convex dev

# terminal 2 — web app
cd apps/web
pnpm dev
```

Open http://localhost:3000 (or the port printed by `pnpm dev`), enter your passphrase and start saving.

**Passphrase:** set via `PASSPHRASE` in `apps/web/.env.local` (dev default: `change-me-dev`). It's the only credential — this is a single-user app by design.

> `npx convex dev` writes `NEXT_PUBLIC_CONVEX_URL` to `.env.local` automatically.
> For a persistent personal deployment run `npx convex login` + `npx convex deploy` later.

## Quick start (mobile, Android-first)

```bash
cd apps/mobile
# point at your backend — see .env.local for options:
#   emulator + local backend: http://10.0.2.2:3210
#   Convex cloud:             https://<deployment>.convex.cloud
npx expo start          # press "a" for Android emulator
```

- **UI works in Expo Go**, but the **share-sheet capture needs a dev build**: `npx expo run:android` (Android Studio required) or EAS Build.
- Share any link → MindVault → it saves instantly.

## How a save works

```
paste URL ──► captureUrl mutation ──► insert {status: pending} ──► schedule enrich action
                                                                        │
card appears instantly ◄── reactive subscription ◄── persistMeta ◄── extract (fxtwitter /
(placeholder → rich)                                + store thumb      IG og-tags / readability)
                                                                        │
tags + summary + embedding ◄── persistAi ◄── OpenRouter (chat + embeddings)
```

| Content | Extractor |
|---|---|
| `x.com` / `twitter.com` | fxtwitter API (free, no key) → text, author, media, quoted posts |
| `instagram.com` posts/reels | Instagram og-tags via crawler UA → caption, author, thumbnail |
| everything else | fetch → Mozilla Readability (+`linkedom`) → fallback `r.jina.ai` |

Failures retry with backoff (3 attempts), then render as a graceful "couldn't save" card. An hourly cron re-enqueues items stuck in `pending`.

## Stack

- **Backend:** Convex (DB + reactive queries + durable scheduler + file storage + auth + vector search)
- **Web:** Next.js 16, Tailwind v4, TypeScript
- **Mobile:** Expo SDK 57 (expo-router), shares the same Convex backend
- **Auth:** Convex Auth, single passphrase (`ConvexCredentials` provider)
- **AI:** OpenRouter — one key for chat (`deepseek/deepseek-v4-flash`) + embeddings (`text-embedding-3-small`)

## Repo layout

```
mindvault/
├── SPEC.md            # product & technical spec
├── apps/web/          # Next.js app + convex/ backend functions
│   ├── convex/        # schema, auth, items, pipeline, ai, search, crons
│   └── src/           # app router UI (capture, grid, search, reader)
└── apps/mobile/       # Expo app (grid, search, capture, share intent)
```
