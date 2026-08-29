"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ItemType } from "./types";

export type CommandActions = {
  search: (q: string) => void;
  ask: (q: string) => void;
  newMemory: () => void;
  setFilter: (type: ItemType | undefined) => void;
  serendipity: () => void;
  toggleTheme: () => void;
  signOut: () => void;
};

/**
 * A scope is the Raycast move: Tab on a command that takes an argument drops
 * you *into* it — the menu keeps the input, swaps the placeholder, and the
 * next thing you type is the argument rather than a command name.
 */
type ScopeId = "ask" | "search";

type Scope = {
  id: ScopeId;
  badge: string;
  placeholder: string;
  empty: string;
  label: (q: string) => string;
  run: (q: string) => void;
};

type Command = {
  id: string;
  label: string;
  group: string;
  keywords?: string;
  /** Tab (or Enter, when there is nothing to run yet) steps into this scope. */
  scope?: ScopeId;
  run: () => void;
};

const TYPE_FILTERS: Array<{ label: string; value: ItemType | undefined }> = [
  { label: "Everything", value: undefined },
  { label: "Articles", value: "article" },
  { label: "Tweets", value: "tweet" },
  { label: "Instagram", value: "instagram" },
  { label: "YouTube", value: "youtube" },
  { label: "Documents", value: "document" },
  { label: "Notes", value: "note" },
  { label: "Images", value: "image" },
  { label: "Links", value: "link" },
];

