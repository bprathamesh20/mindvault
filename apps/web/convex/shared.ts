import { v } from "convex/values";

export const ITEM_TYPES = [
  "article",
  "tweet",
  "instagram",
  "image",
  "note",
  "link",
] as const;

export const itemTypeValidator = v.union(
  v.literal("article"),
  v.literal("tweet"),
  v.literal("instagram"),
  v.literal("image"),
  v.literal("note"),
  v.literal("link"),
);

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  const url = new URL(withProtocol);
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("Only http(s) URLs are supported");
  }
  url.hash = "";
  return url.href;
}

export function detectType(
  url: string,
): "tweet" | "instagram" | "article" | "link" {
  const host = new URL(url).hostname.replace(/^www\./, "");
  if (host === "x.com" || host === "twitter.com" || host === "mobile.twitter.com") {
    return "tweet";
  }
  if (host === "instagram.com") {
    return "instagram";
  }
  if (host === "pin.it" || host === "youtube.com" || host === "youtu.be") {
    return "link";
  }
  return "article";
}

export function domainOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
