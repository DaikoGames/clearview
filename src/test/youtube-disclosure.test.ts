import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

const context = createContext({});
runInContext(readFileSync(resolve("extension/disclosure.js"), "utf8"), context);
const detect = context["AIR_HAS_AI_DISCLOSURE"] as (element: Element) => boolean;
function card(markup: string) {
  const element = document.createElement("div");
  element.innerHTML = markup;
  return element;
}
describe("official YouTube AI labels already in the feed", () => {
  it("recognizes the Made with AI disclosure before opening a video", () => {
    expect(detect(card("<ytd-badge-supported-renderer>Made with AI</ytd-badge-supported-renderer>"))).toBe(true);
  });
  it("recognizes the altered or synthetic content disclosure", () => {
    expect(detect(card('<yt-badge-view-model aria-label="Altered or synthetic content"></yt-badge-view-model>'))).toBe(true);
  });
  it("recognizes the German disclosure", () => {
    expect(detect(card("<yt-badge-view-model>Mit KI erstellt</yt-badge-view-model>"))).toBe(true);
  });
  it("does not flag a video title about AI", () => {
    expect(detect(card('<a id="video-title" title="Made with AI">Made with AI</a>'))).toBe(false);
  });
  it("does not flag ordinary description text", () => {
    expect(detect(card("<p>Made with AI</p>"))).toBe(false);
  });
  it("does not infer non-AI or AI from absent disclosures", () => {
    expect(detect(card("<yt-badge-view-model>4K</yt-badge-view-model>"))).toBe(false);
  });
  it("does not count the extension's own badges", () => {
    expect(detect(card('<div class="air-badge"><yt-badge-view-model>Made with AI</yt-badge-view-model></div>'))).toBe(false);
  });
});