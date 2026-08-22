"use client";

import { useEffect, useState } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useAction } from "convex/react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import SignIn from "../components/SignIn";
import { CaptureFab } from "../components/CaptureFab";
import Grid from "../components/Grid";
import { ItemCard } from "../components/ItemCard";
import { ThemeRail } from "../components/ThemeRail";
import { ItemModal } from "../components/ItemModal";
import type { Card } from "../components/types";

export default function Home() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [serNonce, setSerNonce] = useState<number | null>(null);
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
        <p className="font-serif text-2xl italic text-stone-400 dark:text-[#6b6b75]">
          Opening your mind…
        </p>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <main className="min-h-screen md:pl-16">
      <ThemeRail onSerendipity={() => setSerNonce(Date.now())} />

      {/* Hero search — mymind style */}
      <div className="px-8 pt-12 md:px-14">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search my mind…"
          className="w-full border-b border-stone-300 bg-transparent pb-5 font-serif text-4xl italic outline-none placeholder:text-stone-400 focus:border-stone-500 md:text-6xl dark:border-[#2a2a31] dark:placeholder:text-[#55555e] dark:focus:border-[#6b6b75]"
        />
      </div>

      <div className="mx-auto w-full max-w-6xl px-8 pb-16 pt-10 md:px-10">
        <CaptureFab />
        {showResults ? (
          <section className="mt-10">
            {(results ?? []).length === 0 ? (
              <div className="py-24 text-center">
                <p className="font-serif text-3xl italic text-stone-400 dark:text-[#6b6b75]">
                  Nothing found for “{query}”.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-8 text-center text-xs tracking-wide text-stone-400 dark:text-[#6b6b75]">
                  {(results ?? []).length}{" "}
                  {(results ?? []).length === 1 ? "memory" : "memories"} found
                </p>
                <div className="columns-1 gap-5 sm:columns-2 lg:columns-3 2xl:columns-4">
                  {(results ?? []).map((item) => (
                    <ItemCard key={item.id} item={item} onOpen={setOpenId} />
                  ))}
                </div>
              </>
            )}
          </section>
        ) : (
          <div className="mt-10">
            <Grid onOpen={setOpenId} />
          </div>
        )}
      </div>

      {serNonce !== null ? (
        <SerendipityOpener
          nonce={serNonce}
          onClose={() => setSerNonce(null)}
          onOpen={(id) => {
            setSerNonce(null);
            setOpenId(id);
          }}
        />
      ) : openId ? (
        <ItemModal itemId={openId} onClose={() => setOpenId(null)} />
      ) : null}
    </main>
  );
}

function SerendipityOpener({
  nonce,
  onClose,
  onOpen,
}: {
  nonce: number;
  onClose: () => void;
  onOpen: (id: string) => void;
}) {
  const res = useQuery(api.items.serendipity, { nonce });
  if (res === undefined)
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <p className="font-serif text-2xl italic text-stone-300">Resurfacing…</p>
      </div>
    );
  if (res === null) {
    onClose();
    return null;
  }
  return <ItemModal itemId={res} onClose={onClose} />;
}
