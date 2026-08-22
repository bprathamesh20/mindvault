const $ = (id) => document.getElementById(id);

function cleanUrl(value) {
  return String(value)
    .trim()
    .replace(/\/+$/, "")
    .replace(/\.convex\.cloud(?=\/|$)/i, ".convex.site");
}

function status(message, kind) {
  const el = $("status");
  el.textContent = message;
  el.className = kind || "";
}

async function load() {
  const { backendUrl = "", captureSecret = "", webAppUrl = "" } =
    await chrome.storage.local.get(["backendUrl", "captureSecret", "webAppUrl"]);
  $("backend-url").value = backendUrl;
  $("capture-secret").value = captureSecret;
  $("web-app-url").value = webAppUrl || "http://localhost:3100";

  if (new URLSearchParams(location.search).get("setup")) {
    status("Welcome! Point MindVault at your backend to finish setup.");
  }

  const mac = /mac/i.test(navigator.platform || "");
  $("shortcut-hint").textContent = mac ? "⌘⇧S" : "Alt+Shift+S";
}

$("save").addEventListener("click", async () => {
  await chrome.storage.local.set({
    backendUrl: cleanUrl($("backend-url").value),
    captureSecret: $("capture-secret").value.trim(),
    webAppUrl: cleanUrl($("web-app-url").value) || "http://localhost:3100",
  });
  status("Saved.", "ok");
});

$("test").addEventListener("click", async () => {
  const backendUrl = cleanUrl($("backend-url").value);
  const secret = $("capture-secret").value.trim();
  if (!backendUrl || !secret) {
    status("Fill in both the backend URL and the secret first.", "err");
    return;
  }
  status("Testing…");

  let res;
  try {
    res = await fetch(`${backendUrl}/api/capture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({}),
    });
  } catch {
    status("Couldn't reach that URL from the browser.", "err");
    return;
  }

  if (res.status === 401 || res.status === 403) {
    status("Backend reachable, but the secret was rejected.", "err");
    return;
  }
  if (res.status === 400) {
    status("Connected — secret accepted.", "ok");
    return;
  }
  status(`Unexpected response (${res.status}).`, "err");
});

load();
