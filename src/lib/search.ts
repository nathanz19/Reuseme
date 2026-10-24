import type { AccomplishmentBlock } from "@/types/resume";

export interface SearchFilters {
  query: string;
  selectedTags: string[];
  includeArchived: boolean;
  selectedSections?: string[];
  dateFrom?: string;
  dateTo?: string;
}

/** Inclusive month bounds. Year-only dates cover the whole year. */
function monthIndex(text: string, end: boolean): number | null {
  const value = text.trim().toLowerCase();
  if (value === "present" || value === "current") return Infinity;
  const iso = /^(\d{4})(?:-(\d{2}))?$/.exec(value);
  if (iso) {
    const month = iso[2] ? Number(iso[2]) - 1 : end ? 11 : 0;
    return month >= 0 && month <= 11 ? Number(iso[1]) * 12 + month : null;
  }
  const named = /^([a-z]+)\s+(\d{4})$/.exec(value);
  if (!named) return null;
  const month = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"].indexOf(named[1].slice(0, 3));
  return month < 0 ? null : Number(named[2]) * 12 + month;
}

function matchesDate(block: AccomplishmentBlock, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const lower = from ? monthIndex(from, false) : -Infinity;
  const upper = to ? monthIndex(to, true) : Infinity;
  const start = monthIndex(block.startDate || block.endDate, false);
  const end = monthIndex(block.endDate || block.startDate, true);
  if (lower === null || upper === null || start === null || end === null || lower > upper) return false;
  return start <= upper && end >= lower;
}

function blockSearchText(block: AccomplishmentBlock): string {
  return [
    block.title,
    block.organization,
    ...block.tags,
    ...block.bullets,
    block.sourceContext,
  ]
    .join(" ")
    .toLowerCase();
}

export function searchBlocks(
  blocks: AccomplishmentBlock[],
  filters: SearchFilters,
): AccomplishmentBlock[] {
  const tokens = filters.query
    .toLowerCase()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

  return blocks.filter((block) => {
    if (filters.selectedSections?.length && !filters.selectedSections.includes(block.category)) return false;
    if (!matchesDate(block, filters.dateFrom, filters.dateTo)) return false;
    if (!filters.includeArchived && block.isArchived) {
      return false;
    }

    if (filters.selectedTags.length > 0) {
      const tagSet = new Set(block.tags.map((t) => t.toLowerCase()));
      const allTags = filters.selectedTags.every((tag) =>
        tagSet.has(tag.toLowerCase()),
      );
      if (!allTags) return false;
    }

    if (tokens.length === 0) return true;

    const haystack = blockSearchText(block);
    return tokens.every((token) => haystack.includes(token));
  });
}

export function collectAllTags(blocks: AccomplishmentBlock[]): string[] {
  const set = new Set<string>();
  for (const block of blocks) {
    for (const tag of block.tags) {
      set.add(tag);
    }
  }
  return [...set].sort((a, b) => a.localeCompare(b));
}
