import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

async function requireUserIdentity(ctx: {
  auth: { getUserIdentity(): Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const list = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id("spaces"),
      name: v.string(),
      type: v.optional(
        v.union(
          v.literal("article"),
          v.literal("tweet"),
          v.literal("instagram"),
          v.literal("image"),
          v.literal("note"),
          v.literal("link"),
        ),
      ),
      tag: v.optional(v.string()),
    }),
  ),
  handler: async (ctx) => {
    await requireUserIdentity(ctx);
    const docs = await ctx.db.query("spaces").withIndex("by_name").take(50);
    return docs.map((d) => ({
      id: d._id,
      name: d.name,
      type: d.type,
      tag: d.tag,
    }));
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    type: v.optional(
      v.union(
        v.literal("article"),
        v.literal("tweet"),
        v.literal("instagram"),
        v.literal("image"),
        v.literal("note"),
        v.literal("link"),
      ),
    ),
    tag: v.optional(v.string()),
  },
  returns: v.id("spaces"),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const name = args.name.trim().slice(0, 40);
    if (name.length === 0) throw new Error("Space needs a name");
    const count = await ctx.db.query("spaces").take(50);
    if (count.length >= 50) throw new Error("Too many spaces");
    return await ctx.db.insert("spaces", {
      name,
      type: args.type,
      tag: args.tag,
    });
  },
});

export const remove = mutation({
  args: { id: v.id("spaces") },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    await ctx.db.delete(args.id);
    return null;
  },
});
