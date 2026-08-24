export type Card = {
  id: string;
  type:
    | "article"
    | "tweet"
    | "instagram"
    | "youtube"
    | "image"
    | "note"
    | "link";
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

export type Detail = {
  id: string;
  type: Card["type"];
  url?: string;
  title?: string;
  author?: string;
  sourceDomain?: string;
  contentText?: string;
  summary?: string;
  htmlUrl?: string;
  thumbnailUrl?: string;
  embedJson?: unknown;
  userNote?: string;
  isDone?: boolean;
  savedAt: number;
};
