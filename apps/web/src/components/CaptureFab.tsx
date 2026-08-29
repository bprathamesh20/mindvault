"use client";

import { useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

const URL_RE = /^(https?:\/\/|www\.)\S+$/i;

const DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
const DOCUMENT_ACCEPT =
  ".pdf,.doc,.docx,.docm,.ppt,.pptx,.xls,.xlsx,.odt,.ods,.odp,.rtf,.epub,.csv";

function isDocumentFilename(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return DOCUMENT_ACCEPT.split(",").some((a) => a.slice(1) === ext);
}

export function CaptureFab() {
  const captureUrl = useMutation(api.items.captureUrl);
  const captureNote = useMutation(api.items.captureNote);
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const captureFile = useMutation(api.items.captureFile);
  const fileInput = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function flash(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2400);
  }

  async function save() {
    const v = draft.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      if (URL_RE.test(v)) {
        const res = await captureUrl({ url: v });
        flash(
          res.outcome === "duplicate"
            ? "Already in your mind"
            : res.outcome === "retrying"
              ? "Retrying…"
              : "Saved to your mind",
        );
      } else {
        await captureNote({ text: v });
        flash("Note saved");
      }
      setDraft("");
      setOpen(false);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save that");
    } finally {
      setBusy(false);
    }
  }

  async function saveFile(file: File) {
    if (busy) return;
    if (!isDocumentFilename(file.name)) {
      flash("That file type isn't supported");
      return;
    }
    if (file.size > DOCUMENT_MAX_BYTES) {
      flash("File is too large (max 15 MB)");
      return;
    }
    setBusy(true);
    try {
      const uploadUrl = await generateUploadUrl();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!result.ok) throw new Error("Upload failed");
      const { storageId } = (await result.json()) as {
        storageId: Id<"_storage">;
      };
      await captureFile({ storageId, filename: file.name });
      flash("Document saved");
      setOpen(false);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Could not save that file");
    } finally {
      setBusy(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Save something new"
        className="fixed bottom-7 right-7 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-stone-900 text-3xl font-light leading-none text-stone-100 shadow-xl transition hover:scale-105 hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
      >
        ＋
      </button>

      {toast ? (
        <div className="fixed bottom-24 right-7 z-40 rounded-full bg-stone-900 px-4 py-2 text-sm text-white shadow-lg dark:bg-stone-100 dark:text-stone-900">
          {toast}
        </div>
      ) : null}

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl dark:border-[#2a2a31] dark:bg-[#1b1b20]"
          >
            <h3 className="font-serif text-xl">New memory</h3>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void save();
                }
                if (e.key === "Escape") setOpen(false);
              }}
              placeholder="Paste a link or jot a thought…"
              className="mt-4 w-full rounded-xl border border-stone-200 bg-transparent px-4 py-3 text-[15px] outline-none transition placeholder:text-stone-400 focus:border-stone-500 dark:border-[#2a2a31] dark:placeholder:text-[#5b5b64] dark:focus:border-[#6b6b75]"
            />
            <input
              ref={fileInput}
              type="file"
              accept={DOCUMENT_ACCEPT}
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void saveFile(file);
              }}
            />
            <p className="mt-2 text-xs text-stone-400 dark:text-[#5b5b64]">
              Links get extracted & tagged automatically. Anything else becomes
              a note. Or upload a PDF, Word, slides, spreadsheet, EPUB…
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={busy}
                className="mr-auto rounded-full px-5 py-2.5 text-sm text-stone-600 hover:bg-stone-100 disabled:opacity-40 dark:text-[#9b9ba4] dark:hover:bg-[#232329]"
              >
                {busy ? "Saving…" : "Upload file"}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full px-5 py-2.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-[#9b9ba4] dark:hover:bg-[#232329]"
              >
                Cancel
              </button>
              <button
                onClick={() => void save()}
                disabled={!draft.trim() || busy}
                className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-stone-100 transition hover:bg-stone-700 disabled:opacity-40 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
              >
                {busy ? "Saving…" : "Save to my mind"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
