"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [passphrase, setPassphrase] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!passphrase || busy) return;
    setBusy(true);
    setError(false);
    try {
      await signIn("passphrase", { passphrase });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm text-center">
        <h1 className="font-serif text-4xl tracking-tight">MindVault</h1>
        <p className="mt-2 font-serif italic text-stone-500 dark:text-stone-400">
          Remember everything. Organize nothing.
        </p>
        <input
          type="password"
          value={passphrase}
          onChange={(e) => setPassphrase(e.target.value)}
          placeholder="Your passphrase"
          autoFocus
          className="mt-10 w-full rounded-full border border-stone-300 bg-white px-5 py-3 text-center outline-none transition focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:focus:border-stone-400 dark:focus:ring-stone-800"
        />
        {error && (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">
            Wrong passphrase.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || !passphrase}
          className="mt-4 w-full rounded-full bg-stone-900 px-5 py-3 text-white transition hover:bg-stone-700 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300"
        >
          {busy ? "Opening…" : "Enter your mind"}
        </button>
      </form>
    </main>
  );
}
