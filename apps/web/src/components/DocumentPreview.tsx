"use client";

import type { ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

function filenameOf(embedJson: unknown): string | undefined {
  if (
    embedJson &&
    typeof embedJson === "object" &&
    "filename" in embedJson &&
    typeof (embedJson as { filename: unknown }).filename === "string"
  ) {
    return (embedJson as { filename: string }).filename;
  }
  return undefined;
}

function excerpt(markdown: string, maxChars: number): string {
  if (markdown.length <= maxChars) return markdown;
  return `${markdown.slice(0, maxChars).replace(/\s+\S*$/, "")}\n`;
}

const cardMarkdown = {
  img: () => null,
  a: ({ children }: { children?: ReactNode }) => <span>{children}</span>,
};

export function DocumentPreview({
  markdown,
  embedJson,
  variant,
}: {
  markdown?: string;
  embedJson?: unknown;
  variant: "card" | "reader";
}) {
  const isCard = variant === "card";
  const filename = filenameOf(embedJson);
  const raw = markdown?.trim() ?? "";
  const body = isCard ? excerpt(raw, 700) : raw;

  return (
    <div
      className={
        isCard
          ? "relative mt-2 h-36 min-w-0 overflow-hidden rounded-lg border border-stone-200 bg-white px-3 py-2 dark:border-[#2a2a31] dark:bg-[#1c1c22]"
          : "w-full min-w-0 self-start overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-[#2a2a31] dark:bg-[#1c1c22]"
      }
    >
      {filename ? (
        <p
          className={`truncate font-medium tracking-wide text-stone-400 uppercase dark:text-[#6b6b75] ${
            isCard
              ? "text-[10px]"
              : "border-b border-stone-100 px-6 py-3 text-xs dark:border-[#2a2a31]"
          }`}
        >
          {filename}
        </p>
      ) : null}
      {body ? (
        <div
          className={
            isCard
              ? "pointer-events-none prose prose-stone mt-1 max-h-[6.75rem] max-w-none overflow-hidden break-words text-[12.5px] leading-relaxed prose-headings:my-1 prose-headings:font-serif prose-headings:text-sm prose-p:my-1 prose-pre:max-h-16 prose-pre:overflow-hidden prose-img:hidden prose-table:my-1 prose-table:text-[11px] dark:prose-invert"
              : "prose prose-stone max-h-[min(75vh,820px)] max-w-none overflow-y-auto px-6 py-5 prose-headings:font-serif dark:prose-invert"
          }
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={isCard ? cardMarkdown : undefined}
          >
            {body}
          </ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm italic text-stone-400 dark:text-[#6b6b75]">
          No text could be extracted from this file.
        </p>
      )}
      {isCard && body ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-9 bg-gradient-to-t from-white dark:from-[#1c1c22]" />
      ) : null}
    </div>
  );
}
