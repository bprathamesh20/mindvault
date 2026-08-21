import { internalMutation } from "./_generated/server";

export const getOrCreate = internalMutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("users").take(1);
    const first = existing[0];
    if (first) return first._id;
    return await ctx.db.insert("users", {});
  },
});
