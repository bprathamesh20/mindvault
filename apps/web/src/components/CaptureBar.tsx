"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";

const URL_RE = /^(https?:\/\/|www\.)\S+$/i;

export default function CaptureBar() {
  const captureUrl = useMutation(api.items.captureUrl);
  const captureNote = useMutation(api.items.captureNote);
  const [value, setValue] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  async function submit() {
    const v = value.trim();
    if (!v) return;
    setValue("");
    if (URL_RE.test(v)) {
      try {
        const res = await captureUrl({ url: v });
        flash(
          res.outcome === "duplicate"
            ? "Already in your mind"
            : res.outcome === "retrying"
              ? "Retrying…"
              : "Saved to your mind",
        );
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not save that");
      }
    } else {
      try {
        await captureNote({ text: v });
        flash("Note saved");
      } catch (err) {
        flash(err instanceof Error ? err.message : "Could not save that");
      }
    }
  }

  return (
    <div className="relative mx-auto w-full max-w-2xl">
      <input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void submit();
          }
        }}
        placeholder="Paste a link or jot a thought…"
        className="w-full rounded-full border border-stone-300 bg-white px-6 py-3.5 text-[15px] shadow-sm outline-none transition placeholder:text-stone-400 focus:border-stone-500 focus:ring-2 focus:ring-stone-200 dark:border-stone-700 dark:bg-stone-900 dark:placeholder:text-stone-500 dark:focus:border-stone-400 dark:focus:ring-stone-800"
      />
      {toast && (
        <div className="absolute left-1/2 top-full z-10 mt-3 -translate-x-1/2 rounded-full bg-stone-900 px-4 py-1.5 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
          {toast}
        </div>
      )}
    </div>
  );
}
