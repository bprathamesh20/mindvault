import { convexAuth } from "@convex-dev/auth/server";
import { ConvexCredentials } from "@convex-dev/auth/providers/ConvexCredentials";
import { internal } from "./_generated/api";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    ConvexCredentials({
      id: "passphrase",
      authorize: async (credentials, ctx) => {
        const passphrase = credentials?.passphrase;
        const expected = process.env.PASSPHRASE;
        if (
          typeof passphrase !== "string" ||
          passphrase.length === 0 ||
          !expected ||
          passphrase !== expected
        ) {
          return null;
        }
        const userId = await ctx.runMutation(internal.users.getOrCreate, {});
        return { userId };
      },
    }),
  ],
});
