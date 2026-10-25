import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import { isBlockSection, resolveSectionOrder } from "@/lib/sectionOrder";
import { pageGeometry } from "@/lib/pageGeometry";
import { getPageMeasurer } from "@/lib/pageMeasureRegistry";
import { CHARS_PER_LINE, FALLBACK_PX_PER_ESTIMATED_LINE } from "@/lib/tunables";
import {
  SECTION_ORDER,
  type AccomplishmentBlock,
  type ResumePreset,
  type SemanticRanking,
} from "@/types/resume";

export function orderedCanvasBlockIds(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
): string[] {
  const byId = new Map(vaultBlocks.map((b) => [b.id, b]));
  const ordered: string[] = [];
  for (const category of resolveSectionOrder(preset).filter(isBlockSection)) {
    for (const id of preset.activeBlockIds) {
      const block = byId.get(id);
      if (block?.category === category) {
        ordered.push(id);
      }
    }
  }
  return ordered;
}

/** Pixels of tolerance when comparing the content height with the page. */
const FIT_TOLERANCE_PX = 1;

export interface PageBudget {
  /** Height of the rendered content, in px. */
  usedPx: number;
  /** Height of the page content area, in px. */
  availablePx: number;
  /** Body lines the content uses: `ceil(usedPx / lineHeightPx)`. */
  usedLines: number;
  /** Body lines that fit on the page for this template. */
  maxLines: number;
  fits: boolean;
}

export function pageBudgetFromUsedPx(
  preset: Pick<ResumePreset, "referenceFormat">,
  usedPx: number,
  /** Overrides the computed page height, for example with the live canvas value. */
  availablePx?: number,
): PageBudget {
  const geometry = pageGeometry(preset);
  const available = availablePx ?? geometry.availablePx;
  const fits = usedPx <= available + FIT_TOLERANCE_PX;
  const lines = Math.ceil(usedPx / geometry.lineHeightPx);
  return {
    usedPx,
    availablePx: available,
    maxLines: geometry.maxLines,
    fits,
    // The meter never shows more than the page holds while the content fits.
    usedLines: fits
      ? Math.min(lines, geometry.maxLines)
      : Math.max(lines, geometry.maxLines + 1),
  };
}

export interface MeasurePageOptions {
  /**
   * Skip the DOM measurer and use the formula. Use this while React renders,
   * because the measurer renders synchronously and cannot run then.
   */
  estimate?: boolean;
}

/**
 * The one entry point for "does this resume fit on one page". In the browser
 * it renders the real canvas offscreen and reads its height. Without a
 * registered measurer (unit tests, server code) it uses the character formula.
 * Call it from event handlers and effects, never from render.
 */
export function measurePage(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  options: MeasurePageOptions = {},
): PageBudget {
  const measurer = options.estimate ? null : getPageMeasurer();
  if (measurer) {
    return pageBudgetFromUsedPx(preset, measurer(preset, vaultBlocks));
  }
  return estimatePageBudget(preset, vaultBlocks);
}

/** The formula fallback, converted to the same px units as the DOM measurer. */
export function estimatePageBudget(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
): PageBudget {
  const { lineHeightPx } = pageGeometry(preset);
  return pageBudgetFromUsedPx(
    preset,
    estimateLineCount(preset, vaultBlocks) *
      lineHeightPx *
      FALLBACK_PX_PER_ESTIMATED_LINE,
  );
}

export function isWithinLineBudget(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  options?: MeasurePageOptions,
): boolean {
  return measurePage(preset, vaultBlocks, options).fits;
}

export function activeBlockIdsAfterInsert(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  blockId: string,
  beforeBlockId: string | null,
): string[] | null {
  if (preset.activeBlockIds.includes(blockId)) return null;
  const block = vaultBlocks.find((b) => b.id === blockId);
  if (!block) return null;

  const filtered = preset.activeBlockIds.filter((id) => id !== blockId);
  let sectionIds = filtered.filter((id) => {
    const b = vaultBlocks.find((x) => x.id === id);
    return b?.category === block.category;
  });

  if (beforeBlockId && sectionIds.includes(beforeBlockId)) {
    const insertAt = sectionIds.indexOf(beforeBlockId);
    sectionIds = [
      ...sectionIds.slice(0, insertAt),
      blockId,
      ...sectionIds.slice(insertAt),
    ];
  } else {
    sectionIds = [...sectionIds, blockId];
  }

  const next: string[] = [];
  for (const cat of SECTION_ORDER) {
    if (cat === block.category) {
      next.push(...sectionIds);
    } else {
      next.push(
        ...filtered.filter((id) => {
          const b = vaultBlocks.find((x) => x.id === id);
          return b?.category === cat;
        }),
      );
    }
  }
  return next;
}

export interface CanvasHeightCheck {
  /** Content height in px already on the page, before this drop. */
  currentCanvasHeight: number;
  /** Extra px the dragged block would add. Zero when reordering. */
  draggedBlockHeight: number;
  /** Height of the page content area in px. */
  maxCanvasHeight: number;
  fits: boolean;
}

/**
 * Vertical space check for inserting a vault block.
 * Heights are measured px (see `measurePage`). Order does not change the total.
 * Reordering a block that is already on the canvas is not an insertion.
 */
