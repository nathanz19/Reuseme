import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import { isBlockSection, resolveSectionOrder } from "@/lib/sectionOrder";
import { CHARS_PER_LINE, MAX_LINES } from "@/lib/tunables";
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

export function isWithinLineBudget(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
): boolean {
  return estimateLineCount(preset, vaultBlocks) <= MAX_LINES;
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
  /** Estimated lines already on the page, before this drop. */
  currentCanvasHeight: number;
  /** Extra estimated lines the dragged block would add. Zero when reordering. */
  draggedBlockHeight: number;
  /** One-page budget (`MAX_LINES`), calibrated to the US Letter canvas. */
  maxCanvasHeight: number;
  fits: boolean;
}

/**
 * Vertical space check for inserting a vault block.
 * Heights are estimated lines, which is the page limit this canvas enforces
 * (`MAX_LINES` for a US Letter page). Order does not change the total.
 * Reordering a block that is already on the canvas is not an insertion.
 */
export function measureCanvasInsertion(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  blockId: string,
  beforeBlockId: string | null = null,
): CanvasHeightCheck {
  const currentCanvasHeight = estimateLineCount(preset, vaultBlocks);
  const maxCanvasHeight = MAX_LINES;
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
  const nextHeight = estimateLineCount(
    { ...preset, activeBlockIds: nextIds },
    vaultBlocks,
  );
  const draggedBlockHeight = nextHeight - currentCanvasHeight;
  return {
    currentCanvasHeight,
    draggedBlockHeight,
    maxCanvasHeight,
    fits: currentCanvasHeight + draggedBlockHeight <= maxCanvasHeight,
  };
}

export function canInsertBlockOnResume(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  blockId: string,
  beforeBlockId: string | null = null,
): boolean {
  return measureCanvasInsertion(
    preset,
    vaultBlocks,
    blockId,
    beforeBlockId,
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
  return (
    estimateLineCount({ ...preset, bulletOverrides: overrides }, vaultBlocks) <=
    MAX_LINES
  );
}

export function canApplyHeaderAndSkills(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  header: ResumePreset["header"],
  customSkillsSection: string[],
): boolean {
  return (
    estimateLineCount(
      { ...preset, header, customSkillsSection },
      vaultBlocks,
    ) <= MAX_LINES
  );
}

/**
 * An edit is allowed if the result fits the page, or if it does not make an
 * already over-budget resume any longer (so users can still fix overflow).
 */
export function editFitsBudget(before: number, after: number): boolean {
  return after <= MAX_LINES || after <= before;
}

export function estimateLineCount(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
): number {
  const cpl = CHARS_PER_LINE[preset.templateId];
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
): string | null {
  const total = estimateLineCount(preset, vaultBlocks);
  if (total <= MAX_LINES) return null;

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

export function spaceMeterState(total: number): "ok" | "warn" | "over" {
  const display = Math.ceil(total);
  if (display > MAX_LINES) return "over";
  if (display >= MAX_LINES - 3) return "warn";
  return "ok";
}
