import { readFile, writeFile, mkdir, cp, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { browserManifest } from "./browser-manifest.mjs";

const source = resolve(process.argv[2] || "/tmp/air-build");
const output = resolve(process.argv[3] || "/tmp/air-release");
const manifest = JSON.parse(await readFile(resolve(source, "manifest.json"), "utf8"));
if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${manifest.version}`) {
  throw new Error("Release tag must match the extension manifest version");
}
await mkdir(output, { recursive: true });
for (const browser of ["chromium", "firefox", "safari"]) {
  const destination = resolve(output, browser);
  await rm(destination, { recursive: true, force: true });
  await cp(source, destination, { recursive: true });
  await writeFile(resolve(destination, "manifest.json"), JSON.stringify(browserManifest(manifest, browser), null, 2) + "\n");
  const archive = resolve(output, `ai-video-radar-${browser}.zip`);
  execFileSync("python3", ["-c", `
import pathlib, sys, zipfile
root=pathlib.Path(sys.argv[1])
with zipfile.ZipFile(sys.argv[2], 'w', zipfile.ZIP_DEFLATED) as z:
    for p in sorted(root.rglob('*')):
        if p.is_file(): z.write(p, p.relative_to(root))
`, destination, archive]);
  console.log(archive);
}