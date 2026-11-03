// Conservative text artifacts, not an AI authorship detector or voice detector.
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
  return Array.from(element.querySelectorAll(selectors)).filter((node) => {
    if (node.closest('.air-badge,.air-watch,[hidden],[aria-hidden="true"]')) return false;
    return node.getClientRects().length > 0;
  }).map((node) => node.textContent || "").join(" ").slice(0, 80000);
};