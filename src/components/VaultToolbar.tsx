import { useMemo } from "react";

interface VaultToolbarProps {
  searchQuery: string;
  allTags: string[];
  selectedTags: string[];
  includeArchived: boolean;
  onSearchChange: (q: string) => void;
  onToggleTag: (tag: string) => void;
  onIncludeArchivedChange: (v: boolean) => void;
}

function TagChip({
  tag,
  active,
  onToggle,
}: {
  tag: string;
  active: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${
        active
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
      }`}
    >
      {tag}
    </button>
  );
}

export function VaultToolbar({
  searchQuery,
  allTags,
  selectedTags,
  includeArchived,
  onSearchChange,
  onToggleTag,
  onIncludeArchivedChange,
}: VaultToolbarProps) {
  const [tagRow1, tagRow2] = useMemo(() => {
    const mid = Math.ceil(allTags.length / 2);
    return [allTags.slice(0, mid), allTags.slice(mid)];
  }, [allTags]);

  return (
    <div className="shrink-0 space-y-2 border-b border-slate-200 p-3">
      <input
        type="search"
        placeholder="Search vault…"
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div
        className="space-y-1 overflow-x-auto pb-2 no-scrollbar"
        role="list"
        aria-label="Filter by tag"
      >
        <div className="flex w-max min-w-full gap-1.5">
          {tagRow1.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              active={selectedTags.includes(tag)}
              onToggle={() => onToggleTag(tag)}
            />
          ))}
        </div>
        <div className="flex w-max min-w-full gap-1.5">
          {tagRow2.map((tag) => (
            <TagChip
              key={tag}
              tag={tag}
              active={selectedTags.includes(tag)}
              onToggle={() => onToggleTag(tag)}
            />
          ))}
        </div>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600">
        <input
          type="checkbox"
          checked={includeArchived}
          onChange={(e) => onIncludeArchivedChange(e.target.checked)}
        />
        Include Archived
      </label>
    </div>
  );
}
