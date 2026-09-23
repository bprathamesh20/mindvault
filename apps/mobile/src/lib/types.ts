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
  status?: Card["status"];
  tags?: string[];
  savedAt: number;
};

export type ItemType = Card["type"];

/** Filter order mirrors the web grid, then the rarer types. */
export const TYPE_FILTERS: { label: string; value: ItemType | undefined }[] = [
  { label: "All", value: undefined },
  { label: "Articles", value: "article" },
  { label: "Tweets", value: "tweet" },
  { label: "Instagram", value: "instagram" },
  { label: "YouTube", value: "youtube" },
  { label: "Products", value: "product" },
  { label: "Documents", value: "document" },
  { label: "GitHub", value: "github" },
  { label: "Notes", value: "note" },
  { label: "Images", value: "image" },
  { label: "Links", value: "link" },
];

export function typeLabel(type: ItemType | undefined): string {
  return TYPE_FILTERS.find((f) => f.value === type)?.label ?? "All";
}
