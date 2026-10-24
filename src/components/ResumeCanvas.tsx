"use client";

import { useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";
import { SectionActions } from "@/components/SectionActions";
import { VAULT_CATEGORIES } from "@/lib/vaultCategories";
import { ResumeHeader } from "@/components/ResumeHeader";
import { ResumeSection, type SectionItem } from "@/components/ResumeSection";
import { RESUME_DROP_ID, type CanvasPlaceholder } from "@/lib/dnd";
import { isWithinLineBudget, pickOverflowBlockId } from "@/lib/lineCount";
import { MAX_LINES, PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/tunables";
import type {
  AccomplishmentBlock,
  BlockCategory,
  ResumePreset,
  SemanticRanking,
} from "@/types/resume";
import { SECTION_ORDER } from "@/types/resume";

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
  if (!placeholder || placeholder.category !== category) return items;
  const block = byId.get(placeholder.blockId);
  if (!block) return items;
  const ghost: SectionItem = {
    id: placeholder.id,
    block,
    placeholder: true,
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
  const templateClass =
    templateId === "modern-tech"
      ? "font-[family-name:var(--font-geist-sans)]"
      : "font-serif";

  return (
    <div
      ref={setNodeRef}
      id="resume-print-root"
      className={`resume-page mx-auto box-border overflow-hidden bg-white p-8 shadow-md ${templateClass} print:shadow-none ${
        dropBlocked
          ? "ring-2 ring-red-500"
          : withinBudget
            ? "ring-1 ring-slate-200"
            : "ring-2 ring-amber-400"
      }`}
      style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }}
      title={`US Letter (${PAGE_WIDTH}×${PAGE_HEIGHT}px), ~${MAX_LINES} estimated lines`}
    >
      <ResumeHeader
        header={preset.header}
        templateId={templateId}
      />
      {(preset.additionalSections ?? []).filter((section) =>
        section.id === "target-title" || section.id === "summary"
      ).map((section) => (
        <section key={section.id} className="group relative my-3 pr-16 print:pr-0">
          <div className="resume-hover-control absolute right-0 top-0 print:hidden">
            <SectionActions category={VAULT_CATEGORIES.find((category) => category.id === section.id)!} />
          </div>
          {section.id !== "target-title" && <h2 className="mb-2 border-b border-slate-300 text-sm font-bold uppercase tracking-wide">{section.title}</h2>}
          <p className="whitespace-pre-wrap text-sm">{section.content}</p>
        </section>
      ))}
      {SECTION_ORDER.map((category) => (
        <ResumeSection
          key={category}
          category={category}
          items={sectionItems(
            category,
            blocksBySection.get(category) ?? [],
            placeholder,
            byId,
          )}
          preset={preset}
          overflowBlockId={overflowBlockId}
          showEmptyDropSlot={vaultDragCategory === category}
          highlighted={highlightedSection === category}
          dropBlocked={dropBlocked}
          onRemove={onRemove}
          onTailorBullet={onTailorBullet}
        />
      ))}
      {(preset.additionalSections ?? []).filter((section) =>
        section.id !== "target-title" && section.id !== "summary"
      ).map((section) => (
        <section key={section.id} className="mb-4">
          <h2 className="mb-2 border-b border-slate-300 text-sm font-bold uppercase tracking-wide">{section.title}</h2>
          <p className="whitespace-pre-wrap text-sm">{section.content}</p>
        </section>
      ))}
      {preset.customSkillsSection.length > 0 && (
        <section className="mb-4">
          <h2 className="mb-2 border-b border-slate-300 text-sm font-bold uppercase tracking-wide">
            Skills
          </h2>
          <p className="text-sm">{preset.customSkillsSection.join(", ")}</p>
        </section>
      )}
    </div>
  );
}
