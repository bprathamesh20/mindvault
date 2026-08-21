import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
  detectType,
  domainOf,
  itemTypeValidator,
  normalizeUrl,
} from "./shared";

const cardValidator = v.object({
  id: v.id("items"),
  type: itemTypeValidator,
  url: v.optional(v.string()),
  title: v.optional(v.string()),
  author: v.optional(v.string()),
  sourceDomain: v.optional(v.string()),
  preview: v.optional(v.string()),
  summary: v.optional(v.string()),
  tags: v.array(v.string()),
  status: v.union(
    v.literal("pending"),
    v.literal("ready"),
    v.literal("failed"),
  ),
  savedAt: v.number(),
  thumbnailUrl: v.optional(v.string()),
  embedJson: v.optional(v.any()),
});

export { cardValidator };

type IdentityLike = { tokenIdentifier: string } | null;

async function requireUserIdentity(ctx: {
  auth: { getUserIdentity(): Promise<IdentityLike> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const list = query({
  args: {
    paginationOpts: paginationOptsValidator,
    type: v.optional(itemTypeValidator),
    tag: v.optional(v.string()),
  },
  returns: paginationResultValidator(cardValidator),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);

    const toCard = async (doc: Doc<"items">) => {
      const thumbnailUrl = doc.thumbnailStorageId
        ? await ctx.storage.getUrl(doc.thumbnailStorageId)
        : undefined;
      const tagLinks = await ctx.db
        .query("itemTags")
        .withIndex("by_item", (q) => q.eq("itemId", doc._id))
        .take(6);
      const tags: string[] = [];
      for (const link of tagLinks) {
        const tag = await ctx.db.get(link.tagId);
        if (tag) tags.push(tag.name);
      }
      return {
        id: doc._id,
        type: doc.type,
        url: doc.url,
        title: doc.title,
        author: doc.author,
        sourceDomain: doc.sourceDomain,
        preview: doc.contentText?.slice(0, 400),
        summary: doc.summary,
        tags,
        status: doc.status,
        savedAt: doc.savedAt,
        thumbnailUrl: thumbnailUrl ?? undefined,
        embedJson: doc.embedJson,
      };
    };

    // Tag-filtered space view: paginate itemTags, hydrate items
    if (args.tag) {
      const tag = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", args.tag!))
        .unique();
      if (!tag) {
        return { page: [], isDone: true, continueCursor: "" };
      }
      const links = await ctx.db
        .query("itemTags")
        .withIndex("by_tag", (q) => q.eq("tagId", tag._id))
        .order("desc")
        .paginate(args.paginationOpts);
      const page = [];
      for (const link of links.page) {
        const doc = await ctx.db.get(link.itemId);
        if (!doc) continue;
        if (args.type && doc.type !== args.type) continue;
        page.push(await toCard(doc));
      }
      return {
        page,
        isDone: links.isDone,
        continueCursor: links.continueCursor,
      };
    }

    const baseQuery = args.type
      ? ctx.db
          .query("items")
          .withIndex("by_type_and_savedAt", (q) => q.eq("type", args.type!))
      : ctx.db.query("items").withIndex("by_savedAt");

    const result = await baseQuery.order("desc").paginate(args.paginationOpts);
    const page = [];
    for (const doc of result.page) {
      page.push(await toCard(doc));
    }
    return {
      page,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const captureUrl = mutation({
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
    await requireUserIdentity(ctx);
    let normalized: string;
    try {
      normalized = normalizeUrl(args.url);
    } catch {
      throw new Error("That doesn't look like a valid URL");
    }
    const result: {
      itemId: Id<"items">;
      outcome: "saved" | "duplicate" | "retrying";
    } = await ctx.runMutation(internal.pipelineDb.captureInternal, {
      url: normalized,
    });
    return result;
  },
});

export const captureNote = mutation({
  args: { text: v.string() },
  returns: v.id("items"),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const text = args.text.trim();
    if (text.length === 0) throw new Error("Note is empty");
    const itemId = await ctx.db.insert("items", {
      type: "note",
      contentText: text,
      title: text.split("\n")[0].slice(0, 80),
      status: "ready",
      savedAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.ai.enrichAi, { itemId });
    return itemId;
  },
});

export const get = query({
  args: { id: v.id("items") },
  returns: v.union(
    v.object({
      id: v.id("items"),
      type: itemTypeValidator,
      url: v.optional(v.string()),
      title: v.optional(v.string()),
      author: v.optional(v.string()),
      sourceDomain: v.optional(v.string()),
      contentText: v.optional(v.string()),
      summary: v.optional(v.string()),
      htmlUrl: v.optional(v.string()),
      thumbnailUrl: v.optional(v.string()),
      savedAt: v.number(),
    }),
    v.null(),
  ),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    const htmlUrl = doc.htmlStorageId
      ? await ctx.storage.getUrl(doc.htmlStorageId)
      : undefined;
    const thumbnailUrl = doc.thumbnailStorageId
      ? await ctx.storage.getUrl(doc.thumbnailStorageId)
      : undefined;
    return {
      id: doc._id,
      type: doc.type,
      url: doc.url,
      title: doc.title,
      author: doc.author,
      sourceDomain: doc.sourceDomain,
      contentText: doc.contentText,
      summary: doc.summary,
      htmlUrl: htmlUrl ?? undefined,
      thumbnailUrl: thumbnailUrl ?? undefined,
      savedAt: doc.savedAt,
    };
  },
});

export const updateTitle = mutation({
  args: { id: v.id("items"), title: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const title = args.title.trim().slice(0, 300);
    if (title.length === 0) throw new Error("Title cannot be empty");
    await ctx.db.patch(args.id, { title });
    return null;
  },
});

export const removeItem = mutation({
  args: { id: v.id("items") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const doc = await ctx.db.get(args.id);
    if (!doc) return null;
    if (doc.thumbnailStorageId) await ctx.storage.delete(doc.thumbnailStorageId);
    if (doc.htmlStorageId) await ctx.storage.delete(doc.htmlStorageId);
    await ctx.db.delete(args.id);
    return null;
  },
});
