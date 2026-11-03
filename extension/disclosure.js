// Read only YouTube disclosure UI already supplied on the current page.
// Never treat a title, description, or our own badge as an official disclosure.
var AIR_HAS_AI_DISCLOSURE = function (element) {
  if (!element) return false;
  const labels = new Set([
    "made with ai", "ai generated", "ai-generated", "altered or synthetic content",
    "altered content", "synthetic content", "mit ki erstellt", "ki-generiert",
    "veränderte oder synthetische inhalte", "veränderte inhalte",
  ]);
  const normalize = (value) => String(value || "").toLowerCase().replace(/\s+/g, " ").trim();
  const selector = "ytd-badge-supported-renderer,yt-badge-view-model,.yt-badge-shape,.badge-shape-wiz,ytd-video-attributes-section-view-model,ytd-info-panel-content-renderer";
  return Array.from(element.querySelectorAll(selector)).some((node) => {
    if (node.closest(".air-badge,.air-watch")) return false;
    const candidates = [node.textContent, node.getAttribute("aria-label"), node.getAttribute("title")];
    node.querySelectorAll("[aria-label],[title],.badge-style-type-simple,.yt-badge-shape__text,.badge-shape-wiz__text").forEach((child) => {
      candidates.push(child.getAttribute("aria-label"), child.getAttribute("title"), child.textContent);
    });
    return candidates.some((value) => labels.has(normalize(value)));
  });
};