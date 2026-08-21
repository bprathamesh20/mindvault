import { v } from "convex/values";

export const ITEM_TYPES = [
  "article",
  "tweet",
  "instagram",
  "youtube",
  "image",
  "note",
  "link",
] as const;

export type ItemType = (typeof ITEM_TYPES)[number];

export const itemTypeValidator = v.union(
  ...ITEM_TYPES.map((t) => v.literal(t)),
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

export function detectType(url: string): ItemType {
  const host = new URL(url).hostname.replace(/^(www|m|mobile)\./, "");
  if (
    host === "x.com" ||
    host === "twitter.com" ||
    host === "mobile.twitter.com"
  ) {
    return "tweet";
  }
  if (host === "instagram.com") {
    return "instagram";
  }
  if (host === "youtube.com" || host === "youtu.be") {
    return "youtube";
  }
  if (host === "pin.it" || host === "github.com") {
    return "link";
  }
  return "article";
}

export function domainOf(url: string): string {
  return new URL(url).hostname.replace(/^www\./, "");
}
