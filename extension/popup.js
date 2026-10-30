const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (id) => document.getElementById(id);
api.storage.local.get(["userChannels", "settings", "verdicts"], (d) => {
  $("list").value = (d.userChannels || []).join("\n");
  $("blur").checked = !!(d.settings && d.settings.blur);
  const v = Object.values(d.verdicts || {});
  $("stat").textContent = `${v.filter((x) => x === "ai").length} AI · ${v.filter((x) => x === "ok").length} human videos checked`;
});
$("save").onclick = () => {
  const list = $("list").value.split(/\s*[\n,]\s*/).map((s) => s.trim()).filter(Boolean);
  api.storage.local.set({ userChannels: list }, () => ($("save").textContent = "Saved ✓"));
};
$("blur").onchange = (e) => api.storage.local.set({ settings: { blur: e.target.checked } });
$("clear").onclick = () => api.storage.local.set({ verdicts: {} }, () => ($("stat").textContent = "Cache cleared"));
