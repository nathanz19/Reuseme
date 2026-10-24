import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
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
  for (const category of SECTION_ORDER) {
    for (const id of preset.activeBlockIds) {
      const block = byId.get(id);
      if (block?.category === category) {
        ordered.push(id);
      }
    }
  }
  return ordered;
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
