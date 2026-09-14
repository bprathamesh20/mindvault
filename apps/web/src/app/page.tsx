"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCardCache } from "../lib/card-cache";
import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "@convex-dev/auth/react";
import { useAction, useQueries } from "convex/react";
import { api } from "../../convex/_generated/api";
import SignIn from "../components/SignIn";
import { CaptureFab } from "../components/CaptureFab";
import { CommandMenu, type CommandActions } from "../components/CommandMenu";
import Grid, { GridSkeleton } from "../components/Grid";
import { ItemCard } from "../components/ItemCard";
import { SearchBar, type SearchMode } from "../components/SearchBar";
import { ThemeRail } from "../components/ThemeRail";
import { ItemModal } from "../components/ItemModal";
import { DOCK_AFTER_PX, MASONRY } from "../components/layout";
import { toggleTheme } from "../components/theme";
import type { Card, ItemType } from "../components/types";

const NO_QUERIES = {};

export default function Home() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [mode, setMode] = useState<SearchMode>("search");
  const [query, setQuery] = useState("");
  const [hybrid, setHybrid] = useState<{ q: string; cards: Card[] } | null>(
    null,
  );
  const [askAnswer, setAskAnswer] = useState<string | null>(null);
  const [askSources, setAskSources] = useState<Card[] | null>(null);
  const [askBusy, setAskBusy] = useState(false);
  const [open, setOpen] = useState<{ id: string; preview?: Card } | null>(
    null,
  );
  const [filterType, setFilterType] = useState<ItemType | undefined>(undefined);
  const [captureOpen, setCaptureOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const searchAction = useAction(api.search.search);
  const askVault = useAction(api.ask.askVault);
  // Bumped whenever the pending answer stops matching the question on screen.
  const askSeq = useRef(0);
  const heroInput = useRef<HTMLInputElement>(null);
  const dockInput = useRef<HTMLInputElement>(null);

  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    if (mode !== "search") return;
    const t = setTimeout(() => setDebounced(query.trim()), 200);
    return () => clearTimeout(t);
  }, [query, mode]);

  const keywordQueries = useMemo(
    () =>
      isAuthenticated && mode === "search" && debounced.length >= 2
        ? { k: { query: api.search.keyword, args: { q: debounced } } }
        : NO_QUERIES,
    [isAuthenticated, mode, debounced],
  );
  const keywordMap = useQueries(keywordQueries);
  const keywordRaw = keywordMap.k;
  const keywordHits = Array.isArray(keywordRaw) ? keywordRaw : undefined;

  useEffect(() => {
    if (mode !== "search" || debounced.length < 2) return;
    let cancelled = false;
    void searchAction({ q: debounced })
      .then((r) => {
        if (!cancelled) setHybrid({ q: debounced, cards: r });
      })
      .catch(() => {
        if (!cancelled) setHybrid({ q: debounced, cards: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [debounced, searchAction, mode]);

  // Once the hero has scrolled away, the search bar rides along at the bottom.
  useEffect(() => {
    const onScroll = () => setDocked(window.scrollY > DOCK_AFTER_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Hand the caret to whichever bar just took over, so scrolling mid-sentence
  // doesn't drop what you were typing.
  useEffect(() => {
    const from = docked ? heroInput.current : dockInput.current;
    const to = docked ? dockInput.current : heroInput.current;
    if (from && document.activeElement === from) to?.focus();
  }, [docked]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function clearAsk() {
    askSeq.current += 1;
    setAskAnswer(null);
    setAskSources(null);
    setAskBusy(false);
  }

  const submitAsk = useCallback(
    async function submitAsk(question?: string) {
      const q = (question ?? query).trim();
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
    },
    [askBusy, askVault, query],
  );

  function changeQuery(next: string) {
    setQuery(next);
    // The answer on screen belongs to the old question.
    if (mode === "ask") clearAsk();
  }

  function changeMode(next: SearchMode) {
    setMode(next);
    clearAsk();
    if (next === "ask") setHybrid(null);
  }

  const actions: CommandActions = {
    search: (q) => {
      setMode("search");
      clearAsk();
      setQuery(q);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    ask: (q) => {
      setMode("ask");
      setHybrid(null);
      setQuery(q);
      void submitAsk(q);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    newMemory: () => setCaptureOpen(true),
    setFilter: (type) => {
      setQuery("");
      setHybrid(null);
      clearAsk();
      setFilterType(type);
    },
    toggleTheme: () => void toggleTheme(),
    signOut: () => void signOut(),
  };

  const results = hybrid?.q === debounced ? hybrid.cards : null;
  const showResults = mode === "search" && query.trim().length > 0;
  const showAsk = mode === "ask" && (askBusy || askAnswer !== null);
  const searchCards = results ?? keywordHits ?? [];
  const searchPending =
    showResults &&
    debounced.length >= 2 &&
    results === null &&
    (keywordHits === undefined || keywordHits.length === 0);
  const searchEmpty =
    showResults &&
    debounced.length >= 2 &&
    !searchPending &&
    searchCards.length === 0;

  function openItem(item: Card) {
    setOpen({ id: item.id, preview: item });
  }

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
      <main className="min-h-screen md:pl-16">
        <div className="px-8 pt-12 md:px-14">
          <div className="h-14 w-2/3 border-b border-stone-300 dark:border-[#2a2a31]" />
        </div>
        <div className="w-full px-6 pb-16 pt-10 md:px-8">
          <CachedGrid />
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <SignIn />;
  }

  return (
    <main className="min-h-screen md:pl-16">
      <ThemeRail />

      <SearchBar
        variant="hero"
        mode={mode}
        onModeChange={changeMode}
        value={query}
        onChange={changeQuery}
        onSubmitAsk={() => void submitAsk()}
        askBusy={askBusy}
        inputRef={heroInput}
        onOpenPalette={() => setPaletteOpen(true)}
      />

      <div className="w-full px-6 pb-32 pt-10 md:px-8">
        <CaptureFab open={captureOpen} onOpenChange={setCaptureOpen} />
        {showAsk ? (
          <section className="mt-10">
            {askBusy ? (
              <p className="font-serif text-2xl italic text-stone-400 dark:text-[#6b6b75]">
                Looking through your vault…
              </p>
            ) : (
              <>
                <p className="max-w-2xl whitespace-pre-wrap font-serif text-xl leading-relaxed text-stone-700 dark:text-stone-200">
                  {askAnswer}
                </p>
                {(askSources ?? []).length > 0 ? (
                  <div className={`mt-10 ${MASONRY}`}>
                    {(askSources ?? []).map((item) => (
                      <ItemCard key={item.id} item={item} onOpen={openItem} />
                    ))}
                  </div>
                ) : null}
              </>
            )}
          </section>
        ) : showResults ? (
          <section className="mt-10">
            {searchPending ? (
              <p className="font-serif text-2xl italic text-stone-400 dark:text-[#6b6b75]">
                Looking through your vault…
              </p>
            ) : searchEmpty ? (
              <div className="py-24 text-center">
                <p className="font-serif text-3xl italic text-stone-400 dark:text-[#6b6b75]">
                  Nothing found for “{query}”.
                </p>
              </div>
            ) : (
              <>
                <p className="mb-8 text-center text-xs tracking-wide text-stone-400 dark:text-[#6b6b75]">
                  {searchCards.length}{" "}
                  {searchCards.length === 1 ? "memory" : "memories"} found
                </p>
                <div className={MASONRY}>
                  {searchCards.map((item) => (
                    <ItemCard key={item.id} item={item} onOpen={openItem} />
                  ))}
                </div>
              </>
            )}
          </section>
        ) : null}
        <div className={`mt-10 ${showAsk || showResults ? "hidden" : ""}`}>
          <Grid
            onOpen={openItem}
            type={filterType}
            onTypeChange={setFilterType}
          />
        </div>
      </div>

      {/* The hero's stand-in once it has scrolled off the top. */}
      <div
        className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-5 transition duration-300 md:pl-16 ${
          docked ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
        }`}
        // inert keeps the hidden bar out of the tab order and out of the way
        // of clicks landing on cards behind it.
        inert={!docked}
      >
        <div className="w-full max-w-2xl pr-20 md:pr-0">
          <SearchBar
            variant="dock"
            mode={mode}
            onModeChange={changeMode}
            value={query}
            onChange={changeQuery}
            onSubmitAsk={() => void submitAsk()}
            askBusy={askBusy}
            inputRef={dockInput}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        </div>
      </div>

      {paletteOpen ? (
        <CommandMenu onClose={() => setPaletteOpen(false)} actions={actions} />
      ) : null}

      {open ? (
        <ItemModal
          itemId={open.id}
          preview={open.preview}
          onClose={() => setOpen(null)}
        />
      ) : null}
    </main>
  );
}

function CachedGrid() {
  const cards = useCardCache();
  if (cards.length === 0) return <GridSkeleton />;
  return (
    <div className={MASONRY}>
      {cards.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  );
}
