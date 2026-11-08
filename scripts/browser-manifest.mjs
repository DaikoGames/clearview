// Build-time only: never shipped as extension code.
export function browserManifest(source, browser) {
  const manifest = structuredClone(source);
  if (browser === "chromium" || browser === "safari") {
    delete manifest.browser_specific_settings;
  } else if (browser === "firefox") {
    manifest.browser_specific_settings.gecko.data_collection_permissions = { required: ["none"] };
  } else {
    throw new Error(`Unsupported browser target: ${browser}`);
  }
  return manifest;
}