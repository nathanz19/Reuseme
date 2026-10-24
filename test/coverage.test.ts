import { describe, expect, it } from "vitest";
import { computeCoverage } from "@/lib/coverage";
import { SEED_BLOCKS, SEED_PRESETS } from "@/data/seed";
import type { ParsedJobDescription } from "@/types/resume";

const parsed: ParsedJobDescription = {
  rawText: "",
  roleTitle: "Eng",
  companyName: "Co",
  requiredSkills: ["pg", "Go"],
  preferredSkills: [],
  keyResponsibilities: [],
};

describe("computeCoverage", () => {
  it("resolves skill aliases on canvas blocks", () => {
    const preset = {
      ...SEED_PRESETS[1],
      activeBlockIds: ["exp-2"],
      customSkillsSection: [],
    };
    const { covered, missing } = computeCoverage(parsed, SEED_BLOCKS, preset);
    expect(covered).toContain("pg");
    expect(covered).toContain("Go");
    expect(missing).toHaveLength(0);
  });

  it("ignores sourceContext-only mentions", () => {
    const blocks = SEED_BLOCKS.map((b) =>
      b.id === "exp-2"
        ? {
            ...b,
            tags: [],
            bullets: ["Generic backend work."],
            title: "Engineer",
            sourceContext: "secret kubernetes cluster in notes only",
          }
        : b,
    );
    const preset = {
      ...SEED_PRESETS[0],
      activeBlockIds: ["exp-2"],
      customSkillsSection: [],
    };
    const { missing } = computeCoverage(
      { ...parsed, requiredSkills: ["Kubernetes"] },
      blocks,
      preset,
    );
    expect(missing).toContain("Kubernetes");
  });
});
