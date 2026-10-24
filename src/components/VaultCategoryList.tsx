"use client";

import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import { Fragment, useMemo, useState } from "react";
import { IconAction } from "@/components/IconAction";
import { SectionActions } from "@/components/SectionActions";
import { AddEntryDialog } from "@/components/AddEntryDialog";
import { useResumeStore } from "@/store/resumeStore";
import { BlockCard } from "@/components/BlockCard";
import {
  DEFAULT_OPEN_VAULT_CATEGORIES,
  VAULT_CATEGORIES,
  type VaultCategory,
  type VaultCategoryId,
} from "@/lib/vaultCategories";
import type {
  AccomplishmentBlock,
  ResumePreset,
  SemanticRanking,
} from "@/types/resume";

interface VaultCategoryListProps {
  blocks: AccomplishmentBlock[];
  header: ResumePreset["header"];
  skills: string[];
  searchQuery: string;
  selectedTags: string[];
  selectedSections: string[];
  dateFilterActive: boolean;
  activeBlockIds: string[];
  rankings: Record<string, SemanticRanking>;
  canAddBlock: (blockId: string) => boolean;
  onAdd: (blockId: string) => void;
  onTailorBullet: (blockId: string, bulletIndex: number) => void;
}

function categoryCount(
  category: VaultCategory,
  blockCount: number,
  contactVisible: boolean,
  skillCount: number,
): number {
  if (category.kind === "blocks") return blockCount;
  if (category.kind === "skills") return skillCount;
  if (category.kind === "contact") return contactVisible ? 1 : 0;
  return 0;
}

function matchesQuery(text: string, query: string): boolean {
  const tokens = query
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = text.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}

export function VaultCategoryList({
  blocks,
  header,
  skills,
  searchQuery,
  selectedTags,
  selectedSections,
  dateFilterActive,
  activeBlockIds,
  rankings,
  canAddBlock,
  onAdd,
  onTailorBullet,
}: VaultCategoryListProps) {
  const [editing, setEditing] = useState(false);
  const [entryCategory, setEntryCategory] = useState<VaultCategory | null>(null);
  const additionalSections = useResumeStore((s) => s.presets.find((p) => p.id === s.activePresetId)?.additionalSections);
  const categories: VaultCategory[] = [...VAULT_CATEGORIES, ...(additionalSections ?? [])
    .filter((section) => section.id.startsWith("custom-"))
    .map((section): VaultCategory => ({ id: section.id as `custom-${string}`, label: section.title, kind: "placeholder" }))];
  const [openOverride, setOpenOverride] = useState<
    Partial<Record<VaultCategoryId, boolean>>
  >({});

  const blocksByCategory = useMemo(() => {
    const map = new Map<AccomplishmentBlock["category"], AccomplishmentBlock[]>();
    for (const block of blocks) {
      const list = map.get(block.category);
      if (list) list.push(block);
      else map.set(block.category, [block]);
    }
    return map;
  }, [blocks]);

  const contactText = [
    header.fullName,
    header.email,
    header.phone,
    header.location,
    ...header.links.map((link) => `${link.label} ${link.url}`),
  ].join(" ");

  const contactVisible =
    selectedTags.length === 0 && matchesQuery(contactText, searchQuery);
  const visibleSkills =
    selectedTags.length === 0
      ? skills.filter((skill) => matchesQuery(skill, searchQuery))
      : [];

  const filterActive =
    searchQuery.trim().length > 0 || selectedTags.length > 0 || selectedSections.length > 0 || dateFilterActive;

  const isOpen = (category: VaultCategory, count: number) => {
    if (filterActive) {
      return count > 0 || openOverride[category.id] === true;
    }
    const override = openOverride[category.id];
    if (override !== undefined) return override;
    return DEFAULT_OPEN_VAULT_CATEGORIES.includes(category.id);
  };

  const toggle = (id: VaultCategoryId, currentlyOpen: boolean) => {
    setOpenOverride((prev) => ({ ...prev, [id]: !currentlyOpen }));
  };

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      {categories.filter((category) => (!selectedSections.length || selectedSections.includes(category.id)) && (!dateFilterActive || category.kind === "blocks")).map((category) => {
        const sectionBlocks = category.blockCategory
          ? (blocksByCategory.get(category.blockCategory) ?? [])
          : [];
        const savedContent = additionalSections?.find((section) => section.id === category.id)?.content ?? "";
        const content = selectedTags.length === 0 && matchesQuery(savedContent, searchQuery) ? savedContent : "";
        const count = category.kind === "placeholder" ? (content ? 1 : 0) : categoryCount(
          category,
          sectionBlocks.length,
          contactVisible,
          visibleSkills.length,
        );
        const open = isOpen(category, count);
        return (
          <VaultCategorySection
            key={category.id}
            category={category}
            open={open}
            onToggle={() => toggle(category.id, open)}
            onCreate={() => { setEditing(false); setEntryCategory(category); }}
            content={content}
            blocks={sectionBlocks}
            header={header}
            skills={visibleSkills}
            contactVisible={contactVisible}
            filterActive={filterActive}
            activeBlockIds={activeBlockIds}
            rankings={rankings}
            canAddBlock={canAddBlock}
            onAdd={onAdd}
            onTailorBullet={onTailorBullet}
          />
        );
      })}
      <button type="button" className="m-3 rounded-lg border border-accent-border px-3 py-2 text-sm font-medium text-accent-text transition-colors hover:bg-accent-subtle"
        onClick={() => { setEditing(false); setEntryCategory({ id: `custom-${crypto.randomUUID()}`, label: "Custom Section", kind: "placeholder" }); }}>
        + Add section
      </button>
      {entryCategory && <AddEntryDialog key={entryCategory.id} editing={editing} category={entryCategory} onClose={() => {
        setOpenOverride((previous) => ({ ...previous, [entryCategory.id]: true }));
        setEntryCategory(null);
      }} />}
    </div>
  );
}

