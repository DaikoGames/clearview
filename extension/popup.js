const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (id) => document.getElementById(id);
let settings = { blur: false };
api.storage.local.get(["userChannels", "settings", "userChannelsCount"], (d) => {
  settings = Object.assign(settings, d.settings || {});
  $("list").value = (d.userChannels || []).join("\n");
  $("blur").checked = settings.blur;
  const extra = (d.userChannels || []).length;
  $("stat").textContent = extra ? `${extra} extra channel(s) added by you` : "Using the built-in AiSList only";
});
const set = (k, val) => { settings[k] = val; api.storage.local.set({ settings }); };
$("save").onclick = () => {
  const list = $("list").value.split(/\s*[\n,]\s*/).map((s) => s.trim()).filter(Boolean);
  api.storage.local.set({ userChannels: list }, () => ($("save").textContent = "Saved ✓"));
};
$("blur").onchange = (e) => set("blur", e.target.checked);