/** Mounted only while open, so every ⌘K starts from a clean slate. */
export function CommandMenu({
  onClose,
  actions,
}: {
  onClose: () => void;
  actions: CommandActions;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [scopeId, setScopeId] = useState<ScopeId | null>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scopes = useMemo<Record<ScopeId, Scope>>(() => {
    const close = (fn: () => void) => {
      onClose();
      fn();
    };
    return {
      ask: {
        id: "ask",
        badge: "Ask",
        placeholder: "Ask my vault anything…",
        empty: "Type your question, then press ↵",
        label: (q) => `Ask my vault: “${q}”`,
        run: (q) => close(() => actions.ask(q)),
      },
      search: {
        id: "search",
        badge: "Search",
        placeholder: "Search my mind…",
        empty: "Type what you're looking for, then press ↵",
        label: (q) => `Search my mind for “${q}”`,
        run: (q) => close(() => actions.search(q)),
      },
    };
  }, [actions, onClose]);

  const scope = scopeId ? scopes[scopeId] : null;

  const commands = useMemo<Command[]>(() => {
    const q = query.trim();
    const close = (fn: () => void) => () => {
      onClose();
      fn();
    };

    // Inside a scope the list is just the one thing you're doing.
    if (scope) {
      if (!q) return [];
      return [
        {
          id: `scope-${scope.id}`,
          label: scope.label(q),
          group: "",
          run: () => scope.run(q),
        },
      ];
    }

    const list: Command[] = [];

    if (q.length > 0) {
      list.push(
        {
          id: "run-search",
          label: `Search my mind for “${q}”`,
          group: "Find",
          scope: "search",
          run: close(() => actions.search(q)),
        },
        {
          id: "run-ask",
          label: `Ask my vault: “${q}”`,
          group: "Find",
          scope: "ask",
          run: close(() => actions.ask(q)),
        },
      );
    }

    list.push(
      {
        id: "ask",
        label: "Ask my vault",
        group: "Find",
        keywords: "ask question answer ai chat vault",
        scope: "ask",
        // Enter steps in too, so "ask" + ↵ works as well as "ask" + ⇥.
        run: () => {
          setScopeId("ask");
          setQuery("");
          setActive(0);
        },
      },
      {
        id: "search",
        label: "Search my mind",
        group: "Find",
        keywords: "search find query look up",
        scope: "search",
        run: () => {
          setScopeId("search");
          setQuery("");
          setActive(0);
        },
      },
      {
        id: "serendipity",
        label: "Serendipity — resurface a memory",
        group: "Find",
        keywords: "random shuffle surprise resurface",
        run: close(actions.serendipity),
      },
      {
        id: "new-memory",
        label: "New memory — link, note, or file",
        group: "Capture",
        keywords: "add save capture upload document pdf note link",
        run: close(actions.newMemory),
      },
    );

    for (const f of TYPE_FILTERS) {
      list.push({
        id: `filter-${f.label}`,
        label: `Show ${f.label.toLowerCase()}`,
        group: "Filter",
        keywords: `filter type ${f.label}`,
        run: close(() => actions.setFilter(f.value)),
      });
    }

    list.push(
      {
        id: "toggle-theme",
        label: "Toggle light / dark",
        group: "View",
        keywords: "theme dark light appearance",
        run: close(actions.toggleTheme),
      },
      {
        id: "sign-out",
        label: "Lock my mind — sign out",
        group: "Account",
        keywords: "signout logout lock leave",
        run: close(actions.signOut),
      },
    );

    return list;
  }, [query, actions, onClose, scope]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (scope || !q) return commands;

    const isFreeText = (c: Command) =>
      c.id === "run-search" || c.id === "run-ask";
    // A command you are clearly naming ("ask", "the") outranks the free-text
    // rows; anything that merely contains the query sits below them.
    const score = (c: Command) => {
      const haystack = `${c.label} ${c.keywords ?? ""}`.toLowerCase();
      if (haystack.split(/\s+/).some((w) => w.startsWith(q))) return 2;
      return haystack.includes(q) ? 1 : 0;
    };

    const scored = commands
      .filter((c) => !isFreeText(c))
      .map((c) => ({ c, s: score(c) }))
      .filter((x) => x.s > 0);

    return [
      ...scored.filter((x) => x.s === 2).map((x) => x.c),
      // The free-text entries always stay — they *are* the query.
      ...commands.filter(isFreeText),
      ...scored.filter((x) => x.s === 1).map((x) => x.c),
    ];
  }, [commands, query, scope]);

  // Clamped rather than corrected in an effect: the list can shrink under the
  // cursor as you type.
  const activeIndex = matches.length ? Math.min(active, matches.length - 1) : 0;

  useEffect(() => {
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  function enterScope(next: ScopeId, keepQuery: boolean) {
    setScopeId(next);
    setQuery(keepQuery ? query : "");
    setActive(0);
    inputRef.current?.focus();
  }

  function exitScope() {
    setScopeId(null);
    setQuery("");
    setActive(0);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const current = matches[activeIndex];

    if (e.key === "Escape") {
      e.preventDefault();
      if (scope) exitScope();
      else onClose();
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Free-text rows carry the typed text into the scope; a plain command
      // row starts the argument empty.
      if (!scope && current?.scope) {
        enterScope(
          current.scope,
          current.id === "run-ask" || current.id === "run-search",
        );
      }
    } else if (e.key === "Backspace" && scope && query.length === 0) {
      e.preventDefault();
      exitScope();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive(matches.length ? (activeIndex + 1) % matches.length : 0);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive(
        matches.length ? (activeIndex - 1 + matches.length) % matches.length : 0,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      current?.run();
    }
  }

  let lastGroup: string | null = null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/50 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-label="Command menu"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        className="surface mt-[12vh] w-full max-w-xl overflow-hidden rounded-2xl border shadow-2xl"
      >
        <div className="flex items-center gap-2.5 border-b border-stone-200 px-5 dark:border-[#2a2a31]">
          {scope ? (
            <button
              type="button"
              onClick={exitScope}
              title="Back (⌫)"
              className="shrink-0 rounded-md bg-stone-200 px-2 py-1 text-[11px] tracking-wide text-stone-700 transition hover:bg-stone-300 dark:bg-[#2f2f37] dark:text-stone-200 dark:hover:bg-[#3a3a42]"
            >
              {scope.badge}
            </button>
          ) : null}
          <input
            ref={inputRef}
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            placeholder={
              scope ? scope.placeholder : "Type a command, or search your mind…"
            }
            aria-label="Command menu"
            className="w-full bg-transparent py-4 font-serif text-lg italic outline-none placeholder:text-stone-400 dark:placeholder:text-[#55555e]"
          />
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-2">
          {matches.length === 0 ? (
            <p className="px-5 py-6 text-center text-sm text-stone-400 dark:text-[#6b6b75]">
              {scope ? scope.empty : "No command matches that."}
            </p>
          ) : (
            matches.map((c, i) => {
              const header =
                !query.trim() && c.group && c.group !== lastGroup
                  ? c.group
                  : null;
              lastGroup = c.group;
              return (
                <div key={c.id}>
                  {header ? (
                    <p className="px-5 pb-1 pt-3 text-[10px] uppercase tracking-widest text-stone-400 dark:text-[#5b5b64]">
                      {header}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    data-active={i === activeIndex}
                    onMouseEnter={() => setActive(i)}
                    onClick={c.run}
                    className={`flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left text-[15px] transition ${
                      i === activeIndex
                        ? "bg-stone-100 text-stone-900 dark:bg-[#232329] dark:text-stone-100"
                        : "text-stone-600 dark:text-[#9b9ba4]"
                    }`}
                  >
                    <span className="truncate">{c.label}</span>
                    {i === activeIndex ? (
                      <span className="shrink-0 font-mono text-[10px] text-stone-400 dark:text-[#5b5b64]">
                        {c.scope ? "⇥  ↵" : "↵"}
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-4 border-t border-stone-200 px-5 py-2.5 font-mono text-[10px] text-stone-400 dark:border-[#2a2a31] dark:text-[#5b5b64]">
          <span>↑↓ navigate</span>
          <span>↵ run</span>
          {scope ? <span>⌫ back</span> : <span>⇥ enter command</span>}
          <span>esc {scope ? "back" : "close"}</span>
        </div>
      </div>
    </div>
  );
}
