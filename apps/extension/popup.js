const $ = (id) => document.getElementById(id);

let config = null;

function isWebUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function normalizeBackendUrl(raw) {
  return String(raw)
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.convex\.cloud(?=\/|$)/i, ".convex.site");
}

async function loadConfig() {
  const { backendUrl = "", captureSecret = "", webAppUrl = "" } =
    await chrome.storage.local.get(["backendUrl", "captureSecret", "webAppUrl"]);
  return {
    backendUrl: normalizeBackendUrl(backendUrl),
    captureSecret: String(captureSecret).trim(),
    webAppUrl: String(webAppUrl).trim().replace(/\/+$/, ""),
  };
}

function notice(text, kind) {
  const el = $("notice");
  el.hidden = false;
  el.textContent = text;
  el.classList.toggle("error", kind === "error");
}

async function init() {
  config = await loadConfig();
  const configured = Boolean(config.backendUrl && config.captureSecret);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const savable = Boolean(tab && isWebUrl(tab.url));

  if (savable) {
    $("page-title").textContent = tab.title || tab.url;
    try {
      $("page-host").textContent = new URL(tab.url).hostname;
    } catch {
      $("page-host").textContent = "";
    }
    const fav = $("page-favicon");
    fav.src = chrome.runtime.getURL(
      `_favicon/?pageUrl=${encodeURIComponent(tab.url)}&size=32`,
    );
    fav.addEventListener("error", () => fav.remove(), { once: true });
    $("page-card").hidden = false;
  }

  if (!configured) {
    notice("Finish setup: add your backend URL and capture secret in Options.", "error");
    $("save-btn").textContent = "Open Options";
    $("save-btn").dataset.mode = "options";
  } else if (!savable) {
    notice("This page can't be saved to MindVault.", "error");
    $("save-btn").disabled = true;
  }

  const mac = /mac/i.test(navigator.platform || "");
  $("shortcut-hint").innerHTML = mac
    ? "<kbd>⌘</kbd><kbd>⇧</kbd><kbd>S</kbd>"
    : "<kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>S</kbd>";
}

$("save-btn").addEventListener("click", async () => {
  const btn = $("save-btn");
  if (btn.dataset.mode === "options") {
    chrome.runtime.openOptionsPage();
    window.close();
    return;
  }

  btn.disabled = true;
  btn.textContent = "Saving…";

  const res = await chrome.runtime.sendMessage({ type: "MV_SAVE" }).catch(() => null);

  if (!res || !res.ok) {
    const messages = {
      unconfigured: "MindVault isn't configured yet — open Options.",
      unsupported: "This page can't be saved.",
      auth: "Capture secret rejected — update it in Options.",
      network: "Couldn't reach the MindVault backend.",
      error: res?.detail || "Save failed.",
    };
    notice(messages[res?.code] || "Save failed.", "error");
    btn.textContent = "Try again";
    btn.disabled = false;
    return;
  }

  btn.classList.add("success");
  const labels = {
    saved: "Saved ✓",
    duplicate: "Already saved ✓",
    retrying: "Retry queued ↻",
  };
  btn.textContent = labels[res.outcome] || "Saved ✓";
  setTimeout(window.close, 900);
});

$("vault-link").addEventListener("click", () => {
  if (config?.webAppUrl) {
    chrome.tabs.create({ url: config.webAppUrl });
  } else {
    chrome.runtime.openOptionsPage();
  }
  window.close();
});

init();
