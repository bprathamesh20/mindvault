import { v } from "convex/values";
import { internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import schema from "./schema";
import {
  detectType,
  domainOf,
  itemTypeValidator,
  titleFromFilename,
} from "./shared";

export const captureInternal = internalMutation({
  args: { url: v.string() },
  returns: v.object({
    itemId: v.id("items"),
    outcome: v.union(
      v.literal("saved"),
      v.literal("duplicate"),
      v.literal("retrying"),
    ),
  }),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("items")
      .withIndex("by_url", (q) => q.eq("url", args.url))
      .unique();
    if (existing) {
      // Failed → full retry. Ready but never AI-enriched (old/pre-AI items,
      // or types added later) → re-run the pipeline so it gets tags/embedding.
      const needsAi =
        existing.status === "ready" &&
        !existing.summary &&
        !(existing.embedding && existing.embedding.length > 0);
      if (existing.status === "failed" || needsAi) {
        await ctx.db.patch(existing._id, {
          status: "pending",
          enrichAttempts: 0,
          failureReason: undefined,
        });
        await ctx.scheduler.runAfter(0, internal.pipeline.enrich, {
          itemId: existing._id,
        });
        return { itemId: existing._id, outcome: "retrying" as const };
      }
      return { itemId: existing._id, outcome: "duplicate" as const };
    }

    const itemId = await ctx.db.insert("items", {
      type: detectType(args.url),
      url: args.url,
      sourceDomain: domainOf(args.url),
      status: "pending",
      enrichAttempts: 0,
      savedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.enrich, { itemId });
    return { itemId, outcome: "saved" as const };
  },
});

export const insertPendingDocument = internalMutation({
  args: {
    storageId: v.id("_storage"),
    filename: v.string(),
  },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    return await ctx.db.insert("items", {
      type: "document",
      title: titleFromFilename(args.filename),
      fileStorageId: args.storageId,
      status: "pending",
      enrichAttempts: 0,
      savedAt: Date.now(),
      embedJson: { filename: args.filename },
    });
  },
});

export const getItem = internalQuery({
  args: { itemId: v.id("items") },
  returns: v.union(schema.doc("items"), v.null()),
  handler: async (ctx, args) => {
    return await ctx.db.get(args.itemId);
  },
});

export const persistMeta = internalMutation({
  args: {
    itemId: v.id("items"),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    contentText: v.optional(v.string()),
    htmlStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    thumbWidth: v.optional(v.number()),
    thumbHeight: v.optional(v.number()),
    embedJson: v.optional(v.any()),
    sourceDomain: v.optional(v.string()),
    skipAi: v.optional(v.boolean()),
    // Extraction can reclassify an item (e.g. article → product) once the
    // page's own metadata says what it actually is.
    type: v.optional(itemTypeValidator),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    const { itemId: _itemId, skipAi, type, ...patch } = args;
    await ctx.db.patch(args.itemId, {
      ...patch,
      // type is required — never let an undefined arg unset it.
      ...(type !== undefined ? { type } : {}),
      status: "ready",
    });
    if (!skipAi) {
      await ctx.scheduler.runAfter(0, internal.ai.enrichAi, {
        itemId: args.itemId,
      });
    }
    return null;
  },
});

export const patchContent = internalMutation({
  args: {
    itemId: v.id("items"),
    contentText: v.string(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    await ctx.db.patch(args.itemId, { contentText: args.contentText });
    return null;
  },
});

export const kickAi = internalMutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    await ctx.scheduler.runAfter(0, internal.ai.enrichAi, {
      itemId: args.itemId,
    });
    return null;
  },
});

export const replaceThumb = internalMutation({
  args: {
    itemId: v.id("items"),
    thumbnailStorageId: v.id("_storage"),
    thumbWidth: v.number(),
    thumbHeight: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item) return null;
    await ctx.db.patch(args.itemId, {
      thumbnailStorageId: args.thumbnailStorageId,
      thumbWidth: args.thumbWidth,
      thumbHeight: args.thumbHeight,
    });
    return null;
  },
});

export const thumbsNeedingResize = internalQuery({
  args: {},
  returns: v.array(
    v.object({
      itemId: v.id("items"),
      thumbnailStorageId: v.id("_storage"),
    }),
  ),
  handler: async (ctx) => {
    const docs = await ctx.db.query("items").withIndex("by_savedAt").take(80);
    return docs
      .filter(
        (doc) =>
          doc.thumbnailStorageId !== undefined &&
          (doc.thumbWidth === undefined || doc.thumbHeight === undefined),
      )
      .slice(0, 20)
      .map((doc) => ({
        itemId: doc._id,
        thumbnailStorageId: doc.thumbnailStorageId!,
      }));
  },
});

export const markFailed = internalMutation({
  args: { itemId: v.id("items"), reason: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status === "ready") return null;
    const attempts = (item.enrichAttempts ?? 0) + 1;
    if (attempts >= 3) {
      await ctx.db.patch(args.itemId, {
        status: "failed",
        enrichAttempts: attempts,
        failureReason: args.reason.slice(0, 500),
      });
      return null;
    }
    await ctx.db.patch(args.itemId, { enrichAttempts: attempts });
    await ctx.scheduler.runAfter(
      attempts * 2 * 60 * 1000,
      internal.pipeline.enrich,
      { itemId: args.itemId },
    );
    return null;
  },
});

export const getStalePending = internalQuery({
  args: { before: v.number() },
  returns: v.array(v.id("items")),
  handler: async (ctx, args) => {
    const stale = await ctx.db
      .query("items")
      .withIndex("by_status_and_savedAt", (q) =>
        q.eq("status", "pending").lt("savedAt", args.before),
      )
      .take(50);
    return stale
      .filter((doc) => (doc.enrichAttempts ?? 0) < 3)
      .map((doc) => doc._id);
  },
});

export const scheduleRetry = internalMutation({
  args: { itemId: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.itemId);
    if (!item || item.status !== "pending") return null;
    await ctx.db.patch(args.itemId, {
      enrichAttempts: (item.enrichAttempts ?? 0) + 1,
    });
    await ctx.scheduler.runAfter(0, internal.pipeline.enrich, {
      itemId: args.itemId,
    });
    return null;
  },
});
