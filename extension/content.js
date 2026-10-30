// AI Video Radar — fully local. No network requests are made.
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  let userChannels = [], cache = {}, settings = { blur: false };
  const norm = (s) => (s || "").toLowerCase().replace(/^@/, "").trim();
  let channelSet = new Set();

  api.storage.local.get(["userChannels", "verdicts", "settings"], (d) => {
    userChannels = d.userChannels || [];
    cache = d.verdicts || {};
    settings = Object.assign(settings, d.settings || {});
    channelSet = new Set([...AIR_CHANNELS, ...userChannels].map(norm));
    scan();
    watchPage();
  });

  const save = () => api.storage.local.set({ verdicts: cache });
  const hasKeyword = (t) => { t = (t || "").toLowerCase(); return AIR_KEYWORDS.some((k) => t.includes(k)); };
  const vidOf = (href) => { const m = (href || "").match(/(?:v=|shorts\/)([\w-]{11})/); return m && m[1]; };

  // ---------- FEED ----------
  const CARD = "ytd-rich-item-renderer,ytd-video-renderer,ytd-compact-video-renderer,ytd-grid-video-renderer,yt-lockup-view-model,ytd-reel-item-renderer,ytm-shorts-lockup-view-model";

  function verdictForCard(card) {
    const link = card.querySelector('a[href*="watch?v="],a[href*="/shorts/"]');
    const id = link && vidOf(link.getAttribute("href"));
    if (!id) return null;
    if (cache[id]) return { id, v: cache[id] };
    const chLink = card.querySelector('a[href^="/@"],a[href^="/channel/"]');
    const handle = chLink ? norm(decodeURIComponent(chLink.getAttribute("href").split("/")[1] || "")) : "";
    const chName = norm(card.querySelector("#channel-name #text, ytd-channel-name a, .yt-content-metadata-view-model__metadata-text")?.textContent);
    if ((handle && channelSet.has(handle)) || (chName && channelSet.has(chName))) return { id, v: "ai", why: "list" };
    const text = card.querySelector("#video-title,h3")?.textContent + " " +
      (card.querySelector("#description-text,.metadata-snippet-text,yt-formatted-string.metadata-snippet-text")?.textContent || "");
    if (hasKeyword(text)) return { id, v: "ai", why: "description" };
    return { id, v: "wait" };
  }

  function badge(card, r) {
    const thumb = card.querySelector("ytd-thumbnail,yt-thumbnail-view-model,a#thumbnail,.yt-lockup-view-model__content-image") || card;
    let b = thumb.querySelector(":scope > .air-badge");
    if (!b) { b = document.createElement("div"); thumb.classList.add("air-host"); thumb.appendChild(b); }
    const label = r.v === "ai" ? "AI" : r.v === "ok" ? "✓ HUMAN" : "? UNCHECKED";
    if (b.dataset.v === r.v) return;
    b.dataset.v = r.v;
    b.className = "air-badge air-" + r.v;
    b.textContent = label;
    b.title = r.why ? "Flagged by " + r.why : r.v === "wait" ? "Clean so far — voice check runs when you open it" : "";
    thumb.classList.toggle("air-blur", settings.blur && r.v === "ai");
  }

  function scan() {
    document.querySelectorAll(CARD).forEach((card) => {
      const r = verdictForCard(card);
      if (r) badge(card, r);
    });
  }

  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 250); })
    .observe(document.documentElement, { childList: true, subtree: true });

  // ---------- WATCH PAGE ----------
  let currentId = null, ctx = null, analyser = null, hooked = new WeakSet();

  function pill(v, text) {
    let p = document.querySelector(".air-watch");
    if (!p) { p = document.createElement("div"); p.className = "air-watch"; document.body.appendChild(p); }
    p.className = "air-watch air-" + v; p.textContent = text;
  }

  function setVerdict(id, v) { cache[id] = v; save(); scan(); }

  async function checkWatch() {
    const id = vidOf(location.href);
    if (!id || id === currentId) return;
    currentId = id;
    if (cache[id]) return pill(cache[id], cache[id] === "ai" ? "AI VIDEO" : "✓ Human voice");
    pill("wait", "Checking…");
    await new Promise((r) => setTimeout(r, 1500));
    const handle = norm(document.querySelector("ytd-video-owner-renderer a[href^='/@']")?.getAttribute("href")?.slice(1));
    const name = norm(document.querySelector("ytd-video-owner-renderer #channel-name #text,#owner #text")?.textContent);
    if (channelSet.has(handle) || channelSet.has(name)) { setVerdict(id, "ai"); return pill("ai", "AI VIDEO · on list"); }
    const desc = (document.querySelector("#description-inline-expander,#description,ytd-text-inline-expander")?.textContent || "") +
      " " + (document.title || "");
    if (hasKeyword(desc)) { setVerdict(id, "ai"); return pill("ai", "AI VIDEO · description"); }
    pill("wait", "Listening 10s…");
    const v = await voiceCheck(id);
    if (id !== currentId) return;
    if (v === null) return pill("wait", "Voice check: no audio");
    setVerdict(id, v);
    pill(v, v === "ai" ? "AI VIDEO · AI voice" : "✓ Human voice");
  }

  // Local heuristic on 10s of audio. TTS voices tend to have very steady loudness,
  // uniform pitch, few natural breaths/pauses, and a hard high-frequency cutoff.
  function voiceCheck(id) {
    return new Promise((resolve) => {
      const video = document.querySelector("video.html5-main-video,video");
      if (!video) return resolve(null);
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (!hooked.has(video)) {
          const src = ctx.createMediaElementSource(video);
          analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
          src.connect(analyser); analyser.connect(ctx.destination);
          hooked.add(video);
        }
        ctx.resume();
      } catch (e) { return resolve(null); }
      const bins = new Float32Array(analyser.frequencyBinCount);
      const binHz = ctx.sampleRate / analyser.fftSize;
      const loud = [], pitches = [], cutoffs = [];
      let samples = 0;
      const iv = setInterval(() => {
        if (id !== currentId) { clearInterval(iv); return resolve(null); }
        if (video.paused) return; // only count while playing
        analyser.getFloatFrequencyData(bins);
        let e = 0, peak = -Infinity, peakBin = 0, top = 0;
        for (let i = 2; i < bins.length; i++) {
          const p = Math.pow(10, bins[i] / 10); e += p;
          const hz = i * binHz;
          if (hz > 80 && hz < 400 && bins[i] > peak) { peak = bins[i]; peakBin = i; }
          if (bins[i] > -85) top = hz;
        }
        loud.push(10 * Math.log10(e + 1e-12));
        if (peak > -70) pitches.push(peakBin * binHz);
        cutoffs.push(top);
        if (++samples >= 200) { clearInterval(iv); resolve(score(loud, pitches, cutoffs)); }
      }, 50); // 200 × 50ms = 10s of playback
    });
  }

  const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
  function score(loud, pitches, cutoffs) {
    if (loud.length < 50 || Math.max(...loud) < -60) return null;
    const max = Math.max(...loud);
    const pauses = loud.filter((l) => l < max - 25).length / loud.length;
    let pts = 0;
    if (sd(loud) < 5) pts++;                       // very steady loudness
    if (pitches.length > 20 && sd(pitches) < 25) pts++; // monotone pitch
    if (pauses < 0.04) pts++;                      // no breaths / pauses
    const c = cutoffs.sort((a, b) => a - b)[Math.floor(cutoffs.length / 2)];
    if (c > 0 && c < 11500 && sd(cutoffs) < 600) pts++; // hard band-limit typical of TTS
    return pts >= 3 ? "ai" : "ok";
  }

  function watchPage() {
    checkWatch();
    document.addEventListener("yt-navigate-finish", () => { currentId = null; document.querySelector(".air-watch")?.remove(); checkWatch(); });
  }

  api.storage.onChanged.addListener((ch) => {
    if (ch.userChannels) { userChannels = ch.userChannels.newValue || []; channelSet = new Set([...AIR_CHANNELS, ...userChannels].map(norm)); }
    if (ch.settings) settings = Object.assign(settings, ch.settings.newValue);
    if (ch.verdicts) cache = ch.verdicts.newValue || {};
    document.querySelectorAll(".air-badge").forEach((b) => (b.dataset.v = ""));
    scan();
  });
})();
