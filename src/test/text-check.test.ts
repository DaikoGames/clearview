import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createContext, runInContext } from "node:vm";
import { describe, expect, it } from "vitest";

const context = createContext({});
runInContext(readFileSync(resolve("extension/text-check.js"), "utf8"), context);
const check = context["AIR_CHECK_TEXT"] as (text: string) => boolean;

describe("cautious local text clues", () => {
  it("warns about explicit AI-assistant wording", () => {
    expect(check("As an AI language model, I cannot experience emotions.")).toBe(true);
  });
  it("warns about leftover script-generation instructions", () => {
    expect(check("Here is the requested YouTube script for your video.")).toBe(true);
  });
  it("supports a German model artifact", () => {
    expect(check("Als KI-Sprachmodell kann ich keine Gefühle empfinden.")).toBe(true);
  });
  it("does not use generic polished wording as evidence", () => {
    expect(check("Let's delve into this fascinating topic. In conclusion, it is important to remember the details.")).toBe(false);
  });
  it("does not flag merely discussing AI tools", () => {
    expect(check("Today we compare ChatGPT and other AI tools.")).toBe(false);
  });
  it("treats missing text as no evidence, not human certification", () => {
    expect(check("")).toBe(false);
  });
});