export function measureCanvasInsertion(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  blockId: string,
  beforeBlockId: string | null = null,
  options?: MeasurePageOptions,
): CanvasHeightCheck {
  const current = measurePage(preset, vaultBlocks, options);
  const currentCanvasHeight = current.usedPx;
  const maxCanvasHeight = current.availablePx;
  const nextIds = activeBlockIdsAfterInsert(
    preset,
    vaultBlocks,
    blockId,
    beforeBlockId,
  );
  if (!nextIds) {
    return {
      currentCanvasHeight,
      draggedBlockHeight: 0,
      maxCanvasHeight,
      fits: false,
    };
  }
  const next = measurePage(
    { ...preset, activeBlockIds: nextIds },
    vaultBlocks,
    options,
  );
  return {
    currentCanvasHeight,
    draggedBlockHeight: next.usedPx - currentCanvasHeight,
    maxCanvasHeight,
    fits: next.fits,
  };
}

export function canInsertBlockOnResume(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  blockId: string,
  beforeBlockId: string | null = null,
  options?: MeasurePageOptions,
): boolean {
  return measureCanvasInsertion(
    preset,
    vaultBlocks,
    blockId,
    beforeBlockId,
    options,
  ).fits;
}

export function canApplyTailorOverride(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  blockId: string,
  bulletIndex: number,
  text: string,
): boolean {
  const overrides = {
    ...preset.bulletOverrides,
    [blockId]: {
      ...(preset.bulletOverrides[blockId] ?? {}),
      [bulletIndex]: text,
    },
  };
  return measurePage({ ...preset, bulletOverrides: overrides }, vaultBlocks).fits;
}

export function canApplyHeaderAndSkills(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  header: ResumePreset["header"],
  customSkillsSection: string[],
): boolean {
  return measurePage({ ...preset, header, customSkillsSection }, vaultBlocks).fits;
}

/**
 * An edit is allowed if the result fits the page, or if it does not make an
 * already over-budget resume any longer (so users can still fix overflow).
 */
export function editFitsBudget(before: PageBudget, after: PageBudget): boolean {
  return after.fits || after.usedPx <= before.usedPx + FIT_TOLERANCE_PX;
}

function charsPerLine(preset: ResumePreset): number {
  if (!preset.referenceFormat) return CHARS_PER_LINE[preset.templateId];
  // An imported format changes the text width (margins) and the glyph size.
  // 0.55em is the average glyph width; 24px is the bullet indent.
  const { contentWidthPx, bodyPx } = pageGeometry(preset);
  return Math.max(20, Math.floor((contentWidthPx - 24) / (bodyPx * 0.55)));
}

/** The character formula. `measurePage` uses it only when the page cannot be measured. */
export function estimateLineCount(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
): number {
  const cpl = charsPerLine(preset);
  const byId = new Map(vaultBlocks.map((b) => [b.id, b]));

  let total = 4;

  const hasSkills = preset.customSkillsSection.length > 0;
  const sectionHasContent = (cat: string) => {
    if (cat === "skills") return hasSkills;
    return preset.activeBlockIds.some((id) => byId.get(id)?.category === cat);
  };

  for (const cat of [...SECTION_ORDER, "skills" as const]) {
    if (sectionHasContent(cat)) {
      total += 2;
    }
  }

  for (const id of preset.activeBlockIds) {
    const block = byId.get(id);
    if (!block) continue;
    total += 1.5;
    const bullets = getEffectiveBullets(block, preset);
    for (const bullet of bullets) {
      total += Math.ceil(bullet.length / cpl);
    }
  }

  if (hasSkills) {
    const skillsLine = preset.customSkillsSection.join(", ");
    total += Math.ceil(skillsLine.length / cpl);
  }

  for (const section of preset.additionalSections ?? []) {
    if (section.content.trim()) {
      total += 2 + section.content.split("\n").reduce(
        (lines, line) => lines + Math.max(1, Math.ceil(line.length / cpl)), 0,
      );
    }
  }

  return total;
}

export function pickOverflowBlockId(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  rankings: Record<string, SemanticRanking>,
  /** Whether the page is over. The canvas passes its live fit; otherwise it is measured. */
  over: boolean = !measurePage(preset, vaultBlocks).fits,
): string | null {
  if (!over) return null;

  const ordered = orderedCanvasBlockIds(preset, vaultBlocks);
  if (ordered.length === 0) return null;

  const hasRankings = Object.keys(rankings).length > 0;
  if (!hasRankings) {
    return ordered[ordered.length - 1] ?? null;
  }

  let worstId = ordered[0];
  let worstScore = rankings[worstId]?.matchScore ?? 0;
  let worstIndex = 0;

  for (let i = 0; i < ordered.length; i++) {
    const id = ordered[i];
    const score = rankings[id]?.matchScore ?? 0;
    if (
      score < worstScore ||
      (score === worstScore && i > worstIndex)
    ) {
      worstScore = score;
      worstId = id;
      worstIndex = i;
    }
  }

  return worstId;
}

export function spaceMeterState(budget: PageBudget): "ok" | "warn" | "over" {
  if (!budget.fits) return "over";
  if (budget.usedLines >= budget.maxLines - 3) return "warn";
  return "ok";
}
