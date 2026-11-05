"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useAuthActions, useConvexAuth } from "@convex-dev/auth/react";
import SignIn from "@/components/SignIn";
import { ThemeRail } from "@/components/ThemeRail";
import { MobileTabBar } from "@/components/MobileTabBar";
import { getTheme, onThemeChange, setTheme, type Theme } from "@/components/theme";

// Mirrors the native app's Settings tab.
export default function SettingsPage() {
  const { isLoading, isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  const [theme, setThemeState] = useState<Theme>(getTheme);
  const [standalone] = useState(isStandalone);

  useEffect(() => onThemeChange(setThemeState), []);

  if (isLoading) return <main className="min-h-dvh" />;
  if (!isAuthenticated) return <SignIn />;

  let server = "";
  try {
    server = new URL(process.env.NEXT_PUBLIC_CONVEX_URL ?? "").host;
  } catch {
    /* not configured */
  }

  function lock() {
    if (window.confirm("Lock your vault? You’ll need your passphrase again.")) {
      void signOut();
    }
  }

  return (
    <main className="min-h-dvh pb-[calc(var(--tabbar)+2rem)] md:pl-16">
      <ThemeRail />
      <MobileTabBar />

      <div className="mx-auto max-w-xl px-5 pt-[calc(env(safe-area-inset-top)+2rem)] md:pt-12">
        <h1 className="font-serif text-4xl italic text-stone-800 dark:text-stone-100">
          settings
        </h1>

        <Section
          header="Appearance"
          footer="Applies to this device."
        >
          <div className="flex items-center justify-between gap-4 px-4 py-3">
            <span>Theme</span>
            <div
              role="radiogroup"
              aria-label="Theme"
              className="flex rounded-lg bg-stone-200/70 p-0.5 text-sm dark:bg-[#26262d]"
            >
              {(["light", "dark"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  role="radio"
                  aria-checked={theme === t}
                  onClick={() => setTheme(t)}
                  className={`rounded-md px-4 py-1.5 capitalize transition ${
                    theme === t
                      ? "bg-white text-stone-900 shadow-sm dark:bg-[#3a3a42] dark:text-stone-100"
                      : "text-stone-500 dark:text-[#8b8b94]"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Section>

        <Section
          header="Saving"
          footer="On iPhone, tap Share in Safari, X, Instagram, YouTube or any app and choose “Save to MindVault”. It saves in the background."
        >
          <Row>Save from other apps</Row>
        </Section>

        {!standalone ? (
          <Section
            header="Install"
            footer="In Safari, tap Share → Add to Home Screen. MindVault then opens full screen, like an app."
          >
            <Row>Add to Home Screen</Row>
          </Section>
        ) : null}

        <Section header="About">
          <Row value={server || "—"}>Server</Row>
        </Section>

        <Section>
          <button
            type="button"
            onClick={lock}
            className="w-full px-4 py-3 text-left text-red-600 active:bg-stone-100 dark:text-red-400 dark:active:bg-[#232329]"
          >
            Lock my vault — sign out
          </button>
        </Section>

        <p className="mt-10 text-center font-serif text-sm italic text-stone-400 dark:text-[#6b6b75]">
          MindVault · Remember everything. Organize nothing.
        </p>
      </div>
    </main>
  );
}

/** Opened from the home screen rather than a Safari tab. */
function isStandalone(): boolean {
  if (typeof window === "undefined") return true;
  const nav = window.navigator as Navigator & { standalone?: boolean };
  return (
    nav.standalone === true ||
    window.matchMedia("(display-mode: standalone)").matches
  );
}

function Section({
  header,
  footer,
  children,
}: {
  header?: string;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-8">
      {header ? (
        <h2 className="mb-2 px-4 text-xs uppercase tracking-wider text-stone-500 dark:text-[#8b8b94]">
          {header}
        </h2>
      ) : null}
      <div className="surface overflow-hidden rounded-xl border text-[15px]">
        {children}
      </div>
      {footer ? (
        <p className="mt-2 px-4 text-xs leading-relaxed text-stone-500 dark:text-[#8b8b94]">
          {footer}
        </p>
      ) : null}
    </section>
  );
}

function Row({ children, value }: { children: ReactNode; value?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span>{children}</span>
      {value ? (
        <span className="truncate text-stone-500 dark:text-[#8b8b94]">{value}</span>
      ) : null}
    </div>
  );
}
