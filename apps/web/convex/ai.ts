"use node";

import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";

type ItemDoc = {
  type: string;
  title?: string;
  contentText?: string;
  url?: string;
};

function buildTaggingInput(item: ItemDoc): string | undefined {
  const title = item.title ?? "";
  const text = item.contentText ?? "";
  switch (item.type) {
    case "article":
      return `${title}\n\n${text}`.slice(0, 4000).trim() || undefined;
    case "tweet":
    case "instagram":
    case "youtube":
    case "note":
    case "link":
    case "image":
      return `${title}${text ? `\n\n${text}` : ""}`.slice(0, 6000).trim() || undefined;
    default:
      return undefined;
  }
}

export const enrichAi = internalAction({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.runQuery(internal.aiDb.getForAi, {
      itemId: args.itemId,
    });
    if (!item) return null;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return null; // AI disabled — items stay untagged but usable

    const input = buildTaggingInput(item);
    if (!input) return null;

    try {
      const topTags = await ctx.runQuery(internal.aiDb.getTopTags, {
        limit: 50,
      });

      // One chat call → summary + tags (vocabulary-steered)
      const chatRes = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.CHAT_MODEL ?? "openai/gpt-4o-mini",
            temperature: 0.2,
            max_tokens: 2000,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content:
                  'You organize a personal knowledge base. Given content, respond with JSON only: {"summary": string (max 2 sentences), "tags": string[] (2-5 tags, lowercase, singular)}. Prefer reusing tags from the user\'s existing vocabulary when they fit; never invent near-duplicates of them.',
              },
              {
                role: "user",
                content: `Existing tags: ${JSON.stringify(topTags)}\n\nContent:\n${input}`,
              },
            ],
          }),
        },
      );
      if (!chatRes.ok) {
        throw new Error(`OpenRouter chat ${chatRes.status}`);
      }
      const chatJson = (await chatRes.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const raw = chatJson.choices?.[0]?.message?.content ?? "{}";
      let parsed: { summary?: unknown; tags?: unknown };
      try {
        parsed = JSON.parse(raw);
      } catch {
        throw new Error("AI returned non-JSON");
      }
      const summary =
        typeof parsed.summary === "string"
          ? parsed.summary.slice(0, 500)
          : undefined;
      const tags = Array.isArray(parsed.tags)
        ? parsed.tags
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim().toLowerCase())
            .filter((t) => t.length > 1 && t.length < 30)
            .slice(0, 5)
        : [];

      // Embedding for semantic search
      let embedding: number[] | undefined;
      try {
        const embRes = await fetch("https://openrouter.ai/api/v1/embeddings", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: process.env.EMBEDDING_MODEL ?? "openai/text-embedding-3-small",
            input: `${item.title ?? ""} ${summary ?? ""} ${input}`
              .slice(0, 6000)
              .trim(),
          }),
        });
        if (embRes.ok) {
          const embJson = (await embRes.json()) as {
            data?: Array<{ embedding?: number[] }>;
          };
          embedding = embJson.data?.[0]?.embedding;
        }
      } catch {
        // embeddings are optional — search still works via FTS
      }

      const searchText = [
        item.title,
        summary,
        tags.join(" "),
        item.contentText?.slice(0, 20000),
      ]
        .filter(Boolean)
        .join("\n");

      await ctx.runMutation(internal.aiDb.persistAi, {
        itemId: args.itemId,
        summary,
        tags,
        searchText,
        embedding,
      });
    } catch (error) {
      console.log("[aiEnrich] failed:", error);
      await ctx.runMutation(internal.aiDb.scheduleAiRetry, {
        itemId: args.itemId,
      });
    }
    return null;
  },
});
