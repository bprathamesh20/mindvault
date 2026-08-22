const BADGE_CLEAR_MS = 1600;
let badgeTimer = null;

async function getConfig() {
  const {
    backendUrl = "",
    captureSecret = "",
    webAppUrl = "",
  } = await chrome.storage.local.get(["backendUrl", "captureSecret", "webAppUrl"]);
  return {
    backendUrl: String(backendUrl)
      .trim()
      .replace(/\/+$/, "")
      .replace(/\.convex\.cloud(?=\/|$)/i, ".convex.site"),
    captureSecret: String(captureSecret).trim(),
    webAppUrl: String(webAppUrl).trim().replace(/\/+$/, ""),
  };
}

function isWebUrl(url) {
  return /^https?:\/\//i.test(url || "");
}

function normalizeUrl(raw) {
  try {
    const u = new URL(raw);
    u.hash = "";
    return u.href;
  } catch {
    return raw;
  }
}

async function getPageSelection(tabId) {
  try {
    const [frame] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => String(window.getSelection ? window.getSelection() : "").trim(),
    });
    return frame?.result ?? "";
  } catch {
    return "";
  }
}

async function captureOnBackend(cfg, payload) {
  let res;
  try {
    res = await fetch(`${cfg.backendUrl}/api/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${cfg.captureSecret}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    return { ok: false, code: "network" };
  }
  if (res.status === 401 || res.status === 403) {
    return { ok: false, code: "auth" };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, code: "error", detail: data?.error };
  }
  return { ok: true, outcome: data.outcome, itemId: data.itemId };
}

async function flashBadge(text, color) {
  try {
    await chrome.action.setBadgeBackgroundColor({ color });
    await chrome.action.setBadgeText({ text });
    clearTimeout(badgeTimer);
    badgeTimer = setTimeout(() => {
      void chrome.action.setBadgeText({ text: "" });
    }, BADGE_CLEAR_MS);
  } catch {}
}

async function showPageToast(tabId, outcome) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["toast.js"],
    });
    await chrome.tabs.sendMessage(tabId, { type: "MV_SAVED", outcome });
  } catch {}
}

async function openOptionsWithSetup() {
  await chrome.tabs.create({ url: chrome.runtime.getURL("options.html?setup=1") });
}

async function saveCurrentTab(trigger) {
  const cfg = await getConfig();
  if (!cfg.backendUrl || !cfg.captureSecret) {
    if (trigger === "command" || trigger === "install") await openOptionsWithSetup();
    return { ok: false, code: "unconfigured" };
  }

  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (!tab || !isWebUrl(tab.url)) {
    return { ok: false, code: "unsupported", url: tab?.url ?? "" };
  }

  const selection = await getPageSelection(tab.id);
  const result = await captureOnBackend(cfg, {
    url: normalizeUrl(tab.url),
    title: tab.title || undefined,
    selection: selection || undefined,
  });

  if (!result.ok) {
    await flashBadge("!", "#dc2626");
    if (result.code === "auth" && trigger === "command") await openOptionsWithSetup();
    return result;
  }

  if (result.outcome === "saved") await flashBadge("✓", "#4f46e5");
  else if (result.outcome === "retrying") await flashBadge("↻", "#d97706");
  else await flashBadge("↻", "#64748b");

  await showPageToast(tab.id, result.outcome);
  return result;
}

chrome.commands.onCommand.addListener((command) => {
  if (command === "save-to-mindvault") {
    void saveCurrentTab("command");
  }
});

chrome.action.onClicked.addListener((tab) => {
  void saveCurrentTab("action");
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.menuItemId !== "mv-open-vault") return;
  void getConfig().then((cfg) => {
    if (cfg.webAppUrl) chrome.tabs.create({ url: cfg.webAppUrl });
    else chrome.runtime.openOptionsPage();
  });
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  (async () => {
    if (msg?.type === "MV_SAVE") {
      sendResponse(await saveCurrentTab("popup"));
      return;
    }
    sendResponse({ ok: false, code: "unknown-message" });
  })();
  return true;
});

chrome.runtime.onInstalled.addListener((details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "mv-open-vault",
      title: "Open MindVault vault",
      contexts: ["action"],
    });
  });
  if (details.reason !== "install") return;
  void getConfig().then((cfg) => {
    if (!cfg.backendUrl || !cfg.captureSecret) void openOptionsWithSetup();
  });
});
