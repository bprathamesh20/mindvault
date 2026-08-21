import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import schema from "./schema";

export const getForAi = internalQuery({
  args: { itemId: v.id("items") },
  returns: v.union(schema.doc("items"), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.itemId);
  },
});

export const getTopTags = internalQuery({
  args: { limit: v.number() },
  returns: v.array(v.string()),
  handler: async (ctx, args) => {
    const tags = await ctx.db
      .query("tags")
      .withIndex("by_useCount")
      .order("desc")
      .take(args.limit);
    return tags.map((t) => t.name);
  },
});

export const persistAi = internalMutation({
  args: {
    itemId: v.id("items"),
    summary: v.optional(v.string()),
    tags: v.array(v.string()),
    searchText: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;

    // Link tags (upsert by name, count usage)
    const tagIds = [];
    for (const name of args.tags) {
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", name))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { useCount: existing.useCount + 1 });
        tagIds.push(existing._id);
      } else {
        const id = await ctx.db.insert("tags", { name, useCount: 1 });
        tagIds.push(id);
      }
    }
    const oldLinks = await ctx.db
      .query("itemTags")
      .withIndex("by_item", (q) => q.eq("itemId", args.itemId))
      .collect();
    for (const link of oldLinks) {
      await ctx.db.delete("itemTags", link._id);
    }
    for (const tagId of tagIds) {
      await ctx.db.insert("itemTags", { itemId: args.itemId, tagId });
    }

    await ctx.db.patch(args.itemId, {
      summary: args.summary,
      searchText: args.searchText,
      embedding: args.embedding,
    });
    return null;
  },
});

export const scheduleAiRetry = internalMutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    const attempts = (item.aiAttempts ?? 0) + 1;
    if (attempts > 2) return null;
    await ctx.db.patch(args.itemId, { aiAttempts: attempts });
    await ctx.scheduler.runAfter(5 * 60 * 1000, internal.ai.enrichAi, {
      itemId: args.itemId,
    });
    return null;
  },
});
