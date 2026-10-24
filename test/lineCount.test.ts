import { describe, expect, it } from "vitest";
import {
  canInsertBlockOnResume,
  editFitsBudget,
  estimateLineCount,
  measureCanvasInsertion,
  pickOverflowBlockId,
} from "@/lib/lineCount";
import { MAX_LINES } from "@/lib/tunables";
import { SEED_BLOCKS, SEED_PRESETS } from "@/data/seed";

describe("line count", () => {
  it("editFitsBudget allows fitting edits and edits that do not grow an overflowing resume", () => {
    expect(editFitsBudget(MAX_LINES - 5, MAX_LINES)).toBe(true);
    expect(editFitsBudget(MAX_LINES - 1, MAX_LINES + 1)).toBe(false);
    expect(editFitsBudget(MAX_LINES + 2, MAX_LINES + 2)).toBe(true);
    expect(editFitsBudget(MAX_LINES + 2, MAX_LINES + 3)).toBe(false);
  });

  it("includes custom section headings and wrapped content in the space budget", () => {
    const preset = SEED_PRESETS[0];
    const baseline = estimateLineCount(preset, SEED_BLOCKS);
    const withSections = {
      ...preset,
      additionalSections: [
        { id: "summary", title: "Professional Summary", content: "A".repeat(96) + "\nAnother line" },
        { id: "custom-empty", title: "Empty", content: "" },
      ],
    };
    expect(estimateLineCount(withSections, SEED_BLOCKS)).toBe(baseline + 5);
  });

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

  it("allows an insert only when current height plus the block fits the page", () => {
    const preset = SEED_PRESETS[0];
    const check = measureCanvasInsertion(preset, SEED_BLOCKS, "proj-2", "proj-1");
    expect(check.maxCanvasHeight).toBe(MAX_LINES);
    expect(check.draggedBlockHeight).toBeGreaterThan(0);
    expect(
      check.currentCanvasHeight + check.draggedBlockHeight <=
        check.maxCanvasHeight,
    ).toBe(check.fits);
    expect(check.fits).toBe(
      canInsertBlockOnResume(preset, SEED_BLOCKS, "proj-2", "proj-1"),
    );
  });

  it("blocks insert when the block would exceed the line budget", () => {
    const preset = {
      ...SEED_PRESETS[0],
      activeBlockIds: ["exp-1"],
      customSkillsSection: Array.from({ length: 400 }, (_, i) =>
        `Skill category ${i} with extended label text for line budget`,
      ),
    };
    expect(canInsertBlockOnResume(preset, SEED_BLOCKS, "proj-1", null)).toBe(
      false,
    );
    const blocked = measureCanvasInsertion(preset, SEED_BLOCKS, "proj-1", null);
    expect(blocked.fits).toBe(false);
    expect(
      blocked.currentCanvasHeight + blocked.draggedBlockHeight >
        blocked.maxCanvasHeight,
    ).toBe(true);
  });
});
