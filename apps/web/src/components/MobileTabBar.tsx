"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutGridIcon,
  SearchIcon,
  SettingsIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

// Phones only: the same four tabs as the native app (Vault, Search, Ask,
// Settings). Desktop keeps the side rail.

const FOCUS_SEARCH_EVENT = "mv-focus-search";
const FOCUS_SEARCH_FLAG = "mv-focus-search";

/** Home listens for this to scroll up and focus its search field. */
export function onFocusSearch(fn: () => void): () => void {
  window.addEventListener(FOCUS_SEARCH_EVENT, fn);
  // Arrived here from the Search tab on another page.
  try {
    if (sessionStorage.getItem(FOCUS_SEARCH_FLAG)) {
      sessionStorage.removeItem(FOCUS_SEARCH_FLAG);
      setTimeout(fn, 0);
    }
  } catch {
    /* storage blocked: the tab still navigates home */
  }
  return () => window.removeEventListener(FOCUS_SEARCH_EVENT, fn);
}

export function MobileTabBar({ searching = false }: { searching?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();

  function focusSearch() {
    if (pathname === "/") {
      window.dispatchEvent(new Event(FOCUS_SEARCH_EVENT));
      return;
    }
    try {
      sessionStorage.setItem(FOCUS_SEARCH_FLAG, "1");
    } catch {
      /* ignore */
    }
    router.push("/");
  }

  const onHome = pathname === "/";
  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-stone-200/80 bg-stone-50/80 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl backdrop-saturate-150 md:hidden dark:border-[#2a2a31]/80 dark:bg-[#0f0f13]/80"
    >
      <Tab href="/" label="Vault" icon={LayoutGridIcon} active={onHome && !searching} />
      <Tab label="Search" icon={SearchIcon} active={onHome && searching} onPress={focusSearch} />
      <Tab href="/ask" label="Ask" icon={SparklesIcon} active={pathname === "/ask"} />
      <Tab
        href="/settings"
        label="Settings"
        icon={SettingsIcon}
        active={pathname === "/settings"}
      />
    </nav>
  );
}

function Tab({
  href,
  label,
  icon: Icon,
  active,
  onPress,
}: {
  href?: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onPress?: () => void;
}) {
  const className = `flex h-14 flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-medium transition-colors ${
    active
      ? "text-stone-900 dark:text-stone-100"
      : "text-stone-400 active:text-stone-600 dark:text-[#6b6b75] dark:active:text-stone-300"
  }`;
  const body = (
    <>
      <Icon className="size-[22px]" strokeWidth={active ? 2.25 : 1.75} />
      {label}
    </>
  );
  if (href && !onPress) {
    return (
      <Link
        href={href}
        className={className}
        aria-current={active ? "page" : undefined}
        // Tapping the tab you're on scrolls back to the top, as on iOS.
        onClick={() => {
          if (active) window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      >
        {body}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onPress} className={className}>
      {body}
    </button>
  );
}
