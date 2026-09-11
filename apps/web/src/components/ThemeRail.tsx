"use client";

import { useEffect, useState } from "react";
import { getTheme, onThemeChange, toggleTheme, type Theme } from "./theme";

export function ThemeRail() {
  const [theme, setThemeState] = useState<Theme>(getTheme);

  useEffect(() => onThemeChange(setThemeState), []);

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-16 flex-col items-center justify-between py-6 md:flex">
      <span
        className="font-serif text-xl italic tracking-wide text-stone-500 dark:text-[#8b8b94]"
        style={{ writingMode: "vertical-rl" }}
      >
        my mind
      </span>

      <button
        onClick={() => toggleTheme()}
        title="Toggle theme"
        className="text-lg text-stone-400 transition hover:text-stone-700 dark:text-[#8b8b94] dark:hover:text-stone-200"
      >
        {theme === "dark" ? "☾" : "☀"}
      </button>
    </aside>
  );
}
