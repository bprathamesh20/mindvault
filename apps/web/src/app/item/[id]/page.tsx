"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { DocumentPreview } from "../../../components/DocumentPreview";

export default function ItemPage() {
  const params = useParams<{ id: string }>();
  const item = useQuery(api.items.get, {
    id: params.id as never,
  });
  const [html, setHtml] = useState<string | null>(null);

  useEffect(() => {
    if (!item?.htmlUrl) return;
    let cancelled = false;
    fetch(item.htmlUrl)
      .then((r) => r.text())
      .then((t) => {
        if (!cancelled) setHtml(t);
      })
      .catch(() => setHtml(null));
    return () => {
      cancelled = true;
    };
  }, [item?.htmlUrl]);

  if (item === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif italic text-stone-400">Loading…</p>
      </main>
    );
  }

  if (item === null) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif italic text-stone-400">Not found.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl px-6 pb-24 pt-10">
      <Link
        href="/"
        className="text-sm text-stone-400 transition hover:text-stone-600 dark:hover:text-stone-300"
      >
        ← Back to your mind
      </Link>

      <h1 className="mt-8 font-serif text-3xl leading-tight tracking-tight">
        {item.title ?? "Untitled"}
      </h1>
      <p className="mt-3 text-sm text-stone-500 dark:text-stone-400">
        {[item.author, item.sourceDomain].filter(Boolean).join(" · ")}
        {item.url && (
          <>
            {" · "}
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-stone-300 underline-offset-2 hover:decoration-stone-500 dark:decoration-stone-700"
            >
              original
            </a>
          </>
        )}
      </p>

      {item.summary && (
        <p className="mt-6 border-l-2 border-stone-300 pl-4 font-serif text-[15px] italic leading-relaxed text-stone-600 dark:border-stone-700 dark:text-stone-400">
          {item.summary}
        </p>
      )}

      {item.type === "youtube" &&
      typeof item.embedJson === "object" &&
      item.embedJson !== null &&
      "videoId" in item.embedJson ? (
        <div className="mt-10 aspect-video w-full overflow-hidden rounded-xl bg-black">
          <iframe
            src={`https://www.youtube.com/embed/${String(item.embedJson.videoId)}`}
            title={item.title ?? "YouTube video"}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full"
          />
        </div>
      ) : null}

      {item.type === "youtube" && item.contentText ? (
        <details className="mt-8 rounded-xl border border-stone-200 p-4 dark:border-stone-800">
          <summary className="cursor-pointer text-sm text-stone-500 dark:text-stone-400">
            Transcript
          </summary>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-stone-600 dark:text-stone-300">
            {item.contentText.slice(0, 20000)}
          </p>
        </details>
      ) : null}

      {item.type === "document" ? (
        <div className="mt-10">
          <DocumentPreview
            markdown={item.contentText}
            embedJson={item.embedJson}
            variant="reader"
          />
        </div>
      ) : item.type !== "youtube" ? (
        <article className="prose prose-stone mt-10 max-w-none dark:prose-invert prose-headings:font-serif prose-img:rounded-lg">
          {html ? (
            <div dangerouslySetInnerHTML={{ __html: html }} />
          ) : (
            <p className="whitespace-pre-wrap leading-relaxed">
              {item.contentText}
            </p>
          )}
        </article>
      ) : null}
    </main>
  );
}
