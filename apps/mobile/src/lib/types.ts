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
    | "github";
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
  fileUrl?: string;
  thumbnailUrl?: string;
  embedJson?: unknown;
  userNote?: string;
  isDone?: boolean;
  savedAt: number;
};
