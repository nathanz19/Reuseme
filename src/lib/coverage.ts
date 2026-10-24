import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import { textContainsSkill } from "@/lib/normalize";
import type {
  AccomplishmentBlock,
  ParsedJobDescription,
  ResumePreset,
} from "@/types/resume";

export interface CoverageResult {
  covered: string[];
  missing: string[];
  percent: number;
}

function skillCoveredOnCanvas(
  skill: string,
  blocks: AccomplishmentBlock[],
  preset: ResumePreset,
): boolean {
  const active = blocks.filter((b) => preset.activeBlockIds.includes(b.id));
  for (const block of active) {
    const bullets = getEffectiveBullets(block, preset);
    const corpus = [block.title, ...block.tags, ...bullets].join(" ");
    if (textContainsSkill(corpus, skill)) {
      return true;
    }
  }
  return false;
}

export function computeCoverage(
  parsedJD: ParsedJobDescription | null,
  blocks: AccomplishmentBlock[],
  preset: ResumePreset,
): CoverageResult {
  if (!parsedJD || parsedJD.requiredSkills.length === 0) {
    return { covered: [], missing: [], percent: 0 };
  }

  const covered: string[] = [];
  const missing: string[] = [];

  for (const skill of parsedJD.requiredSkills) {
    if (skillCoveredOnCanvas(skill, blocks, preset)) {
      covered.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const percent = Math.round(
    (covered.length / parsedJD.requiredSkills.length) * 100,
  );

  return { covered, missing, percent };
}
