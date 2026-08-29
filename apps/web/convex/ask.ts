import { v } from "convex/values";
import { action } from "./_generated/server";
import { cardValidator } from "./items";
import { hybridSearch } from "./search";

const ASK_MODEL = "z-ai/glm-5.3-flash";

// Convex redacts thrown errors on production deployments, so failures are
// returned as the answer instead — the client renders it verbatim.
const UNAVAILABLE =
  "The vault couldn't answer just now. The closest saves are below.";

async function requireUserIdentity(ctx: {
  auth: { getUserIdentity(): Promise<{ tokenIdentifier: string } | null> };
}) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Unauthenticated");
  return identity;
}

export const askVault = action({
  args: { q: v.string() },
  returns: v.object({
    answer: v.string(),
    sources: v.array(cardValidator),
  }),
  handler: async (ctx, args) => {
    await requireUserIdentity(ctx);
    const q = args.q.trim();
    if (q.length === 0) {
      return { answer: "Ask something about what you've saved.", sources: [] };
    }

    const hits = await hybridSearch(ctx, q);
    const sources = hits.slice(0, 10);
    if (sources.length === 0) {
      return {
        answer: "Nothing in your vault matches that.",
        sources: [],
      };
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return {
        answer:
          "Ask isn't configured on this deployment — set OPENROUTER_API_KEY.",
        sources,
      };
    }

    const context = sources
      .map((s, i) => {
        const title = s.title ?? "(untitled)";
        const body = (s.summary ?? s.preview ?? "").slice(0, 700);
        return `[${i + 1}] ${s.type}: ${title}\n${body}`;
      })
      .join("\n\n")
      .slice(0, 8000);

    let chatRes: Response;
    try {
      chatRes = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: process.env.ASK_MODEL ?? ASK_MODEL,
          temperature: 0.3,
          max_tokens: 2500,
          reasoning: { effort: "low" },
          messages: [
            {
              role: "system",
              content:
                "You answer questions about the user's private vault. Use only the numbered sources. If they don't contain the answer, say so. Be concise. Mention source titles when you cite them. Never invent memories.",
            },
            {
              role: "user",
              content: `Question: ${q}\n\nSources:\n${context}`,
            },
          ],
        }),
      });
    } catch {
      return { answer: UNAVAILABLE, sources };
    }

    if (!chatRes.ok) {
      return { answer: UNAVAILABLE, sources };
    }

    const chatJson = (await chatRes.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const answer = chatJson.choices?.[0]?.message?.content?.trim();
    if (!answer) {
      return { answer: UNAVAILABLE, sources };
    }

    return { answer, sources };
  },
});
