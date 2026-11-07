import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import zipAsset from "@/assets/ai-video-radar.zip.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Video Radar — spot AI videos on YouTube" },
      { name: "description", content: "Local YouTube badges for official AI labels, creator lists, and an on-device AI model that flags AI-looking thumbnails." },
      { property: "og:title", content: "AI Video Radar" },
      { property: "og:description", content: "Local AI labels, creator-list matches, and an on-device thumbnail AI check. Nothing is uploaded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

const steps = [
  ["1 · YouTube AI labels + blocklist", "An official YouTube AI disclosure is available on the feed card, or the creator is on AiSList? → red AI badge. Labels only shown after opening a video cannot be checked from the feed."],
  ["2 · Kagi Small Web", "Creator matches the bundled Kagi YouTube list? → green Kagi-listed badge. This is list membership, not proof that every video is AI-free. AI blocklist matches take priority."],
  ["3 · Thumbnail AI (on your computer)", "A built-in image model looks at each thumbnail near your screen and shows orange AI thumbnail? when it is very sure the image looks AI-made. It runs offline after install (download is ~140 MB). Heavily edited human thumbnails can still trigger it, so it is a hint, not proof."],
  ["4 · Text clues", "Possible AI-assistant wording in displayed titles, descriptions, or transcripts you open? → amber Suspected AI warning. This is a simple local wording check, not reliable authorship detection. Quotes can trigger it; ordinary AI writing may be missed. It cannot detect an AI voice."],
  ["5 · Everything else", "No available AI disclosure, text warning, or confirmed list match? → grey ? badge. A missing label does not mean non-AI. No audio checks, background playback, or online lookups. Transcripts are only checked once you open them; text hidden from the feed cannot be checked before clicking."],
];

function Index() {
  return (
    <main className="min-h-screen bg-background text-foreground px-6 py-16">
      <div className="mx-auto max-w-2xl">
        <p className="font-mono text-xs uppercase tracking-widest text-primary">Browser extension · offline</p>
        <h1 className="mt-3 text-5xl font-black tracking-tight">AI Video Radar</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          See AI-blocklisted, Kagi-listed, and unknown creators before you click. All checks stay on your computer.
        </p>
        <Button asChild size="lg" className="mt-8 font-bold">
          <a href={zipAsset.url} download="ai-video-radar.zip" target="_blank" rel="noopener">
            Download extension (.zip, ~140 MB)
          </a>
        </Button>
        <p className="mt-3 text-sm text-muted-foreground">Kagi snapshot bundled October 31, 2026. New snapshots come with extension downloads, not automatic online updates. Unresolved channel identities stay unknown.</p>
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
