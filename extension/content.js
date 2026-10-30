// AI Video Radar — fully local. Only talks to YouTube itself; no third-party servers.
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  const PROBE = "air-probe";

  // ---------- shared: 10s voice heuristic ----------
  const sd = (a) => { const m = a.reduce((x, y) => x + y, 0) / a.length; return Math.sqrt(a.reduce((x, y) => x + (y - m) ** 2, 0) / a.length); };
  function score(loud, pitches, cutoffs) {
    if (loud.length < 50 || Math.max(...loud) < -60) return null;
    const max = Math.max(...loud);
    const pauses = loud.filter((l) => l < max - 25).length / loud.length;
    let pts = 0;
    if (sd(loud) < 5) pts++;                            // very steady loudness
    if (pitches.length > 20 && sd(pitches) < 25) pts++; // monotone pitch
    if (pauses < 0.04) pts++;                           // no breaths / pauses
    const c = cutoffs.slice().sort((a, b) => a - b)[Math.floor(cutoffs.length / 2)];
    if (c > 0 && c < 11500 && sd(cutoffs) < 600) pts++; // hard band-limit typical of TTS
    return pts >= 3 ? "ai" : "ok";
  }
  // silent=true: audio goes only into the analyser, you never hear it.
  function listen(video, silent, alive) {
    return new Promise((resolve) => {
      let ctx, analyser;
      try {
        ctx = video.__airCtx || new (window.AudioContext || window.webkitAudioContext)();
        if (!video.__airAn) {
          const src = ctx.createMediaElementSource(video);
          analyser = ctx.createAnalyser(); analyser.fftSize = 2048;
          src.connect(analyser);
          if (silent) { const g = ctx.createGain(); g.gain.value = 0; analyser.connect(g); g.connect(ctx.destination); }
          else analyser.connect(ctx.destination);
          video.__airCtx = ctx; video.__airAn = analyser;
        }
        analyser = video.__airAn; ctx.resume();
      } catch (e) { return resolve(null); }
      const bins = new Float32Array(analyser.frequencyBinCount);
      const binHz = ctx.sampleRate / analyser.fftSize;
      const loud = [], pitches = [], cutoffs = [];
      let samples = 0, idle = 0;
      const iv = setInterval(() => {
        if (!alive()) { clearInterval(iv); return resolve(null); }
        if (video.paused || video.readyState < 3) { if (++idle > 300) { clearInterval(iv); resolve(null); } return; }
        analyser.getFloatFrequencyData(bins);
        let e = 0, peak = -Infinity, peakBin = 0, top = 0;
        for (let i = 2; i < bins.length; i++) {
          e += Math.pow(10, bins[i] / 10);
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

  // ---------- PROBE MODE: hidden embed frame that checks one video ----------
  if (location.pathname.startsWith("/embed/") && location.hash.includes(PROBE)) {
    const id = location.pathname.split("/")[2];
    const send = (v) => parent.postMessage({ air: 1, id, v }, "*");
    const start = Date.now();
    const wait = setInterval(async () => {
      const video = document.querySelector("video");
      if (Date.now() - start > 15000) { clearInterval(wait); return send(null); }
      if (!video) return;
      clearInterval(wait);
      video.muted = false; video.volume = 1;
      try { await video.play(); } catch (e) { return send(null); }
      send(await listen(video, true, () => true));
      video.pause();
    }, 300);
    return;
  }
  if (window.top !== window) return;

  // ---------- MAIN PAGE ----------
  let userChannels = [], cache = {}, settings = { blur: false, background: true };
  const norm = (s) => (s || "").toLowerCase().replace(/^@/, "").trim();
  const BASE = new Set(AIR_BLOCKLIST.split("\n"));
  let channelSet = BASE;
  const rebuild = () => { channelSet = new Set(BASE); userChannels.forEach((c) => channelSet.add(norm(c))); };

  api.storage.local.get(["userChannels", "verdicts", "settings"], (d) => {
    userChannels = d.userChannels || [];
    cache = d.verdicts || {};
    settings = Object.assign(settings, d.settings || {});
    rebuild(); scan(); watchPage();
  });

  let saveT;
  const save = () => { clearTimeout(saveT); saveT = setTimeout(() => api.storage.local.set({ verdicts: cache }), 500); };
  const vidOf = (href) => { const m = (href || "").match(/(?:v=|shorts\/)([\w-]{11})/); return m && m[1]; };
  const onList = (...keys) => keys.some((k) => k && channelSet.has(norm(k)));

  const CARD = "ytd-rich-item-renderer,ytd-video-renderer,ytd-compact-video-renderer,ytd-grid-video-renderer,yt-lockup-view-model,ytd-reel-item-renderer,ytm-shorts-lockup-view-model";

  function verdictForCard(card) {
    const link = card.querySelector('a[href*="watch?v="],a[href*="/shorts/"]');
    const id = link && vidOf(link.getAttribute("href"));
    if (!id) return null;
    if (cache[id]) return { id, v: cache[id] };
    const chLink = card.querySelector('a[href^="/@"],a[href^="/channel/"]');
    const part = chLink ? decodeURIComponent(chLink.getAttribute("href").split("/")[chLink.getAttribute("href").startsWith("/@") ? 1 : 2] || "") : "";
    const chName = card.querySelector("#channel-name #text, ytd-channel-name a, .yt-content-metadata-view-model__metadata-text")?.textContent;
    if (onList(part, chName)) { cache[id] = "ai"; save(); return { id, v: "ai", why: "AiSList" }; }
    enqueue(id);
    return { id, v: probing === id ? "run" : "wait" };
  }

  const LABEL = { ai: "AI", ok: "✓ NON AI", wait: "? QUEUED", run: "🎧 CHECKING…" };
  function badge(card, r) {
    const thumb = card.querySelector("ytd-thumbnail,yt-thumbnail-view-model,a#thumbnail,.yt-lockup-view-model__content-image") || card;
    let b = thumb.querySelector(":scope > .air-badge");
    if (!b) { b = document.createElement("div"); thumb.classList.add("air-host"); thumb.appendChild(b); }
    thumb.classList.toggle("air-blur", settings.blur && r.v === "ai");
    if (b.dataset.v === r.v) return;
    b.dataset.v = r.v;
    b.className = "air-badge air-" + (r.v === "run" ? "wait" : r.v);
    b.textContent = LABEL[r.v];
  }

  function scan() {
    document.querySelectorAll(CARD).forEach((card) => { const r = verdictForCard(card); if (r) badge(card, r); });
  }
  let t;
  new MutationObserver(() => { clearTimeout(t); t = setTimeout(scan, 250); })
    .observe(document.documentElement, { childList: true, subtree: true });

  // ---------- BACKGROUND 10s CHECK (one video at a time, silent) ----------
  const queue = [], queued = new Set(), failed = new Set();
  let probing = null, frame = null, probeTimer = null;
  function enqueue(id) {
    if (!settings.background || queued.has(id) || failed.has(id) || cache[id]) return;
    queued.add(id); queue.push(id); next();
  }
  function next() {
    if (probing || !queue.length || document.hidden) return;
    if (vidOf(location.href) && !document.querySelector("video")?.paused) return setTimeout(next, 3000); // don't fight your own playback
    probing = queue.shift();
    frame = document.createElement("iframe");
    frame.className = "air-probe";
    frame.allow = "autoplay";
    frame.src = `https://www.youtube.com/embed/${probing}?autoplay=1&controls=0&start=15&playsinline=1#${PROBE}`;
    document.body.appendChild(frame);
    probeTimer = setTimeout(() => finish(probing, null), 30000);
    scan();
  }
  function finish(id, v) {
    if (id !== probing) return;
    clearTimeout(probeTimer); frame?.remove(); frame = null; probing = null;
    queued.delete(id);
    if (v) { cache[id] = v; save(); } else failed.add(id);
    document.querySelectorAll(".air-badge").forEach((b) => (b.dataset.v = ""));
    scan(); setTimeout(next, 200);
  }
  window.addEventListener("message", (e) => {
    if (e.origin.endsWith("youtube.com") && e.data && e.data.air) finish(e.data.id, e.data.v);
  });
  document.addEventListener("visibilitychange", next);

  // ---------- WATCH PAGE ----------
  let currentId = null;
  function pill(v, text) {
    let p = document.querySelector(".air-watch");
    if (!p) { p = document.createElement("div"); document.body.appendChild(p); }
    p.className = "air-watch air-" + v; p.textContent = text;
  }
  async function checkWatch() {
    const id = vidOf(location.href);
    if (!id || id === currentId) return;
    currentId = id;
    if (cache[id]) return pill(cache[id], cache[id] === "ai" ? "AI VIDEO" : "✓ NON AI");
    pill("wait", "Checking…");
    await new Promise((r) => setTimeout(r, 1500));
    const owner = document.querySelector("ytd-video-owner-renderer a[href^='/@'],ytd-video-owner-renderer a[href^='/channel/']")?.getAttribute("href") || "";
    const name = document.querySelector("ytd-video-owner-renderer #channel-name #text,#owner #text")?.textContent;
    if (onList(owner.split("/")[owner.startsWith("/@") ? 1 : 2], name)) { cache[id] = "ai"; save(); scan(); return pill("ai", "AI VIDEO · AiSList"); }
    pill("wait", "Listening 10s…");
    const video = document.querySelector("video.html5-main-video,video");
    const v = video ? await listen(video, false, () => id === currentId) : null;
    if (id !== currentId) return;
    if (!v) return pill("wait", "Voice check: no audio");
    cache[id] = v; save(); scan();
    pill(v, v === "ai" ? "AI VIDEO · AI voice" : "✓ NON AI");
  }
  function watchPage() {
    checkWatch();
    document.addEventListener("yt-navigate-finish", () => { currentId = null; document.querySelector(".air-watch")?.remove(); checkWatch(); });
  }

  api.storage.onChanged.addListener((ch) => {
    if (ch.userChannels) { userChannels = ch.userChannels.newValue || []; rebuild(); }
    if (ch.settings) settings = Object.assign(settings, ch.settings.newValue);
    if (ch.verdicts) cache = ch.verdicts.newValue || {};
    document.querySelectorAll(".air-badge").forEach((b) => (b.dataset.v = ""));
    scan();
  });
})();
