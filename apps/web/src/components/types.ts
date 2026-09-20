export type Card = {
  id: string;
  type:
    | "article"
    | "tweet"
    | "instagram"
    | "youtube"
    | "image"
    | "note"
    | "link"
    | "document"
    | "github"
    | "product";
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
  thumbWidth?: number;
  thumbHeight?: number;
};

export type ItemType = Card["type"];
