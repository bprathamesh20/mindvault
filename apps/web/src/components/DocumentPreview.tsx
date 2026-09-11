"use client";

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

export function DocumentPreview({
  markdown,
  embedJson,
}: {
  markdown?: string;
  embedJson?: unknown;
}) {
  const filename = filenameOf(embedJson);
  const body = markdown?.trim() ?? "";

  return (
    <div
      className="w-full min-w-0 self-start overflow-hidden rounded-xl border border-stone-200 bg-white dark:border-[#2a2a31] dark:bg-[#1c1c22]"
    >
      {filename ? (
        <p
          className="truncate font-medium tracking-wide text-stone-400 uppercase dark:text-[#6b6b75] border-b border-stone-100 px-6 py-3 text-xs dark:border-[#2a2a31]"
        >
          {filename}
        </p>
      ) : null}
      {body ? (
        <div
          className="prose prose-stone max-h-[min(75vh,820px)] max-w-none overflow-y-auto px-6 py-5 prose-headings:font-serif dark:prose-invert"
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      ) : (
        <p className="text-sm italic text-stone-400 dark:text-[#6b6b75]">
          No text could be extracted from this file.
        </p>
      )}
    </div>
  );
}
