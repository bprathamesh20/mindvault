(() => {
  if (window.__mindvaultToastInstalled) return;
  window.__mindvaultToastInstalled = true;

  let el = null;
  let timers = [];

  const MESSAGES = {
    saved: "✓ Saved to MindVault",
    duplicate: "✓ Already in MindVault",
    retrying: "⟳ Save retry queued",
  };

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type !== "MV_SAVED") return;

    timers.forEach(clearTimeout);
    el?.remove();

    el = document.createElement("div");
    el.textContent = MESSAGES[msg.outcome] ?? MESSAGES.saved;
    el.setAttribute("role", "status");
    el.style.cssText = [
      "position:fixed",
      "left:50%",
      "bottom:28px",
      "z-index:2147483647",
      "transform:translateX(-50%) translateY(10px)",
      "background:#111827",
      "color:#fff",
      "padding:10px 18px",
      "border-radius:999px",
      "font:600 13px/1.2 -apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif",
      "letter-spacing:.01em",
      "box-shadow:0 10px 30px rgba(0,0,0,.28)",
      "opacity:0",
      "transition:opacity .18s ease,transform .18s ease",
      "pointer-events:none",
      "max-width:min(80vw,420px)",
      "white-space:nowrap",
      "overflow:hidden",
      "text-overflow:ellipsis",
    ].join(";");

    (document.body || document.documentElement).appendChild(el);
    requestAnimationFrame(() => {
      if (!el) return;
      el.style.opacity = "1";
      el.style.transform = "translateX(-50%) translateY(0)";
    });

    timers = [
      setTimeout(() => {
        if (!el) return;
        el.style.opacity = "0";
        el.style.transform = "translateX(-50%) translateY(10px)";
      }, 2000),
      setTimeout(() => {
        el?.remove();
        el = null;
      }, 2300),
    ];
  });
})();
