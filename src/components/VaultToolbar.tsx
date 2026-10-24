"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Plus, SlidersHorizontal, X } from "lucide-react";
import { VAULT_CATEGORIES } from "@/lib/vaultCategories";
import { useSessionStore } from "@/store/sessionStore";
import { useResumeStore } from "@/store/resumeStore";

interface VaultToolbarProps {
  searchQuery: string;
  allTags: string[];
  selectedTags: string[];
  includeArchived: boolean;
  onSearchChange: (q: string) => void;
  onToggleTag: (tag: string) => void;
  onIncludeArchivedChange: (v: boolean) => void;
}

type FilterType = "Tags" | "Date" | "Sections";
const fieldClass = "w-full rounded-md border border-slate-200 bg-white px-2 py-2 text-sm";

export function VaultToolbar({ searchQuery, allTags, selectedTags, includeArchived,
  onSearchChange, onToggleTag, onIncludeArchivedChange,
}: VaultToolbarProps) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [types, setTypes] = useState<FilterType[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const selectedSections = useSessionStore((s) => s.selectedSections);
  const dateFrom = useSessionStore((s) => s.dateFrom);
  const dateTo = useSessionStore((s) => s.dateTo);
  const toggleSection = useSessionStore((s) => s.toggleSection);
  const setDateFrom = useSessionStore((s) => s.setDateFrom);
  const setDateTo = useSessionStore((s) => s.setDateTo);
  const clearFilters = useSessionStore((s) => s.clearFilters);
  const extraSections = useResumeStore((s) => s.presets.find((p) => p.id === s.activePresetId)?.additionalSections);
  const sections = [...VAULT_CATEGORIES, ...(extraSections ?? []).filter((s) => s.id.startsWith("custom-")).map((s) => ({ id: s.id, label: s.title }))];
  const count = selectedTags.length + selectedSections.length + (dateFrom || dateTo ? 1 : 0) + (includeArchived ? 1 : 0);
  const shown = (type: FilterType) => types.includes(type) || (type === "Tags" ? selectedTags.length > 0 : type === "Sections" ? selectedSections.length > 0 : Boolean(dateFrom || dateTo));

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); setAdding(false); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setAdding(false); root.current?.querySelector<HTMLButtonElement>('[aria-controls]')?.focus(); } };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open]);

  const removeType = (type: FilterType) => {
    setTypes((previous) => previous.filter((entry) => entry !== type));
    if (type === "Tags") selectedTags.forEach(onToggleTag);
    else if (type === "Sections") selectedSections.forEach(toggleSection);
    else { setDateFrom(""); setDateTo(""); }
  };

  return (
    <div ref={root} className="relative z-20 shrink-0 border-b border-slate-200 bg-white p-3">
      <div className="flex items-center gap-2">
        <input type="search" aria-label="Search vault" placeholder="Search vault…" className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm" value={searchQuery} onChange={(event) => onSearchChange(event.target.value)} />
        <button type="button" aria-expanded={open} aria-controls={panelId} onClick={() => { setOpen(!open); setAdding(false); }}
          className={`inline-flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${count ? "border-primary bg-primary text-white hover:bg-primary-hover" : "border-border-strong text-ink-muted hover:border-accent-border hover:bg-accent-subtle"}`}>
          <SlidersHorizontal size={15} aria-hidden="true" />Filters{count > 0 && <span className="rounded bg-white/20 px-1.5 text-xs">{count}</span>}
        </button>
      </div>
      {open && <div id={panelId} role="dialog" aria-label="Vault filters" className="absolute left-3 right-3 top-full mt-2 max-h-[min(65dvh,480px)] overflow-y-auto rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">Filters</h2>
          <div className="flex items-center gap-3">
            {count > 0 && <button type="button" onClick={() => { clearFilters(); setTypes([]); }} className="text-xs text-ink-muted hover:text-accent-text">Clear all</button>}
            <button type="button" aria-label="Close filters" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700"><X size={16} /></button>
          </div>
        </div>
        <div className="space-y-4">
          {(["Tags", "Date", "Sections"] as FilterType[]).filter(shown).map((type) => <fieldset key={type} className="space-y-2 rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-medium text-slate-600">{type}</legend>
            <div className="flex justify-end"><button type="button" aria-label={`Remove ${type.toLowerCase()} filter`} onClick={() => removeType(type)} className="text-slate-400"><X size={14} /></button></div>
            {type === "Tags" && <>
              <select aria-label="Add tag filter" value="" onChange={(event) => { if (event.target.value) onToggleTag(event.target.value); }} className={fieldClass}>
                <option value="">Choose a tag…</option>
                {allTags.filter((tag) => !selectedTags.includes(tag)).map((tag) => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              <div className="flex flex-wrap gap-1">{selectedTags.map((tag) => <button type="button" key={tag} aria-label={`Remove tag ${tag}`} onClick={() => onToggleTag(tag)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700">{tag}<X size={12} /></button>)}</div>
              <p className="text-xs text-slate-400">Entries must match every selected tag.</p>
            </>}
            {type === "Sections" && <>
              <select aria-label="Add section filter" value="" onChange={(event) => { if (event.target.value) toggleSection(event.target.value); }} className={fieldClass}>
                <option value="">Choose a section…</option>
                {sections.filter((section) => !selectedSections.includes(section.id)).map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
              </select>
              <div className="flex flex-wrap gap-1">{selectedSections.map((id) => <button type="button" key={id} aria-label={`Remove section ${id}`} onClick={() => toggleSection(id)} className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs">{sections.find((section) => section.id === id)?.label ?? id}<X size={12} /></button>)}</div>
            </>}
            {type === "Date" && <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs text-slate-600">From<input type="month" aria-label="Date from" value={dateFrom} max={dateTo || undefined} onChange={(event) => setDateFrom(event.target.value)} className={`${fieldClass} mt-1`} /></label>
                <label className="text-xs text-slate-600">To<input type="month" aria-label="Date to" value={dateTo} min={dateFrom || undefined} onChange={(event) => setDateTo(event.target.value)} className={`${fieldClass} mt-1`} /></label>
              </div>
              <p className="text-xs text-slate-400">Shows dated entries active during this range. Undated entries are excluded.</p>
              {dateFrom && dateTo && dateFrom > dateTo && <p role="alert" className="text-xs text-red-600">Choose an end date after the start date.</p>}
            </>}
          </fieldset>)}
          <div>
            <button type="button" aria-label="Add filter" aria-expanded={adding} onClick={() => setAdding(!adding)} className="inline-flex items-center gap-1.5 rounded-md border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50"><Plus size={14} />Add filter</button>
            {adding && <div className="mt-2 flex flex-wrap gap-2" aria-label="Filter types">
              {(["Tags", "Date", "Sections"] as FilterType[]).filter((type) => !shown(type)).map((type) => <button type="button" key={type} onClick={() => { setTypes((previous) => [...previous, type]); setAdding(false); }} className="rounded-md border border-slate-200 px-3 py-2 text-xs hover:bg-slate-100">{type}</button>)}
              {(["Tags", "Date", "Sections"] as FilterType[]).every(shown) && <p className="text-xs text-slate-500">All filter types have been added.</p>}
            </div>}
          </div>
          <label className="flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-600"><input type="checkbox" checked={includeArchived} onChange={(event) => onIncludeArchivedChange(event.target.checked)} />Include Archived</label>
        </div>
      </div>}
    </div>
  );
}
