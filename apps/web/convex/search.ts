import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { cardValidator } from "./items";
import { itemTypeValidator } from "./shared";

async function requireUserIdentity(ctx: {
  auth: { getUserIdentity(): Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const search = action({
  args: { q: v.string(), type: v.optional(itemTypeValidator) },
  returns: v.array(cardValidator),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const q = args.q.trim();
    if (q.length === 0) return [];

    // Semantic half: embed the query (best-effort)
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
            model:
              process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
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

    // Keyword half
    const ftsPage: { page: Id<"items">[] } = await ctx.runQuery(
      internal.searchDb.fts,
      {
        q,
        type: args.type,
        paginationOpts: { numItems: 30, cursor: null },
      },
    );

    // Vector half
    let vecIds: Id<"items">[] = [];
    if (embedding && embedding.length === 1536) {
      const hits = args.type
        ? await ctx.vectorSearch("items", "by_embedding", {
            vector: embedding,
            limit: 30,
            filter: (f) => f.eq("type", args.type!),
          })
        : await ctx.vectorSearch("items", "by_embedding", {
            vector: embedding,
            limit: 30,
          });
      vecIds = hits.map((h) => h._id);
    }

    // Reciprocal-rank fusion
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

    const docs: Array<
      | {
          id: Id<"items">;
          type: "article" | "tweet" | "instagram" | "image" | "note" | "link";
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
        }
      | null
    > = await ctx.runQuery(internal.searchDb.getByIds, { ids: merged });
    const byId = new Map<Id<"items">, NonNullable<(typeof docs)[number]>>();
    for (const d of docs) {
      if (d) byId.set(d.id, d);
    }
    return merged
      .map((id) => byId.get(id))
      .filter((d): d is NonNullable<typeof d> => Boolean(d));
  },
});
