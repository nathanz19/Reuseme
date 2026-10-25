"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo, type ReactNode } from "react";
import { resumeTemplateClass } from "@/components/CanvasBlock";
import { SectionActions } from "@/components/SectionActions";
import { SortableSection } from "@/components/SortableSection";
import { VAULT_CATEGORIES } from "@/lib/vaultCategories";
import { ResumeHeader } from "@/components/ResumeHeader";
import { ResumeSection, type SectionItem } from "@/components/ResumeSection";
import { RESUME_DROP_ID, sectionSortableId, type CanvasPlaceholder } from "@/lib/dnd";
import { isWithinLineBudget, pickOverflowBlockId } from "@/lib/lineCount";
import { isBlockSection, resolveSectionOrder, SKILLS_SECTION_ID } from "@/lib/sectionOrder";
import { MAX_LINES, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/tunables";
import type {
  AccomplishmentBlock,
  BlockCategory,
  ResumePreset,
  SemanticRanking,
} from "@/types/resume";
import { SECTION_LABELS, SECTION_ORDER } from "@/types/resume";
import { referenceFormatStyle } from "@/lib/referenceFormat";

function sectionItems(
  category: BlockCategory,
  blocks: AccomplishmentBlock[],
  placeholder: CanvasPlaceholder | null,
  byId: Map<string, AccomplishmentBlock>,
): SectionItem[] {
  const items: SectionItem[] = blocks.map((block) => ({
    id: block.id,
    block,
    placeholder: false,
  }));
  if (
    !placeholder ||
    placeholder.category !== category ||
    items.some((item) => item.id === placeholder.blockId)
  ) {
    return items;
  }
  const block = byId.get(placeholder.blockId);
  if (!block) return items;
  const ghost: SectionItem = {
    id: placeholder.id,
    block,
    placeholder: true,
    leaving: placeholder.leaving,
  };
  const index = placeholder.beforeBlockId
    ? items.findIndex((item) => item.id === placeholder.beforeBlockId)
    : -1;
  if (index === -1) items.push(ghost);
  else items.splice(index, 0, ghost);
  return items;
}

interface ResumeCanvasProps {
  preset: ResumePreset;
  vaultBlocks: AccomplishmentBlock[];
  rankings: Record<string, SemanticRanking>;
  vaultDragCategory: BlockCategory | null;
  highlightedSection: BlockCategory | null;
  /** Section a vault block being dragged can be dropped into. */
  dropTargetSection: BlockCategory | null;
  /** Canvas block being dragged over the vault, which would remove it. */
  removingBlockId: string | null;
  placeholder: CanvasPlaceholder | null;
  dropBlocked: boolean;
  onRemove: (blockId: string) => void;
  onTailorBullet: (blockId: string, bulletIndex: number) => void;
}

export function ResumeCanvas({
  preset,
  vaultBlocks,
  rankings,
  vaultDragCategory,
  highlightedSection,
  dropTargetSection,
  removingBlockId,
  placeholder,
  dropBlocked,
  onRemove,
  onTailorBullet,
}: ResumeCanvasProps) {
  const { setNodeRef } = useDroppable({ id: RESUME_DROP_ID });

  const byId = useMemo(
    () => new Map(vaultBlocks.map((b) => [b.id, b])),
    [vaultBlocks],
  );

  const blocksBySection = useMemo(() => {
    const map = new Map<AccomplishmentBlock["category"], AccomplishmentBlock[]>();
    for (const cat of SECTION_ORDER) {
      map.set(cat, []);
    }
    for (const id of preset.activeBlockIds) {
      const block = byId.get(id);
      if (block) {
        map.get(block.category)?.push(block);
      }
    }
    return map;
  }, [byId, preset.activeBlockIds]);

  const withinBudget = isWithinLineBudget(preset, vaultBlocks);
  const overflowBlockId = withinBudget
    ? null
    : pickOverflowBlockId(preset, vaultBlocks, rankings);

  const templateId = preset.templateId;
  const templateClass = resumeTemplateClass(templateId);

  const additionalById = new Map(
    (preset.additionalSections ?? []).map((section) => [section.id, section]),
  );
  const sections: { id: string; label: string; content: ReactNode }[] = [];
  for (const id of resolveSectionOrder(preset)) {
    if (id === "target-title" && preset.referenceFormat?.layout?.subtitle === "under-name") continue;
    if (isBlockSection(id)) {
      const items = sectionItems(id, blocksBySection.get(id) ?? [], placeholder, byId);
      // An empty section only appears while a vault block of its category is dragged.
      if (items.length === 0 && vaultDragCategory !== id) continue;
      sections.push({
        id,
        label: SECTION_LABELS[id],
        content: (
          <ResumeSection
            category={id}
            items={items}
            preset={preset}
            overflowBlockId={overflowBlockId}
            showEmptyDropSlot={vaultDragCategory === id}
            highlighted={highlightedSection === id}
            dropTarget={dropTargetSection === id}
            removingBlockId={removingBlockId}
            dropBlocked={dropBlocked}
            onRemove={onRemove}
            onTailorBullet={onTailorBullet}
          />
        ),
      });
    } else if (id === SKILLS_SECTION_ID) {
      if (preset.customSkillsSection.length === 0) continue;
      sections.push({
        id,
        label: "Skills",
        content: (
          <section className="group mb-3" aria-label="Resume skills">
            <h2 className="mb-2 border-b border-slate-300 pb-0.5 text-sm font-bold uppercase tracking-wide">
              {preset.referenceFormat?.details?.skillsHeading ?? "Skills"}
            </h2>
            <div className="relative pt-1">
              {preset.referenceFormat?.layout && preset.referenceFormat.layout.skillsStyle !== "inline" ? <ul data-skills-style={preset.referenceFormat.layout.skillsStyle} className="reference-skills list-disc pl-4 text-sm">
                {preset.customSkillsSection.map((skill, index) => <li key={index}>{skill}</li>)}
              </ul> : <p className="pr-16 text-sm print:pr-0">{preset.customSkillsSection.join(", ")}</p>}
              <div className="resume-hover-control absolute right-0 top-0 print:hidden">
                <SectionActions category={{ id: "skills", label: "Skills & Interests", kind: "skills" }} />
              </div>
            </div>
          </section>
        ),
      });
    } else {
      const section = additionalById.get(id);
      if (!section) continue;
      const vaultCategory = VAULT_CATEGORIES.find((category) => category.id === section.id);
      sections.push({
        id,
        label: section.title || vaultCategory?.label || "Custom",
        content: vaultCategory ? (
          <section className="group relative my-2 pr-16 print:pr-0">
            <div className="resume-hover-control absolute right-0 top-0 print:hidden">
              <SectionActions category={vaultCategory} />
            </div>
            {section.id !== "target-title" && <h2 className="mb-2 border-b border-slate-300 pb-0.5 text-sm font-bold uppercase tracking-wide">{section.id === "summary" ? preset.referenceFormat?.layout?.summaryHeading ?? section.title : section.title}</h2>}
            <p className="whitespace-pre-wrap pt-1 text-sm">{section.content}</p>
          </section>
        ) : (
          <section className="mb-3">
            <h2 className="mb-2 border-b border-slate-300 pb-0.5 text-sm font-bold uppercase tracking-wide">{section.title}</h2>
            <p className="whitespace-pre-wrap pt-1 text-sm">{section.content}</p>
          </section>
        ),
      });
    }
  }

  // SortableContext compares items by reference; keep the array stable across renders.
  const sectionIdsKey = sections.map((section) => section.id).join("\n");
  const sortableSectionIds = useMemo(
    () => (sectionIdsKey ? sectionIdsKey.split("\n").map(sectionSortableId) : []),
    [sectionIdsKey],
  );

  return (
    <div
      ref={setNodeRef}
      id="resume-print-root"
      className={`resume-page mx-auto box-border overflow-hidden bg-white p-8 shadow-[var(--shadow-soft)] ${preset.referenceFormat ? "resume-reference" : ""} ${templateClass} print:shadow-none ${
        dropBlocked
          ? "ring-2 ring-red-500"
          : "ring-1 ring-border"
      }`}
      style={{ ...(preset.referenceFormat ? referenceFormatStyle(preset.referenceFormat) : {}), width: PAGE_WIDTH, height: PAGE_HEIGHT }}
      role="region"
      aria-label={`Resume canvas, US Letter (${PAGE_WIDTH}×${PAGE_HEIGHT}px), about ${MAX_LINES} estimated lines`}
    >
      <ResumeHeader
        header={preset.header}
        templateId={templateId}
        referenceFormat={preset.referenceFormat}
        subtitle={preset.referenceFormat?.layout?.subtitle === "under-name" ? preset.additionalSections?.find((section) => section.id === "target-title")?.content : undefined}
      />
      <SortableContext items={sortableSectionIds} strategy={verticalListSortingStrategy}>
        {sections.map((section) => (
          <SortableSection key={section.id} sectionId={section.id} label={section.label}>
            {section.content}
          </SortableSection>
        ))}
      </SortableContext>
    </div>
  );
}
