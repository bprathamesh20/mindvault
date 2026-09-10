import { v } from "convex/values";
import { internalQuery } from "./_generated/server";
import {
  paginationOptsValidator,
  paginationResultValidator,
} from "convex/server";
import { cardValidator, hydrateCard } from "./items";
import { itemTypeValidator } from "./shared";

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
    const docs = await Promise.all(args.ids.map((id) => ctx.db.get(id)));
    return await Promise.all(
      docs.map((doc) => (doc ? hydrateCard(ctx, doc) : Promise.resolve(null))),
    );
  },
});
