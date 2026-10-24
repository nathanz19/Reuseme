import { SECTION_ORDER, type BlockCategory, type ResumePreset } from "@/types/resume";

export const SKILLS_SECTION_ID = "skills";

/** Additional sections that render directly under the header by default. */
const LEADING_SECTION_IDS = ["target-title", "summary"];

export function isBlockSection(id: string): id is BlockCategory {
  return (SECTION_ORDER as string[]).includes(id);
}

/**
 * Every section that can appear below the header, in the default canvas order:
 * target title and summary, block categories, custom sections, then skills.
 */
export function defaultSectionOrder(preset: ResumePreset): string[] {
  const additional = (preset.additionalSections ?? []).map((section) => section.id);
  return [
    ...additional.filter((id) => LEADING_SECTION_IDS.includes(id)),
    ...SECTION_ORDER,
    ...additional.filter((id) => !LEADING_SECTION_IDS.includes(id)),
    SKILLS_SECTION_ID,
  ];
}

/**
 * The preset's saved order, limited to sections that exist. A section missing
 * from the saved order goes after its nearest default-order predecessor, so a
 * newly added section lands where it would on an unarranged resume.
 */
export function resolveSectionOrder(preset: ResumePreset): string[] {
  const defaults = defaultSectionOrder(preset);
  const order = [...new Set(preset.sectionOrder ?? [])].filter((id) =>
    defaults.includes(id),
  );
  defaults.forEach((id, index) => {
    if (order.includes(id)) return;
    let insertAt = 0;
    for (let previous = index - 1; previous >= 0; previous--) {
      const placed = order.indexOf(defaults[previous]);
      if (placed !== -1) {
        insertAt = placed + 1;
        break;
      }
    }
    order.splice(insertAt, 0, id);
  });
  return order;
}

/** Moves `activeId` into `overId`'s slot, or returns null when nothing changes. */
export function moveSection(
  order: readonly string[],
  activeId: string,
  overId: string,
): string[] | null {
  const from = order.indexOf(activeId);
  const to = order.indexOf(overId);
  if (from === -1 || to === -1 || from === to) return null;
  const next = [...order];
  next.splice(from, 1);
  next.splice(to, 0, activeId);
  return next;
}
