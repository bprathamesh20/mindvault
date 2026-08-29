import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import type { Id } from "./_generated/dataModel";
import { cardValidator } from "./items";
import { itemTypeValidator, ItemType } from "./shared";

export const fts = internalQuery({
  args: {
    q: v.string(),
    type: v.optional(itemTypeValidator),
    paginationOpts: paginationOptsValidator,
  },
  returns: paginationResultValidator(v.id("items")),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("items")
      .withSearchIndex("search_text", (q) => {
        let s = q.search("searchText", args.q);
        if (args.type) s = s.eq("type", args.type);
        return s;
      })
      .paginate(args.paginationOpts);
    return {
      page: result.page.map((doc) => doc._id),
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

export const getByIds = internalQuery({
  args: { ids: v.array(v.id("items")) },
  returns: v.array(v.union(v.object(cardValidator.fields), v.null())),
  handler: async (ctx, args) => {
    const out: Array<
      | {
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
        }
      | null
    > = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (!doc) {
        out.push(null);
        continue;
      }
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
      out.push({
        id: doc._id,
        type: doc.type,
        url: doc.url,
        title: doc.title,
        author: doc.author,
        sourceDomain: doc.sourceDomain,
        preview:
          doc.type === "document"
            ? doc.contentText?.slice(0, 800)
            : doc.contentText?.slice(0, 400),
        summary: doc.summary,
        tags,
        status: doc.status,
        savedAt: doc.savedAt,
        thumbnailUrl: thumbnailUrl ?? undefined,
        embedJson: doc.embedJson,
      });
    }
    return out;
  },
});
