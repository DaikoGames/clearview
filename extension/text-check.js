// Conservative text artifacts, not an AI authorship detector or voice detector.
var AIR_TEXT_SELECTORS = {
  feed: '#video-title,#description-text,.metadata-snippet-text,.yt-lockup-metadata-view-model__title,.yt-lockup-metadata-view-model__title-text',
  watch: '#description-inline-expander,#description #description-text,#description yt-attributed-string,#description ytd-text-inline-expander,#description .yt-core-attributed-string,#title h1',
  transcript: 'ytd-transcript-segment-renderer .segment-text,yt-transcript-segment-view-model .segment-text,yt-transcript-segment-view-model .yt-core-attributed-string',
};

var AIR_CHECK_TEXT = function (text) {
  const value = String(text || "").slice(0, 80000).replace(/\s+/g, " ").trim();
  const artifacts = [
    /\bas an ai (?:language )?model[,\s]/i,
    /\bas a large language model[,\s]/i,
    /\bi(?: am|'m) an ai (?:language model|assistant)\b/i,
    /\bmy (?:knowledge cutoff|training data cutoff)\b/i,
    /\b(?:here is|here's) (?:the|your|a) (?:requested )?(?:youtube |video )?script (?:you requested|for your video)\b/i,
    /\bals (?:ki-sprachmodell|ki-modell|künstliche intelligenz) (?:kann|habe|bin) ich\b/i,
  ];
  return artifacts.some((pattern) => pattern.test(value));
};

var AIR_TEXT_IN = function (element, selectors) {
  if (!element) return "";
  const visible = Array.from(element.querySelectorAll(selectors)).filter((node) => {
    if (node.closest('.air-badge,.air-watch,[hidden],[aria-hidden="true"]')) return false;
    return node.getClientRects().length > 0;
  });
  // Read displayed text, not hidden descendants, and avoid counting nested matches twice.
  let text = "";
  for (const node of visible) {
    if (visible.some((parent) => parent !== node && parent.contains(node))) continue;
    text += " " + (node.innerText ?? node.textContent ?? "").slice(0, 80000 - text.length);
    if (text.length >= 80000) break;
  }
  return text.slice(0, 80000);
};