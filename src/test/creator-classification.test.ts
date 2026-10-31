import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

type Creator = { id: string; handle: string };
const context = createContext({});
for (const file of ["kagi.js", "classify.js"]) {
  runInContext(readFileSync(resolve("extension", file), "utf8"), context);
}
const snapshot = context.AIR_KAGI as { creators: Creator[] };
const createClassifier = context.AIR_CREATE_CLASSIFIER as (blocked: string[], creators: Creator[]) => (keys: string[], name?: string) => string;
const classify = createClassifier(["@blockedcreator"], snapshot.creators);

describe("offline creator list rules", () => {
  it("marks AiSList keys as AI", () => {
    expect(classify(["@BlockedCreator"])).toBe("ai");
  });
  it("marks a bundled Kagi channel ID as Kagi-listed", () => {
    expect(classify(["UC_RILDt90_cEge-fWOsqGLQ"])).toBe("kagi");
  });
  it("matches a bundled Kagi handle", () => {
    expect(classify(["@Aaroncake"])).toBe("kagi");
  });
  it("does not certify an unlisted creator as non-AI", () => {
    expect(classify(["@unlisted-creator"])).toBe("unknown");
  });
  it("gives the AI blocklist priority over Kagi membership", () => {
    const conflict = createClassifier(["aaroncake"], snapshot.creators);
    expect(conflict(["@aaroncake", "UC_RILDt90_cEge-fWOsqGLQ"])).toBe("ai");
  });
  it("does not trust a copied display name for Kagi membership", () => {
    expect(classify(["@unlisted-creator"], "Aaroncake")).toBe("unknown");
  });
  it("preserves case sensitivity of stable channel IDs", () => {
    expect(classify(["uc_rildt90_cege-fwosqglq"])).toBe("unknown");
  });
});