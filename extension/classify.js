// Shared offline classification, loaded before the YouTube content script.
var AIR_CREATE_CLASSIFIER = function (blockedKeys, kagiCreators) {
  const normalize = (s) => {
    let value = String(s || "").trim();
    try { value = decodeURIComponent(value); } catch { /* Keep malformed keys unchanged. */ }
    return value.replace(/^@/, "").toLowerCase();
  };
  const blocked = new Set(blockedKeys.map(normalize).filter(Boolean));
  const ids = new Set(kagiCreators.map((c) => c.id));
  const handles = new Set(kagiCreators.map((c) => normalize(c.handle)).filter(Boolean));
  return function (keys, name) {
    if ([...keys, name].some((key) => key && blocked.has(normalize(key)))) return "ai";
    if (keys.some((key) => key && (ids.has(key) || handles.has(normalize(key))))) return "kagi";
    return "unknown";
  };
};