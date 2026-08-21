import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";
import { itemTypeValidator } from "./shared";

export default defineSchema({
  ...authTables,

  items: defineTable({
    type: v.union(
      v.literal("article"),
      v.literal("tweet"),
      v.literal("instagram"),
      v.literal("image"),
      v.literal("note"),
      v.literal("link"),
    ),
    url: v.optional(v.string()),
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    sourceDomain: v.optional(v.string()),
    contentText: v.optional(v.string()),
    htmlStorageId: v.optional(v.id("_storage")),
    thumbnailStorageId: v.optional(v.id("_storage")),
    embedJson: v.optional(v.any()),
    summary: v.optional(v.string()),
    searchText: v.optional(v.string()),
    embedding: v.optional(v.array(v.float64())),
    status: v.union(
      v.literal("pending"),
      v.literal("ready"),
      v.literal("failed"),
    ),
    enrichAttempts: v.optional(v.number()),
    aiAttempts: v.optional(v.number()),
    failureReason: v.optional(v.string()),
    savedAt: v.number(),
  })
    .index("by_savedAt", ["savedAt"])
    .index("by_status_and_savedAt", ["status", "savedAt"])
    .index("by_type_and_savedAt", ["type", "savedAt"])
    .index("by_url", ["url"])
    .searchIndex("search_text", {
      searchField: "searchText",
      filterFields: ["type"],
    })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      dimensions: 1536,
      filterFields: ["type"],
    }),

  tags: defineTable({
    name: v.string(),
    useCount: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_useCount", ["useCount"]),

  itemTags: defineTable({
    itemId: v.id("items"),
    tagId: v.id("tags"),
  })
    .index("by_item", ["itemId"])
    .index("by_tag", ["tagId"]),

  spaces: defineTable({
    name: v.string(),
    type: v.optional(itemTypeValidator),
    tag: v.optional(v.string()),
  }).index("by_name", ["name"]),
});
