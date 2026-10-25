import { describe, expect, it } from "vitest";
import { computeKeywordOverlap, computeMatchScore } from "@/lib/matchScore";
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
const block = (id: string) => SEED_BLOCKS.find((b) => b.id === id)!;

describe("match score", () => {
  it("weights required skills 2x in keyword overlap", () => {
    // Go + PostgreSQL (required) = 4 of 5 weight; React (preferred) = 1 of 5.
    expect(computeKeywordOverlap(block("exp-2"), parsed)).toBe(80);
    expect(computeKeywordOverlap(block("exp-1"), parsed)).toBe(20);
    expect(computeKeywordOverlap(block("exp-1"), { ...parsed, requiredSkills: [], preferredSkills: [] })).toBe(0);
  });

  it("stays within 0-100 and favors semantic evidence over keywords", () => {
    expect(computeMatchScore(0, 0)).toBe(0);
    expect(computeMatchScore(100, 100)).toBe(100);
    expect(computeMatchScore(100, 0)).toBeGreaterThan(computeMatchScore(0, 100));
  });
});
