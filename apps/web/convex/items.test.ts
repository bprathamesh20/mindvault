import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function tAuth() {
  return convexTest(schema, modules).withIdentity({
    subject: "user",
    issuer: "https://example.com",
  });
}

describe("imageSize", () => {
  test("reads PNG IHDR dimensions", async () => {
    const { imageSize } = await import("./imageSize");
    const png = new Uint8Array(24);
    png[0] = 0x89;
    png[1] = 0x50;
    png[2] = 0x4e;
    png[3] = 0x47;
    const view = new DataView(png.buffer);
    view.setUint32(16, 640);
    view.setUint32(20, 360);
    expect(imageSize(png.buffer)).toEqual({ width: 640, height: 360 });
  });

  test("returns undefined for garbage", async () => {
    const { imageSize } = await import("./imageSize");
    expect(imageSize(new Uint8Array(32).buffer)).toBeUndefined();
  });
});

describe("items", () => {
  test("list requires auth", async () => {
    const t = convexTest(schema, modules);
    await expect(
      t.query(api.items.list, {
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow();
  });

  test("captureNote then list returns the card", async () => {
    const t = tAuth();
    const id = await t.mutation(api.items.captureNote, {
      text: "remember to water the plants",
    });
    const page = await t.query(api.items.list, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(1);
    expect(page.page[0].id).toBe(id);
    expect(page.page[0].type).toBe("note");
    expect(page.page[0].status).toBe("ready");
    expect(page.page[0].title).toContain("remember");
  });

  test("empty note is rejected", async () => {
    const t = tAuth();
    await expect(t.mutation(api.items.captureNote, { text: "   " })).rejects.toThrow(
      "Note is empty",
    );
  });

  test("addTag and removeTag round-trip", async () => {
    const t = tAuth();
    const id = await t.mutation(api.items.captureNote, { text: "tagged note" });
    await t.mutation(api.items.addTag, { id, name: "garden" });
    const withTag = await t.query(api.items.get, { id });
    expect(withTag?.tags).toContain("garden");
    await t.mutation(api.items.removeTag, { id, name: "garden" });
    const without = await t.query(api.items.get, { id });
    expect(without?.tags).not.toContain("garden");
  });

  test("removeItem deletes the document", async () => {
    const t = tAuth();
    const id = await t.mutation(api.items.captureNote, { text: "gone soon" });
    await t.mutation(api.items.removeItem, { id });
    const gone = await t.query(api.items.get, { id });
    expect(gone).toBeNull();
    const page = await t.query(api.items.list, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(page.page).toHaveLength(0);
  });

  test("update toggles isDone", async () => {
    const t = tAuth();
    const id = await t.mutation(api.items.captureNote, { text: "a task" });
    await t.mutation(api.items.update, { id, isDone: true });
    const doc = await t.query(api.items.get, { id });
    expect(doc?.isDone).toBe(true);
  });

  test("keyword search finds indexed text", async () => {
    const t = tAuth();
    await t.run(async (ctx) => {
      await ctx.db.insert("items", {
        type: "article",
        title: "Rust ownership",
        contentText: "ownership and borrowing",
        searchText: "Rust ownership borrowing",
        status: "ready",
        savedAt: Date.now(),
      });
      await ctx.db.insert("items", {
        type: "note",
        title: "grocery list",
        contentText: "milk",
        searchText: "grocery list milk",
        status: "ready",
        savedAt: Date.now(),
      });
    });
    const hits = await t.query(api.search.keyword, { q: "ownership" });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits.some((h) => h.title === "Rust ownership")).toBe(true);
  });

  test("serendipity returns a ready item", async () => {
    const t = tAuth();
    const id = await t.mutation(api.items.captureNote, { text: "only one" });
    const pick = await t.query(api.items.serendipity, { nonce: 1 });
    expect(pick).toBe(id);
  });
});
