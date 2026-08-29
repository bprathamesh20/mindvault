"use client";

import { useEffect, useRef, useState } from "react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useAction, useQuery } from "convex/react";
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
  const [mode, setMode] = useState<"search" | "ask">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Card[] | null>(null);
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askSources, setAskSources] = useState<Card[] | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [serNonce, setSerNonce] = useState<number | null>(null);
  const searchAction = useAction(api.search.search);
  const askVault = useAction(api.ask.askVault);
  // Bumped whenever the pending answer stops matching the question on screen.
  const askSeq = useRef(0);

  useEffect(() => {
    if (mode !== "search") return;
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
  }, [query, searchAction, mode]);

  function clearAsk() {
    askSeq.current += 1;
    setAskAnswer(null);
    setAskSources(null);
    setAskBusy(false);
  }

  async function submitAsk() {
    const q = query.trim();
    if (!q || askBusy) return;
    const seq = ++askSeq.current;
    setAskBusy(true);
    setAskAnswer(null);
    setAskSources(null);
    try {
      const r = await askVault({ q });
      if (seq !== askSeq.current) return;
      setAskAnswer(r.answer);
      setAskSources(r.sources);
    } catch {
      if (seq !== askSeq.current) return;
      setAskAnswer("Could not reach the vault. Try again.");
      setAskSources([]);
    } finally {
      if (seq === askSeq.current) setAskBusy(false);
    }
  }

  const showResults = mode === "search" && query.trim().length > 0;
  const showAsk = mode === "ask" && (askBusy || askAnswer !== null);

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

      <div className="px-8 pt-12 md:px-14">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            // The answer on screen belongs to the old question.
            if (mode === "ask") clearAsk();
          }}
          onKeyDown={(e) => {
            if (mode === "ask" && e.key === "Enter") {
              e.preventDefault();
              void submitAsk();
            }
          }}
          placeholder={mode === "ask" ? "Ask my vault…" : "Search my mind…"}
          className="w-full border-b border-stone-300 bg-transparent pb-5 font-serif text-4xl italic outline-none placeholder:text-stone-400 focus:border-stone-500 md:text-6xl dark:border-[#2a2a31] dark:placeholder:text-[#55555e] dark:focus:border-[#6b6b75]"
        />
        <div className="mt-3 flex items-center gap-3 text-xs tracking-wide text-stone-400 dark:text-[#6b6b75]">
          <button
            type="button"
            onClick={() => {
              setMode("search");
              clearAsk();
            }}
            className={
              mode === "search" ? "text-stone-700 dark:text-stone-200" : ""
            }
          >
            Search
          </button>
          <span aria-hidden>·</span>
          <button
            type="button"
            onClick={() => {
              setMode("ask");
              clearAsk();
              setResults(null);
            }}
            className={
              mode === "ask" ? "text-stone-700 dark:text-stone-200" : ""
            }
          >
            Ask
          </button>
          {mode === "ask" ? (
            <button
              type="button"
              onClick={() => void submitAsk()}
              disabled={!query.trim() || askBusy}
              className="ml-auto disabled:opacity-40"
            >
              {askBusy ? "Thinking…" : "Ask"}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mx-auto w-full max-w-6xl px-8 pb-16 pt-10 md:px-10">
        <CaptureFab />
        {showAsk ? (
          <section className="mt-10">
            {askBusy ? (
              <p className="font-serif text-2xl italic text-stone-400 dark:text-[#6b6b75]">
                Looking through your mind…
              </p>
            ) : (
              <>
                <p className="max-w-2xl whitespace-pre-wrap font-serif text-xl leading-relaxed text-stone-700 dark:text-stone-200">
                  {askAnswer}
                </p>
                {(askSources ?? []).length > 0 ? (
                  <div className="mt-10 columns-1 gap-5 sm:columns-2 lg:columns-3 2xl:columns-4">
                    {(askSources ?? []).map((item) => (
                      <ItemCard key={item.id} item={item} onOpen={setOpenId} />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : showResults ? (
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
        <p className="font-serif text-2xl italic text-stone-300">
          Resurfacing…
        </p>
      </div>
    );
  if (res === null) {
    onClose();
    return null;
  }
  return <ItemModal itemId={res} onClose={onClose} />;
}