function VaultCategorySection({
  category,
  open,
  onToggle,
  onCreate,
  content,
  blocks,
  header,
  skills,
  contactVisible,
  filterActive,
  activeBlockIds,
  rankings,
  canAddBlock,
  onAdd,
  onTailorBullet,
}: {
  category: VaultCategory;
  open: boolean;
  onToggle: () => void;
  onCreate: () => void;
  content: string;
  blocks: AccomplishmentBlock[];
  header: ResumePreset["header"];
  skills: string[];
  contactVisible: boolean;
  filterActive: boolean;
  activeBlockIds: string[];
  rankings: Record<string, SemanticRanking>;
  canAddBlock: (blockId: string) => boolean;
  onAdd: (blockId: string) => void;
  onTailorBullet: (blockId: string, bulletIndex: number) => void;
}) {
  const count =
    category.kind === "blocks"
      ? blocks.length
      : category.kind === "skills"
        ? skills.length
        : category.kind === "contact"
          ? contactVisible
            ? 1
            : 0
          : 0;

  const panelId = `vault-category-${category.id}`;

  return (
    <section className="vault-section border-b border-slate-200">
      <div className="flex items-center pr-3">
      <button
        type="button"
        className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2.5 text-left text-sm font-medium text-slate-800 hover:bg-slate-50"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={onToggle}
      >
        {open ? (
          <ChevronDown size={16} className="shrink-0 text-slate-400" />
        ) : (
          <ChevronRight size={16} className="shrink-0 text-slate-400" />
        )}
        <span className="min-w-0 flex-1 truncate">{category.label}</span>
        {count > 0 && (
          <span className="shrink-0 text-xs font-normal tabular-nums text-slate-400">
            {count}
          </span>
        )}
      </button>
      {category.kind !== "blocks" && (category.kind === "contact" || skills.length > 0 || content) && (
        <div className="mr-1 flex shrink-0 items-center print:hidden">
          <SectionActions category={category} />
        </div>
      )}
      <IconAction label={`Add to ${category.label}`} onClick={onCreate}>
        <Plus size={16} aria-hidden="true" />
      </IconAction>
      </div>
      {open && (
        <div id={panelId} className="space-y-2 px-3 pb-3">
          {category.kind === "blocks" &&
            (blocks.length > 0 ? (
              blocks.map((block) => (
                <BlockCard
                  key={block.id}
                  block={block}
                  onResume={activeBlockIds.includes(block.id)}
                  ranking={rankings[block.id]}
                  canAdd={canAddBlock(block.id)}
                  onAdd={() => onAdd(block.id)}
                  onTailorBullet={(index) => onTailorBullet(block.id, index)}
                />
              ))
            ) : (
              <p className="text-xs text-slate-500">
                {filterActive
                  ? "No entries match the current filters."
                  : "Nothing saved in this category yet."}
              </p>
            ))}
          {category.kind === "contact" &&
            (contactVisible ? (
              <dl className="grid grid-cols-[5.5rem_1fr] gap-x-2 gap-y-1 text-xs">
                <dt className="text-slate-500">Name</dt>
                <dd className="text-slate-800">{header.fullName}</dd>
                <dt className="text-slate-500">Email</dt>
                <dd className="break-all text-slate-800">{header.email}</dd>
                <dt className="text-slate-500">Phone</dt>
                <dd className="text-slate-800">{header.phone}</dd>
                <dt className="text-slate-500">Location</dt>
                <dd className="text-slate-800">{header.location}</dd>
                {header.links.map((link, index) => (
                  <Fragment key={`${index}-${link.url}`}>
                    <dt className="text-slate-500">Website #{index + 1}</dt>
                    <dd className="break-all text-slate-800">{link.url}</dd>
                  </Fragment>
                ))}
              </dl>
            ) : (
              <p className="text-xs text-slate-500">
                No contact details match the current filters.
              </p>
            ))}
          {category.kind === "skills" &&
            (skills.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
                  >
                    {skill}
                    <RemoveSkillButton skill={skill} />
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                {filterActive
                  ? "No skills match the current filters."
                  : "Nothing saved in this category yet."}
              </p>
            ))}
          {category.kind === "placeholder" && (
            <p className="text-xs text-slate-500">
              {content ? <span className="whitespace-pre-wrap">{content}</span> : "Nothing saved in this category yet."}
            </p>
          )}
        </div>
      )}
    </section>
  );
}

function RemoveSkillButton({ skill }: { skill: string }) {
  const commit = useResumeStore((state) => state.commit);
  return <button type="button" aria-label={`Delete skill ${skill}`} className="ml-1 text-slate-500 hover:text-red-700"
    onClick={() => commit((draft) => {
      const active = draft.presets.find((preset) => preset.id === draft.activePresetId);
      if (active) active.customSkillsSection = active.customSkillsSection.filter((entry) => entry !== skill);
    })}>×</button>;
}
