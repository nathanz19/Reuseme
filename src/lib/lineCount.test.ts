import { describe, expect, it } from "vitest";
import {
  estimateLineCount,
  pickOverflowBlockId,
} from "@/lib/lineCount";
import { MAX_LINES } from "@/lib/tunables";
import { SEED_BLOCKS, SEED_PRESETS } from "@/data/seed";

describe("line count", () => {
  it("flags last block when over budget without rankings", () => {
    const preset = {
      ...SEED_PRESETS[0],
      activeBlockIds: SEED_BLOCKS.filter((b) => !b.isArchived).map((b) => b.id),
      customSkillsSection: Array(40).fill("SkillItem").map((s, i) => `${s}${i}`),
    };
    const total = estimateLineCount(preset, SEED_BLOCKS);
    expect(total).toBeGreaterThan(MAX_LINES);
    const overflow = pickOverflowBlockId(preset, SEED_BLOCKS, {});
    expect(overflow).toBeTruthy();
  });

  it("picks lowest match score with tie-break later in order", () => {
    const preset = {
      ...SEED_PRESETS[0],
      activeBlockIds: ["exp-1", "proj-1"],
      customSkillsSection: Array.from({ length: 400 }, (_, i) =>
        `Skill category ${i} with extended label text for line budget`,
      ),
    };
    const rankings = {
      "exp-1": {
        blockId: "exp-1",
        semanticScore: 50,
        matchExplanation: "",
        keywordOverlap: 50,
        matchScore: 50,
      },
      "proj-1": {
        blockId: "proj-1",
        semanticScore: 50,
        matchExplanation: "",
        keywordOverlap: 50,
        matchScore: 50,
      },
    };
    expect(estimateLineCount(preset, SEED_BLOCKS)).toBeGreaterThan(MAX_LINES);
    const overflow = pickOverflowBlockId(preset, SEED_BLOCKS, rankings);
    expect(overflow).toBe("proj-1");
  });
});
