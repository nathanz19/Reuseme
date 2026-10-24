import { describe, expect, it } from "vitest";
import { computeKeywordOverlap, computeMatchScore } from "@/lib/matchScore";
import { W_KW, W_SEM } from "@/lib/tunables";
import { SEED_BLOCKS } from "@/data/seed";
import type { ParsedJobDescription } from "@/types/resume";

const parsed: ParsedJobDescription = {
  rawText: "",
  roleTitle: "Eng",
  companyName: "Co",
  requiredSkills: ["Go", "PostgreSQL"],
  preferredSkills: ["React"],
  keyResponsibilities: [],
};

describe("match score", () => {
  it("weights required skills 2x in keyword overlap", () => {
    const block = SEED_BLOCKS.find((b) => b.id === "exp-2")!;
    const overlap = computeKeywordOverlap(block, parsed);
    expect(overlap).toBeGreaterThan(50);
  });

  it("combines semantic and keyword scores", () => {
    const combined = computeMatchScore(80, 60);
    expect(combined).toBe(Math.round(W_SEM * 80 + W_KW * 60));
  });
});
