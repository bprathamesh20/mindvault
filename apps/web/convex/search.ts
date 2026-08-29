import { v } from "convex/values";
import { action, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { cardValidator } from "./items";
import { itemTypeValidator, ItemType } from "./shared";

type Card = {
  id: Id<"items">;
  type: ItemType;
  url?: string;
  title?: string;
  author?: string;
  sourceDomain?: string;
  preview?: string;
  summary?: string;
  tags: string[];
  status: "pending" | "ready" | "failed";
  savedAt: number;
  thumbnailUrl?: string;
  embedJson?: unknown;
};

async function requireUserIdentity(ctx: {
  auth: { getUserIdentity(): Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export async function hybridSearch(
  ctx: ActionCtx,
  q: string,
  type?: ItemType,
): Promise<Card[]> {
  let embedding: number[] | undefined;
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      const embRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
          input: q,
        }),
      });
      if (embRes.ok) {
        const embJson = (await embRes.json()) as {
          data?: Array<{ embedding?: number[] }>;
        };
        embedding = embJson.data?.[0]?.embedding;
      }
    } catch {
      // fall back to FTS-only
    }
  }

  const ftsPage: { page: Id<"items">[] } = await ctx.runQuery(
    internal.searchDb.fts,
    {
      q,
      type,
      paginationOpts: { numItems: 30, cursor: null },
    },
  );

  let vecIds: Id<"items">[] = [];
  if (embedding && embedding.length === 1536) {
    const hits = type
      ? await ctx.vectorSearch("items", "by_embedding", {
          vector: embedding,
          limit: 30,
          filter: (f) => f.eq("type", type),
        })
      : await ctx.vectorSearch("items", "by_embedding", {
          vector: embedding,
          limit: 30,
        });
    const best = hits.reduce((m, h) => Math.max(m, h._score), 0);
    const floor = Math.max(0.25, best - 0.15);
    vecIds = hits.filter((h) => h._score >= floor).map((h) => h._id);
  }

  const K = 10;
  const scores = new Map<Id<"items">, number>();
  ftsPage.page.forEach((id, i) =>
    scores.set(id, (scores.get(id) ?? 0) + 1 / (K + i)),
  );
  vecIds.forEach((id, i) =>
    scores.set(id, (scores.get(id) ?? 0) + 1 / (K + i)),
  );
  const merged = [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 24)
    .map(([id]) => id);

  if (merged.length === 0) return [];

  const docs: Array<Card | null> = await ctx.runQuery(
    internal.searchDb.getByIds,
    { ids: merged },
  );
  const byId = new Map<Id<"items">, Card>();
  for (const d of docs) {
    if (d) byId.set(d.id, d);
  }
  return merged
    .map((id) => byId.get(id))
    .filter((d): d is Card => Boolean(d));
}

export const search = action({
  args: { q: v.string(), type: v.optional(itemTypeValidator) },
  returns: v.array(cardValidator),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const q = args.q.trim();
    if (q.length === 0) return [];
    return await hybridSearch(ctx, q, args.type);
  },
});
