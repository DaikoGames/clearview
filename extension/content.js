// AI Video Radar — fully local. Only talks to YouTube itself; no third-party servers.
// AiSList -> AI, Kagi Small Web -> Kagi-listed, otherwise unknown.
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;

  let settings = { blur: false };
  let userChannels = [];
  let classify;
  const rebuild = () => { classify = AIR_CREATE_CLASSIFIER([...AIR_BLOCKLIST.split("\n"), ...userChannels], AIR_KAGI.creators); };
  rebuild();

  api.storage.local.get(["userChannels", "settings"], (d) => {
    userChannels = d.userChannels || [];
    settings = Object.assign(settings, d.settings || {});
    rebuild(); scan(); watchPage();
  });

  function channelKeys(element) {
    const keys = Array.from(element.querySelectorAll('a[href]')).flatMap((a) => {
      try {
        const url = new URL(a.getAttribute("href"), location.origin);
        if (url.hostname !== "youtube.com" && !url.hostname.endsWith(".youtube.com")) return [];
        const match = url.pathname.match(/^\/(?:channel\/([^/]+)|(@[^/]+))/);
        return match ? [decodeURIComponent(match[1] || match[2])] : [];
      } catch { return []; }
    });
    // YouTube renderers can carry a stable ID even when the visible link uses a handle.
    const data = element.data;
    const runs = data?.shortBylineText?.runs || data?.videoRenderer?.shortBylineText?.runs || data?.content?.videoRenderer?.shortBylineText?.runs || [];
    runs.forEach((run) => { const id = run.navigationEndpoint?.browseEndpoint?.browseId; if (id) keys.push(id); });
    return keys;
  }

  const CARD = "ytd-rich-item-renderer,ytd-video-renderer,ytd-compact-video-renderer,ytd-grid-video-renderer,yt-lockup-view-model,ytd-reel-item-renderer,ytm-shorts-lockup-view-model";

  function verdictForCard(card) {
    const link = card.querySelector('a[href*="watch?v="],a[href*="/shorts/"]');
    if (!link) return null;
    const chName = card.querySelector("#channel-name #text, ytd-channel-name a, .yt-content-metadata-view-model__metadata-text")?.textContent;
    return AIR_HAS_AI_DISCLOSURE(card) ? "ai" : classify(channelKeys(card), chName);
  }

  const LABEL = { ai: "AI", kagi: "Kagi-listed", unknown: "?" };
  function badge(card, v) {
    const thumb = card.querySelector("ytd-thumbnail,yt-thumbnail-view-model,a#thumbnail,.yt-lockup-view-model__content-image") || card;
    let b = thumb.querySelector(":scope > .air-badge");
    if (!b) { b = document.createElement("div"); thumb.classList.add("air-host"); thumb.appendChild(b); }
    thumb.classList.toggle("air-blur", settings.blur && v === "ai");
    if (b.dataset.v === v) return;
    b.dataset.v = v;
    b.className = "air-badge air-" + v;
    b.textContent = LABEL[v];
    b.title = v === "kagi" ? "On the bundled Kagi Small Web list; not verified AI-free." : v === "ai" ? "YouTube AI disclosure or AI creator blocklist match." : "No available AI disclosure or creator-list match.";
  }

  function scan() {
    document.querySelectorAll(CARD).forEach((card) => { const v = verdictForCard(card); if (v) badge(card, v); });
    checkWatch();
  }
  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 250); })
    .observe(document.documentElement, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ["aria-label", "title", "href"] });

  // ---------- WATCH PAGE ----------
  function pill(v, text) {
    let p = document.querySelector(".air-watch");
    if (!p) { p = document.createElement("div"); document.body.appendChild(p); }
    p.className = "air-watch air-" + v; p.textContent = text;
  }
  function checkWatch() {
    const id = (location.href || "").match(/(?:v=|shorts\/)([\w-]{11})/);
    if (!id) { document.querySelector(".air-watch")?.remove(); return; }
    const owner = document.querySelector("ytd-video-owner-renderer,#owner");
    const name = document.querySelector("ytd-video-owner-renderer #channel-name #text,#owner #text")?.textContent;
    const watch = document.querySelector("ytd-watch-metadata");
    const disclosed = AIR_HAS_AI_DISCLOSURE(watch);
    const v = disclosed ? "ai" : classify(owner ? channelKeys(owner) : [], name);
    const text = { ai: disclosed ? "AI VIDEO · YouTube label" : "AI VIDEO · Blocklist", kagi: "Kagi-listed · Not verified AI-free", unknown: "? Unknown" }[v];
    const current = document.querySelector(".air-watch");
    if (current?.textContent !== text) pill(v, text);
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
