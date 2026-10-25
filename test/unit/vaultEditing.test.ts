import { describe, expect, it } from "vitest";
import { SEED_PRESETS } from "../fixtures/seed";
import { cleanBlockReferences } from "@/lib/vaultEditing";

describe("vault edits", () => {
  const presets = SEED_PRESETS.map((preset) => ({
    ...preset,
    activeBlockIds: ["exp-1", "proj-1"],
    bulletOverrides: { "exp-1": { 0: "Old rewrite" }, "proj-1": { 0: "Keep this" } },
  }));

  it("removes a deleted block and its overrides from every version without mutating snapshots", () => {
    const result = cleanBlockReferences(presets, "exp-1", true);
    for (const preset of result) {
      expect(preset.activeBlockIds).toEqual(["proj-1"]);
      expect(preset.bulletOverrides).toEqual({ "proj-1": { 0: "Keep this" } });
    }
    expect(presets[0].activeBlockIds).toContain("exp-1");
    expect(presets[0].bulletOverrides["exp-1"]).toEqual({ 0: "Old rewrite" });
  });

  it("clears stale rewrites after bullet edits while keeping the block on the resume", () => {
    const result = cleanBlockReferences(presets, "exp-1", false);
    for (const preset of result) {
      expect(preset.activeBlockIds).toEqual(["exp-1", "proj-1"]);
      expect(preset.bulletOverrides["exp-1"]).toBeUndefined();
      expect(preset.bulletOverrides["proj-1"]).toEqual({ 0: "Keep this" });
    }
  });
});
