import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Video Radar — Browser-Erweiterung" },
      { name: "description", content: "Local YouTube badges for official AI labels, creator lists, and an on-device AI model that flags AI-looking thumbnails." },
      { property: "og:title", content: "AI Video Radar" },
      { property: "og:description", content: "Local AI labels, creator-list matches, and an on-device thumbnail AI check. Nothing is uploaded." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  // The product is the standalone extension, not a download website.
  return null;
}
