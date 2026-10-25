import { describe, expect, it } from "vitest";
import {
  canInsertBlockOnResume,
  editFitsBudget,
  estimateLineCount,
  measureCanvasInsertion,
  measurePage,
  pageBudgetFromUsedPx,
  pickOverflowBlockId,
  spaceMeterState,
} from "@/lib/lineCount";
import { pageGeometry } from "@/lib/pageGeometry";
import { MAX_LINES } from "@/lib/tunables";
import { COMPACT_SERIF_FORMAT, MODERN_PARAGRAPH_FORMAT } from "../fixtures/referenceFormat";
import { SEED_BLOCKS, SEED_PRESETS } from "../fixtures/seed";

// These tests run without a DOM measurer, so `measurePage` uses the formula fallback.

describe("line count", () => {
  const preset0 = SEED_PRESETS[0];
  const { availablePx, lineHeightPx } = pageGeometry(preset0);
  const budget = (px: number) => pageBudgetFromUsedPx(preset0, px);

  it("editFitsBudget allows fitting edits and edits that do not grow an overflowing resume", () => {
    expect(editFitsBudget(budget(availablePx - 100), budget(availablePx))).toBe(true);
    expect(editFitsBudget(budget(availablePx - 20), budget(availablePx + 40))).toBe(false);
    expect(editFitsBudget(budget(availablePx + 40), budget(availablePx + 40))).toBe(true);
    expect(editFitsBudget(budget(availablePx + 40), budget(availablePx + 80))).toBe(false);
  });

  it("page geometry follows the template's margins and line height", () => {
    const builtin = pageGeometry(preset0);
    expect(builtin).toMatchObject({ paddingPx: 32, availablePx: 992, lineHeightPx: 20, maxLines: 49 });
    const compact = pageGeometry({ referenceFormat: COMPACT_SERIF_FORMAT });
    expect(compact.paddingPx).toBe(48);
    expect(compact.availablePx).toBe(1056 - 96);
    expect(compact.lineHeightPx).toBeCloseTo(13.3 * 1.35);
    expect(compact.maxLines).toBe(Math.floor(compact.availablePx / compact.lineHeightPx));
    const modern = pageGeometry({ referenceFormat: MODERN_PARAGRAPH_FORMAT });
    expect(modern.paddingPx).toBe(50);
    expect(modern.lineHeightPx).toBeCloseTo(12 * 1.3);
  });

  it("measurePage fits when the content height is within the page, with 1px of tolerance", () => {
    expect(budget(availablePx + 1).fits).toBe(true);
    expect(budget(availablePx + 2).fits).toBe(false);
    expect(budget(availablePx).usedLines).toBeLessThanOrEqual(budget(availablePx).maxLines);
    expect(budget(availablePx + 60).usedLines).toBeGreaterThan(budget(availablePx).maxLines);
  });

  it("the fallback formula keeps the 45-line limit for built-in templates", () => {
    const base = { ...preset0, activeBlockIds: [] as string[], customSkillsSection: [] as string[] };
    const sectionLines = (lines: number) => ({
      ...base,
      additionalSections: [{ id: "summary", title: "S", content: Array(lines).fill("x").join("\n") }],
    });
    // 4 base lines + 2 for the section heading + one line per content line.
    expect(measurePage(sectionLines(MAX_LINES - 6), SEED_BLOCKS).fits).toBe(true);
    expect(measurePage(sectionLines(MAX_LINES - 5), SEED_BLOCKS).fits).toBe(false);
  });

  it("meter state is over exactly when the page does not fit, and warns near the limit", () => {
    expect(spaceMeterState(budget(availablePx + 40))).toBe("over");
    expect(spaceMeterState(budget(availablePx - 6 * lineHeightPx))).toBe("ok");
    expect(spaceMeterState(budget(availablePx - lineHeightPx))).toBe("warn");
    expect(spaceMeterState(budget(10 * lineHeightPx))).toBe("ok");
  });

  it("the fallback formula adapts to an imported format's margins and font size", () => {
    const chars = "word ".repeat(100);
    const withBody = (referenceFormat?: typeof COMPACT_SERIF_FORMAT) => ({
      ...preset0,
      referenceFormat,
      activeBlockIds: [],
      customSkillsSection: [],
      additionalSections: [{ id: "summary", title: "S", content: chars }],
    });
    const narrow = estimateLineCount(withBody(COMPACT_SERIF_FORMAT), SEED_BLOCKS);
    const wide = estimateLineCount(
      withBody({ ...COMPACT_SERIF_FORMAT, details: { ...COMPACT_SERIF_FORMAT.details!, bodyPx: 18, marginPx: 64 } }),
      SEED_BLOCKS,
    );
    expect(wide).toBeGreaterThan(narrow);
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
    expect(measurePage(preset, SEED_BLOCKS).fits).toBe(false);
    const overflow = pickOverflowBlockId(preset, SEED_BLOCKS, {});
    expect(overflow).toBeTruthy();
  });

  it("flags the last block of the last section in the arranged order", () => {
    const preset = {
      ...SEED_PRESETS[0],
      activeBlockIds: ["edu-1", "exp-1", "proj-1"],
      customSkillsSection: Array.from({ length: 400 }, (_, i) =>
        `Skill category ${i} with extended label text for line budget`,
      ),
    };
    expect(pickOverflowBlockId(preset, SEED_BLOCKS, {})).toBe("proj-1");
    expect(
      pickOverflowBlockId(
        { ...preset, sectionOrder: ["project", "education", "experience"] },
        SEED_BLOCKS,
        {},
      ),
    ).toBe("exp-1");
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
        relevant: true,
        semanticScore: 50,
        matchedTags: [],
        bestBulletIndex: 0,
        matchExplanation: "",
        keywordOverlap: 50,
        matchScore: 50,
      },
      "proj-1": {
        blockId: "proj-1",
        relevant: true,
        semanticScore: 50,
        matchedTags: [],
        bestBulletIndex: 0,
        matchExplanation: "",
        keywordOverlap: 50,
        matchScore: 50,
      },
    };
    expect(measurePage(preset, SEED_BLOCKS).fits).toBe(false);
    const overflow = pickOverflowBlockId(preset, SEED_BLOCKS, rankings);
    expect(overflow).toBe("proj-1");
  });

  it("allows an insert only when current height plus the block fits the page", () => {
    const preset = SEED_PRESETS[0];
    const check = measureCanvasInsertion(preset, SEED_BLOCKS, "proj-2", "proj-1");
    expect(check.maxCanvasHeight).toBe(pageGeometry(preset).availablePx);
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
