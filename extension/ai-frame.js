// Local thumbnail AI check. Runs inside an extension page; the model ships in the extension.
// Only fetches the thumbnail image YouTube already shows (i.ytimg.com). Nothing is uploaded.
(() => {
  const api = typeof browser !== "undefined" ? browser : chrome;
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = api.runtime.getURL("ort/");
  const PARTS = 5, SIZE = 256, MEAN = [0.485, 0.456, 0.406], STD = [0.229, 0.224, 0.225];
  let session;
  const load = () => (session ||= (async () => {
    const bufs = await Promise.all(Array.from({ length: PARTS }, (_, i) => fetch(api.runtime.getURL(`model/part${i}`)).then((r) => r.arrayBuffer())));
    const all = new Uint8Array(bufs.reduce((n, b) => n + b.byteLength, 0));
    let o = 0; for (const b of bufs) { all.set(new Uint8Array(b), o); o += b.byteLength; }
    return ort.InferenceSession.create(all.buffer, { executionProviders: ["wasm"], graphOptimizationLevel: "all" });
  })());

  async function pixels(urls) {
    for (const url of urls) {
      try {
        const r = await fetch(url, { credentials: "omit" });
        if (!r.ok) continue;
        const bmp = await createImageBitmap(await r.blob(), { resizeWidth: SIZE, resizeHeight: SIZE, resizeQuality: "high" });
        const c = new OffscreenCanvas(SIZE, SIZE).getContext("2d");
        c.drawImage(bmp, 0, 0);
        const d = c.getImageData(0, 0, SIZE, SIZE).data, n = SIZE * SIZE, x = new Float32Array(3 * n);
        for (let i = 0; i < n; i++) for (let ch = 0; ch < 3; ch++) x[ch * n + i] = (d[i * 4 + ch] / 255 - MEAN[ch]) / STD[ch];
        return x;
      } catch {}
    }
    return null;
  }

  let chain = Promise.resolve();
  addEventListener("message", (e) => {
    if (!/^https:\/\/([a-z0-9-]+\.)*youtube\.com$/.test(e.origin)) return;
    const m = e.data;
    if (m?.type !== "air-thumb" || !/^[\w-]{11}$/.test(m.id)) return;
    chain = chain.then(async () => {
      let score = null;
      try {
        const s = await load();
        const x = await pixels([`https://i.ytimg.com/vi/${m.id}/hq720.jpg`, `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`]);
        if (x) {
          const out = await s.run({ pixel_values: new ort.Tensor("float32", x, [1, 3, SIZE, SIZE]) });
          const [a, r] = out.logits.data; // 0 = artificial, 1 = real
          score = 1 / (1 + Math.exp(r - a));
        }
      } catch (err) { console.warn("AI Video Radar thumbnail check failed", err); }
      e.source.postMessage({ type: "air-thumb-result", id: m.id, score }, e.origin);
    });
  });
  e_ready();
  function e_ready() { parent.postMessage({ type: "air-frame-ready" }, "*"); }
})();
