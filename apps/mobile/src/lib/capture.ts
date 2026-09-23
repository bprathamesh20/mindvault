import { useCallback } from "react";
import { useMutation } from "convex/react";
import * as DocumentPicker from "expo-document-picker";
import { api, type Id } from "./backend";

export const URL_RE = /^(https?:\/\/|www\.)\S+$/i;

export const DOCUMENT_MAX_BYTES = 15 * 1024 * 1024;
const DOCUMENT_EXTENSIONS = [
  "pdf", "doc", "docx", "docm", "ppt", "pptx", "xls", "xlsx",
  "odt", "ods", "odp", "rtf", "epub", "csv",
];
const DOCUMENT_MIME = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-word.document.macroEnabled.12",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "application/rtf",
  "application/epub+zip",
  "text/csv",
];

export function isDocumentFilename(name: string): boolean {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return DOCUMENT_EXTENSIONS.includes(ext);
}

export type CaptureResult = { ok: true; message: string } | { ok: false; message: string };

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}

/** Everything that can put a memory into the vault, in one place. */
export function useCapture() {
  const captureUrl = useMutation(api.items.captureUrl);
  const captureNote = useMutation(api.items.captureNote);
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const captureFile = useMutation(api.items.captureFile);

  const saveText = useCallback(
    async (raw: string): Promise<CaptureResult> => {
      const v = raw.trim();
      if (!v) return { ok: false, message: "Nothing to save" };
      try {
        if (URL_RE.test(v)) {
          const res = await captureUrl({ url: v });
          return {
            ok: true,
            message:
              res.outcome === "duplicate"
                ? "Already in your vault"
                : res.outcome === "retrying"
                  ? "Trying that link again"
                  : "Saved to your vault",
          };
        }
        await captureNote({ text: v });
        return { ok: true, message: "Note saved" };
      } catch (err) {
        return { ok: false, message: errorMessage(err, "Couldn't save that") };
      }
    },
    [captureUrl, captureNote],
  );

  /**
   * Opens the system document picker and uploads the choice. Resolves to
   * null when the person cancels the picker.
   */
  const pickAndSaveDocument = useCallback(async (): Promise<CaptureResult | null> => {
    const picked = await DocumentPicker.getDocumentAsync({
      type: DOCUMENT_MIME,
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (picked.canceled || !picked.assets?.[0]) return null;
    const asset = picked.assets[0];
    if (!isDocumentFilename(asset.name)) {
      return { ok: false, message: "That file type isn't supported" };
    }
    if (asset.size !== undefined && asset.size > DOCUMENT_MAX_BYTES) {
      return { ok: false, message: "File is too large (max 15 MB)" };
    }
    try {
      const uploadUrl = await generateUploadUrl();
      const blob = await (await fetch(asset.uri)).blob();
      if (blob.size > DOCUMENT_MAX_BYTES) {
        return { ok: false, message: "File is too large (max 15 MB)" };
      }
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": asset.mimeType ?? "application/octet-stream" },
        body: blob,
      });
      if (!res.ok) throw new Error("Upload failed");
      const { storageId } = (await res.json()) as { storageId: Id<"_storage"> };
      await captureFile({ storageId, filename: asset.name });
      return { ok: true, message: "Document saved" };
    } catch (err) {
      return { ok: false, message: errorMessage(err, "Couldn't upload that file") };
    }
  }, [generateUploadUrl, captureFile]);

  return { saveText, pickAndSaveDocument };
}
