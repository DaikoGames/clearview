import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { afterEach, describe, expect, it, vi } from "vitest";

const context = createContext({});
runInContext(readFileSync(resolve("extension/text-check.js"), "utf8"), context);
const selectors = context["AIR_TEXT_SELECTORS"] as Record<string, string>;
const extract = context["AIR_TEXT_IN"] as (element: Element, selectors: string) => string;
const check = context["AIR_CHECK_TEXT"] as (text: string) => boolean;

afterEach(() => { document.body.innerHTML = ""; vi.restoreAllMocks(); });

function displayed(html: string) {
  document.body.innerHTML = html;
  vi.spyOn(Element.prototype, "getClientRects").mockReturnValue([{ width: 100, height: 20 }] as unknown as DOMRectList);
  return document.body;
}

describe("displayed text reaches the local warning check", () => {
  it("reads descriptions in YouTube's inline expander", () => {
    const page = displayed('<div id="description"><ytd-text-inline-expander><span class="yt-core-attributed-string">As an AI language model, I cannot experience emotions.</span></ytd-text-inline-expander></div>');
    const text = extract(page, selectors.watch);
    expect(text.trim()).toBe("As an AI language model, I cannot experience emotions.");
    expect(check(text)).toBe(true);
  });

  it("reads attributed text in opened modern transcript segments", () => {
    const page = displayed('<yt-transcript-segment-view-model><span class="yt-core-attributed-string">Here is the requested YouTube script for your video.</span></yt-transcript-segment-view-model>');
    expect(check(extract(page, selectors.transcript))).toBe(true);
  });

  it("does not use hidden transcripts as evidence", () => {
    const page = displayed('<div hidden><yt-transcript-segment-view-model><span class="yt-core-attributed-string">As an AI language model, I cannot experience emotions.</span></yt-transcript-segment-view-model></div>');
    expect(extract(page, selectors.transcript)).toBe("");
  });

  it("keeps normal displayed writing unflagged", () => {
    const page = displayed('<div id="description"><ytd-text-inline-expander>Today we compare ChatGPT and other AI tools.</ytd-text-inline-expander></div>');
    expect(check(extract(page, selectors.watch))).toBe(false);
  });
});