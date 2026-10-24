interface VaultToolbarProps {
  searchQuery: string;
  allTags: string[];
  selectedTags: string[];
  includeArchived: boolean;
  onSearchChange: (q: string) => void;
  onToggleTag: (tag: string) => void;
  onIncludeArchivedChange: (v: boolean) => void;
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
  return (
    <div className="space-y-2 border-b border-slate-200 p-3">
      <input
        type="search"
        placeholder="Search vault…"
        className="w-full rounded border border-slate-300 px-2 py-1.5 text-sm"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
      />
      <div className="flex flex-wrap gap-1">
        {allTags.map((tag) => {
          const active = selectedTags.includes(tag);
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className={`rounded-full border px-2 py-0.5 text-xs ${
                active
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tag}
            </button>
          );
        })}
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
