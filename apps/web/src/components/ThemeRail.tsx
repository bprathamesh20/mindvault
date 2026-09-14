"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon, SparklesIcon } from "lucide-react";
import { getTheme, onThemeChange, toggleTheme, type Theme } from "./theme";

export function ThemeRail() {
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const pathname = usePathname();

  useEffect(() => onThemeChange(setThemeState), []);

  const link = (active: boolean) =>
    `transition ${
      active
        ? "text-stone-700 dark:text-stone-200"
        : "text-stone-400 hover:text-stone-700 dark:text-[#8b8b94] dark:hover:text-stone-200"
    }`;

  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-full w-16 flex-col items-center justify-between py-6 md:flex">
      <span
        className="font-serif text-xl italic tracking-wide text-stone-500 dark:text-[#8b8b94]"
        style={{ writingMode: "vertical-rl" }}
      >
        mindvault
      </span>

      <nav className="flex flex-col items-center gap-5">
        <Link href="/" title="Search" className={link(pathname === "/")}>
          <SearchIcon className="size-4" />
        </Link>
        <Link href="/ask" title="Ask" className={link(pathname === "/ask")}>
          <SparklesIcon className="size-4" />
        </Link>
      </nav>

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
