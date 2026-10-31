// AI Video Radar — fully local. Only talks to YouTube itself; no third-party servers.
// Marks channels on the AiSList blocklist as AI; everything else stays "?" (unknown).
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;

  let settings = { blur: false };
  let userChannels = [];
  const norm = (s) => (s || "").toLowerCase().replace(/^@/, "").trim();
  const BASE = new Set(AIR_BLOCKLIST.split("\n").map(norm).filter(Boolean));
  let channelSet = BASE;
  const rebuild = () => { channelSet = new Set(BASE); userChannels.forEach((c) => channelSet.add(norm(c))); };

  api.storage.local.get(["userChannels", "settings"], (d) => {
    userChannels = d.userChannels || [];
    settings = Object.assign(settings, d.settings || {});
    rebuild(); scan(); watchPage();
  });

  const onList = (...keys) => keys.some((k) => k && channelSet.has(norm(k)));

  const CARD = "ytd-rich-item-renderer,ytd-video-renderer,ytd-compact-video-renderer,ytd-grid-video-renderer,yt-lockup-view-model,ytd-reel-item-renderer,ytm-shorts-lockup-view-model";

  function verdictForCard(card) {
    const link = card.querySelector('a[href*="watch?v="],a[href*="/shorts/"]');
    if (!link) return null;
    const chLink = card.querySelector('a[href^="/@"],a[href^="/channel/"]');
    const href = chLink ? chLink.getAttribute("href") : "";
    const part = href ? decodeURIComponent(href.split("/")[href.startsWith("/@") ? 1 : 2] || "") : "";
    const chName = card.querySelector("#channel-name #text, ytd-channel-name a, .yt-content-metadata-view-model__metadata-text")?.textContent;
    return onList(part, chName) ? "ai" : "unknown";
  }

  const LABEL = { ai: "AI", unknown: "?" };
  function badge(card, v) {
    const thumb = card.querySelector("ytd-thumbnail,yt-thumbnail-view-model,a#thumbnail,.yt-lockup-view-model__content-image") || card;
    let b = thumb.querySelector(":scope > .air-badge");
    if (!b) { b = document.createElement("div"); thumb.classList.add("air-host"); thumb.appendChild(b); }
    thumb.classList.toggle("air-blur", settings.blur && v === "ai");
    if (b.dataset.v === v) return;
    b.dataset.v = v;
    b.className = "air-badge air-" + v;
    b.textContent = LABEL[v];
  }

  function scan() {
    document.querySelectorAll(CARD).forEach((card) => { const v = verdictForCard(card); if (v) badge(card, v); });
  }
  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 250); })
    .observe(document.documentElement, { childList: true, subtree: true });

  // ---------- WATCH PAGE ----------
  function pill(v, text) {
    let p = document.querySelector(".air-watch");
    if (!p) { p = document.createElement("div"); document.body.appendChild(p); }
    p.className = "air-watch air-" + v; p.textContent = text;
  }
  function checkWatch() {
    const id = (location.href || "").match(/(?:v=|shorts\/)([\w-]{11})/);
    if (!id) return;
    const owner = document.querySelector("ytd-video-owner-renderer a[href^='/@'],ytd-video-owner-renderer a[href^='/channel/']")?.getAttribute("href") || "";
    const name = document.querySelector("ytd-video-owner-renderer #channel-name #text,#owner #text")?.textContent;
    pill("unknown", "? Unknown");
    if (onList(owner.split("/")[owner.startsWith("/@") ? 1 : 2], name)) pill("ai", "AI VIDEO · AiSList");
  }
  function watchPage() {
    checkWatch();
    document.addEventListener("yt-navigate-finish", () => checkWatch());
  }

  api.storage.onChanged.addListener((ch) => {
    if (ch.userChannels) { userChannels = ch.userChannels.newValue || []; rebuild(); }
    if (ch.settings) settings = Object.assign(settings, ch.settings.newValue);
    document.querySelectorAll(".air-badge").forEach((b) => (b.dataset.v = ""));
    scan();
  });
})();
