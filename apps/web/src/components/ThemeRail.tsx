"use client";

import { useEffect, useState } from "react";
import { getTheme, onThemeChange, toggleTheme, type Theme } from "./theme";


export function ThemeRail({ onSerendipity }: { onSerendipity: () => void }) {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  // The command menu can flip the theme too — follow whoever did it.
  useEffect(() => onThemeChange(setThemeState), []);

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-16 flex-col items-center justify-between py-6 md:flex">
      <button
        onClick={onSerendipity}
        title="Serendipity — resurface a memory"
        className="text-lg text-stone-400 transition hover:text-stone-700 dark:text-[#8b8b94] dark:hover:text-stone-200"
      >
        ⏱
      </button>

      <span
        className="font-serif text-xl italic tracking-wide text-stone-500 dark:text-[#8b8b94]"
        style={{ writingMode: "vertical-rl" }}
      >
        my mind
      </span>

      <div className="flex flex-col items-center gap-5">
        <button
          onClick={() => toggleTheme()}
          title="Toggle theme"
          className="text-lg text-stone-400 transition hover:text-stone-700 dark:text-[#8b8b94] dark:hover:text-stone-200"
        >
          {theme === "dark" ? "☾" : "☀"}
        </button>
        <span className="text-lg text-stone-300 dark:text-[#3f3f46]">✦</span>
      </div>
    </aside>
  );
}
