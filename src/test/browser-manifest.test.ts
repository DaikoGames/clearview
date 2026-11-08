import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { browserManifest } from "../../scripts/browser-manifest.mjs";

const source = JSON.parse(readFileSync("extension/manifest.json", "utf8"));
describe("full browser extension packaging", () => {
  it("creates a Chrome-compatible Manifest V3 without Firefox-only settings", () => {
    const manifest = browserManifest(source, "chromium");
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.browser_specific_settings).toBeUndefined();
    expect(manifest.content_scripts).toEqual(source.content_scripts);
  });
  it("preserves the Firefox ID and declares no data collection", () => {
    const manifest = browserManifest(source, "firefox");
    expect(manifest.browser_specific_settings.gecko.id).toBe("ai-video-radar@local");
    expect(manifest.browser_specific_settings.gecko.data_collection_permissions.required).toEqual(["none"]);
    expect(manifest.content_security_policy.extension_pages).toContain("'wasm-unsafe-eval'");
  });
  it("keeps the Safari input complete and independent of Chromium conversion", () => {
    expect(browserManifest(source, "safari").action.default_popup).toBe("popup.html");
    expect(source.browser_specific_settings.gecko.id).toBe("ai-video-radar@local");
    expect(() => browserManifest(source, "unsupported")).toThrow();
  });
});