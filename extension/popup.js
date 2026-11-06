const api = typeof browser !== "undefined" ? browser : chrome;
const $ = (id) => document.getElementById(id);
let settings = { blur: false };
$("kagi-stat").textContent = `${AIR_KAGI.creators.length} Kagi creators · bundled ${AIR_KAGI.retrieved}. New list snapshots come with extension downloads; no online updates.`;
api.storage.local.get(["userChannels", "settings", "userChannelsCount"], (d) => {
  settings = Object.assign(settings, d.settings || {});
  $("list").value = (d.userChannels || []).join("\n");
  $("blur").checked = settings.blur;
  $("thumbAI").checked = settings.thumbAI !== false;
  const extra = (d.userChannels || []).length;
  $("stat").textContent = extra ? `${extra} extra AI channel(s) added by you` : "Using the built-in AiSList and Kagi lists";
});
const set = (k, val) => { settings[k] = val; api.storage.local.set({ settings }); };
$("save").onclick = () => {
  const list = $("list").value.split(/\s*[\n,]\s*/).map((s) => s.trim()).filter(Boolean);
  api.storage.local.set({ userChannels: list }, () => ($("save").textContent = "Saved ✓"));
};
$("thumbAI").onchange = (e) => set("thumbAI", e.target.checked);
$("blur").onchange = (e) => set("blur", e.target.checked);
