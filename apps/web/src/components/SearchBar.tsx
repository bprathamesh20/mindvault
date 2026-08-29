"use client";

import type { RefObject } from "react";

export type SearchMode = "search" | "ask";

type Props = {
  variant: "hero" | "dock";
  mode: SearchMode;
  onModeChange: (mode: SearchMode) => void;
  value: string;
  onChange: (value: string) => void;
  onSubmitAsk: () => void;
  askBusy: boolean;
  inputRef: RefObject<HTMLInputElement | null>;
  onOpenPalette: () => void;
};

export function SearchBar({
  variant,
  mode,
  onModeChange,
  value,
  onChange,
  onSubmitAsk,
  askBusy,
  inputRef,
  onOpenPalette,
}: Props) {
  const placeholder = mode === "ask" ? "Ask my vault…" : "Search my mind…";

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (mode === "ask" && e.key === "Enter") {
      e.preventDefault();
      onSubmitAsk();
    }
    if (e.key === "Escape") {
      onChange("");
      e.currentTarget.blur();
    }
  }

  const modeToggle = (
    <>
      <button
        type="button"
        onClick={() => onModeChange("search")}
        className={
          mode === "search" ? "text-stone-700 dark:text-stone-200" : undefined
        }
      >
        Search
      </button>
      <span aria-hidden>·</span>
      <button
        type="button"
        onClick={() => onModeChange("ask")}
        className={
          mode === "ask" ? "text-stone-700 dark:text-stone-200" : undefined
        }
      >
        Ask
      </button>
    </>
  );

  if (variant === "dock") {
    return (
      <div className="surface pointer-events-auto flex items-center gap-3 rounded-full border py-2 pl-5 pr-2.5 shadow-2xl backdrop-blur-md">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          aria-label={placeholder}
          className="min-w-0 flex-1 bg-transparent font-serif text-lg italic outline-none placeholder:text-stone-400 dark:placeholder:text-[#55555e]"
        />
        <div className="flex shrink-0 items-center gap-2.5 text-[11px] tracking-wide text-stone-400 dark:text-[#6b6b75]">
          {modeToggle}
          {mode === "ask" ? (
            <button
              type="button"
              onClick={onSubmitAsk}
              disabled={!value.trim() || askBusy}
              className="rounded-full bg-stone-900 px-3 py-1.5 text-[11px] text-stone-100 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900"
            >
              {askBusy ? "Thinking…" : "Ask"}
            </button>
          ) : (
            <PaletteChip onClick={onOpenPalette} />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-8 pt-12 md:px-14">
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        aria-label={placeholder}
        className="w-full border-b border-stone-300 bg-transparent pb-5 font-serif text-4xl italic outline-none placeholder:text-stone-400 focus:border-stone-500 md:text-6xl dark:border-[#2a2a31] dark:placeholder:text-[#55555e] dark:focus:border-[#6b6b75]"
      />
      <div className="mt-3 flex items-center gap-3 text-xs tracking-wide text-stone-400 dark:text-[#6b6b75]">
        {modeToggle}
        <div className="ml-auto flex items-center gap-3">
          {mode === "ask" ? (
            <button
              type="button"
              onClick={onSubmitAsk}
              disabled={!value.trim() || askBusy}
              className="disabled:opacity-40"
            >
              {askBusy ? "Thinking…" : "Ask"}
            </button>
          ) : null}
          <PaletteChip onClick={onOpenPalette} />
        </div>
      </div>
    </div>
  );
}

function PaletteChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Command menu"
      className="rounded-full border border-stone-300 px-2 py-1 font-mono text-[10px] tracking-normal text-stone-400 transition hover:border-stone-500 hover:text-stone-600 dark:border-[#2a2a31] dark:text-[#6b6b75] dark:hover:border-[#5b5b64] dark:hover:text-stone-300"
    >
      ⌘K
    </button>
  );
}
