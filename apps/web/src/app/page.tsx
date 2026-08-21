"use client";

import { useEffect, useState } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import SignIn from "../components/SignIn";
import CaptureBar from "../components/CaptureBar";
import Grid from "../components/Grid";
import ItemCard from "../components/ItemCard";
import type { Card } from "../components/types";

export default function Home() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[] | null>(null);
  const searchAction = useAction(api.search.search);

  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const r = await searchAction({ q });
        if (!cancelled) setResults(r);
      } catch {
        if (!cancelled) setResults([]);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, searchAction]);

  const showResults = query.trim().length > 0;

  if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 text-center">
        <div>
          <h1 className="font-serif text-3xl">MindVault</h1>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-stone-500 dark:text-stone-400">
            Backend not connected yet. Run{" "}
            <code className="rounded bg-stone-200 px-1.5 py-0.5 font-mono text-[13px] dark:bg-stone-800">
              npx convex dev
            </code>{" "}
            in <code className="font-mono text-[13px]">apps/web</code> to start
            it, then reload this page.
          </p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif italic text-stone-400">Opening your mind…</p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <main className="min-h-screen pb-20">
      <header className="px-6 pb-8 pt-14 text-center">
        <h1 className="font-serif text-3xl tracking-tight">MindVault</h1>
      </header>
      <div className="pb-6">
        <CaptureBar />
      </div>
      <div className="mx-auto mb-10 w-full max-w-md px-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your mind…"
          className="w-full border-b border-stone-300 bg-transparent px-2 py-2 text-center outline-none transition placeholder:text-stone-400 focus:border-stone-600 dark:border-stone-700 dark:placeholder:text-stone-500 dark:focus:border-stone-400"
        />
      </div>

      {showResults ? (
        <section className="mx-auto w-full max-w-6xl px-6">
          {(results ?? []).length === 0 ? (
            <div className="py-24 text-center">
              <p className="font-serif text-2xl italic text-stone-400 dark:text-stone-500">
                Nothing found for “{query}”.
              </p>
            </div>
          ) : (
            <>
              <p className="mb-6 text-center text-xs text-stone-400 dark:text-stone-500">
                {(results ?? []).length}{" "}
                {(results ?? []).length === 1 ? "memory" : "memories"} found
              </p>
              <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 2xl:columns-4">
                {(results ?? []).map((item) => (
                  <ItemCard key={item.id} item={item} />
                ))}
              </div>
            </>
          )}
        </section>
      ) : (
        <Grid />
      )}
    </main>
  );
}
