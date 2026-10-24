"use client";

import { useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";
import { ResumeHeader } from "@/components/ResumeHeader";
import { ResumeSection } from "@/components/ResumeSection";
import { RESUME_DROP_ID } from "@/lib/dnd";
import { pickOverflowBlockId } from "@/lib/lineCount";
import type {
  AccomplishmentBlock,
  BlockCategory,
  ResumePreset,
  SemanticRanking,
} from "@/types/resume";
import { SECTION_ORDER } from "@/types/resume";

interface ResumeCanvasProps {
  preset: ResumePreset;
  vaultBlocks: AccomplishmentBlock[];
  rankings: Record<string, SemanticRanking>;
  vaultDragCategory: BlockCategory | null;
  highlightedSection: BlockCategory | null;
  onRemove: (blockId: string) => void;
  onHeaderSave: (
    header: ResumePreset["header"],
    skills: string[],
  ) => void;
  onTailorBullet: (blockId: string, bulletIndex: number) => void;
}

export function ResumeCanvas({
  preset,
  vaultBlocks,
  rankings,
  vaultDragCategory,
  highlightedSection,
  onRemove,
  onHeaderSave,
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

  const overflowBlockId = pickOverflowBlockId(preset, vaultBlocks, rankings);

  const templateId = preset.templateId;
  const templateClass =
    templateId === "modern-tech"
      ? "font-[family-name:var(--font-geist-sans)]"
      : "font-serif";

  return (
    <div
      ref={setNodeRef}
      id="resume-print-root"
      className={`mx-auto w-[816px] max-w-full bg-white p-8 shadow-md ${templateClass} print:shadow-none`}
    >
      <ResumeHeader
        header={preset.header}
        customSkills={preset.customSkillsSection}
        templateId={templateId}
        onSave={onHeaderSave}
      />
      {SECTION_ORDER.map((category) => (
        <ResumeSection
          key={category}
          category={category}
          blocks={blocksBySection.get(category) ?? []}
          preset={preset}
          overflowBlockId={overflowBlockId}
          showEmptyDropSlot={vaultDragCategory === category}
          highlighted={highlightedSection === category}
          onRemove={onRemove}
          onTailorBullet={onTailorBullet}
        />
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
