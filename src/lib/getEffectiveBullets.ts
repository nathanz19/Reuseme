import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

export function getEffectiveBullets(
  block: AccomplishmentBlock,
  preset: ResumePreset,
): string[] {
  const overrides = preset.bulletOverrides[block.id] ?? {};
  return block.bullets.map((bullet, index) => overrides[index] ?? bullet);
}
