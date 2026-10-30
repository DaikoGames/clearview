const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (id) => document.getElementById(id);
let settings = { blur: false, background: true };
api.storage.local.get(["userChannels", "settings", "verdicts"], (d) => {
  settings = Object.assign(settings, d.settings || {});
  $("list").value = (d.userChannels || []).join("\n");
  $("blur").checked = settings.blur;
  $("bg").checked = settings.background;
  const v = Object.values(d.verdicts || {});
  $("stat").textContent = `${v.filter((x) => x === "ai").length} AI · ${v.filter((x) => x === "ok").length} non-AI videos checked`;
});
const set = (k, val) => { settings[k] = val; api.storage.local.set({ settings }); };
$("save").onclick = () => {
  const list = $("list").value.split(/\s*[\n,]\s*/).map((s) => s.trim()).filter(Boolean);
  api.storage.local.set({ userChannels: list }, () => ($("save").textContent = "Saved ✓"));
};
$("blur").onchange = (e) => set("blur", e.target.checked);
$("bg").onchange = (e) => set("background", e.target.checked);
$("clear").onclick = () => api.storage.local.set({ verdicts: {} }, () => ($("stat").textContent = "Cache cleared"));
