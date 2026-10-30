import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Video Radar — spot AI videos on YouTube" },
      { name: "description", content: "Browser extension that flags AI-generated YouTube videos in your feed, fully offline." },
      { property: "og:title", content: "AI Video Radar" },
      { property: "og:description", content: "Flag AI-generated YouTube videos before you click. 100% local." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const download = () => {
  fetch("/ai-video-radar.zip")
    .then((r) => { if (!r.ok) throw new Error("Download failed"); return r.blob(); })
    .then((b) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(b);
      a.download = "ai-video-radar.zip";
      a.click();
      URL.revokeObjectURL(a.href);
    })
    .catch((e) => alert(e.message));
};

const steps = [
  ["1 · Channel list", "Is the channel on your offline AI checklist? → red AI badge."],
  ["2 · Description", "Title or description mentions AI tools (Sora, ElevenLabs, TTS…)? → red."],
  ["3 · 10s voice check", "Still clean? It listens to 10 seconds locally. AI voice → red, otherwise green."],
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Browser extension · offline</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">AI Video Radar</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          See which YouTube videos are AI before you click. Nothing leaves your computer.
        </p>
        <button onClick={download} className="mt-8 rounded-md bg-primary px-6 py-3 font-bold text-primary-foreground hover:opacity-90">
          Download extension (.zip)
        </button>
        <div className="mt-12 grid gap-3">
          {steps.map(([t, d]) => (
            <div key={t} className="rounded-lg border border-border bg-card p-4">
              <h3 className="font-bold">{t}</h3>
              <p className="text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
        <h2 className="mt-12 text-xl font-bold">Install</h2>
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>Unzip the file.</li>
          <li><b>Chrome / Edge / Brave / Opera / Vivaldi / Arc:</b> open the extensions page, turn on Developer mode, click “Load unpacked” and pick the folder.</li>
          <li><b>Firefox:</b> open about:debugging → This Firefox → “Load Temporary Add-on” → pick manifest.json.</li>
          <li><b>Safari:</b> needs converting with Apple's Xcode tool on a Mac.</li>
        </ol>
      </div>
    </main>
  );
}
