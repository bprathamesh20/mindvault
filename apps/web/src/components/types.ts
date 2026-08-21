export type Card = {
  id: string;
  type: "article" | "tweet" | "instagram" | "image" | "note" | "link";
  url?: string;
  title?: string;
  author?: string;
  sourceDomain?: string;
  preview?: string;
  summary?: string;
  tags: string[];
  status: "pending" | "ready" | "failed";
  savedAt: number;
  thumbnailUrl?: string;
  embedJson?: unknown;
};
