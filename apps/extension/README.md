# MindVault — Chrome Extension

Save any tab into MindVault with one click or a keyboard shortcut. Saves go
straight to your backend's `/api/capture` HTTP endpoint, so items land in the
same vault as the web/mobile apps and run through the full enrichment pipeline
(extract → thumbnail → tags → embeddings).

## Setup

1. **Backend secret** — from `apps/web`, set the capture secret on your Convex
   deployment (local anonymous deployments need explicit env vars too):

   ```bash
   npx convex env set CAPTURE_SECRET=<random-string>
   ```

2. **Load unpacked** — open `chrome://extensions`, enable Developer mode,
   click **Load unpacked**, select this folder (`apps/extension`). No build step.

3. **Configure** — the options page opens on first install:
   - **Backend URL** — Convex cloud: `https://<deployment>.convex.site` (note:
     httpActions are served on **`.convex.site`**, not `.convex.cloud`) ·
     local dev: `http://127.0.0.1:3210`. A `.convex.cloud` URL is
     auto-corrected to `.convex.site`.
   - **Capture secret** — the `CAPTURE_SECRET` value from step 1
   - **Web app URL** — used by "Open vault" in the popup
     (default `http://localhost:3100`)
   - Hit **Test connection** to verify (probe is side-effect free).

## Usage

- Click the toolbar icon → saves instantly in the background (no popup)
- Anywhere: <kbd>⌘</kbd><kbd>⇧</kbd><kbd>S</kbd> (mac) / <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>
  → same instant save, no UI
- Right-click the toolbar icon → **Open MindVault vault** / **Options**
- Rebind the shortcut at `chrome://extensions/shortcuts` — pick a combo Chrome
  doesn't reserve (e.g. `⌘⇧B` won't work: it toggles the bookmarks bar)
- Confirmation: toast on the page + toolbar badge flash (`✓` saved, `↻`
  duplicate/retry, `!` failure)
- Duplicate handling is server-side: `duplicate` if ready, `retrying` re-enqueues
  failed items — same semantics as pasting a URL in the web app

> `popup.html/css/js` are kept but unused (instant-save replaced the popup).
> To restore the popup UI, re-add `"default_popup": "popup.html"` to `action`
> in the manifest and remove the `chrome.action.onClicked` listener.

## Files

| File | Role |
| --- | --- |
| `manifest.json` | MV3 manifest: commands, activeTab+scripting+storage+favicon |
| `background.js` | Service worker: shortcut handler, POST to `/api/capture`, badge + toast dispatch |
| `popup.html/css/js` | Toolbar popup with page preview and save button |
| `options.html/css/js` | Backend URL / secret config + zero-side-effect connection test |
| `toast.js` | Injected confirmation toast on the saved page |

## Endpoint contract

```
POST {backend}/api/capture
Authorization: Bearer <CAPTURE_SECRET>
{ "url": "https://…", "title": "…", "selection": "…" }  // title/selection reserved for future use
→ { itemId, outcome: "saved" | "duplicate" | "retrying" }
```

The current endpoint reads only `url`; extra fields are ignored today but sent
so future backend changes can pick them up without an extension update.
