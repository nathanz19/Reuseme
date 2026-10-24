import type { AccomplishmentBlock } from "@/types/resume";

export interface SearchFilters {
  query: string;
  selectedTags: string[];
  includeArchived: boolean;
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
