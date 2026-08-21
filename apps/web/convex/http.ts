import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { auth } from "./auth";
import { normalizeUrl } from "./shared";

const http = httpRouter();

auth.addHttpRoutes(http);

// Machine capture endpoint (mobile share extension, bookmarklets, scripts).
// Auth: Authorization: Bearer <CAPTURE_SECRET>
http.route({
  path: "/api/capture",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const secret = process.env.CAPTURE_SECRET;
    const provided = req.headers
      .get("Authorization")
      ?.replace(/^Bearer\s+/i, "");
    if (!secret || !provided || provided !== secret) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = (await req.json().catch(() => null)) as {
      url?: unknown;
    } | null;
    if (!body || typeof body.url !== "string" || body.url.length === 0) {
      return new Response(JSON.stringify({ error: "url required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    let normalized: string;
    try {
      normalized = normalizeUrl(body.url);
    } catch {
      return new Response(JSON.stringify({ error: "invalid url" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const result = await ctx.runMutation(internal.pipelineDb.captureInternal, {
      url: normalized,
    });
    return new Response(JSON.stringify(result), {
      status: result.outcome === "saved" ? 201 : 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default http;
