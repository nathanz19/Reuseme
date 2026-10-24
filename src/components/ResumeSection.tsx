"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useMemo } from "react";
import { CanvasBlock } from "@/components/CanvasBlock";
import { sectionDroppableId } from "@/lib/dnd";
import type { AccomplishmentBlock, BlockCategory, ResumePreset } from "@/types/resume";
import { SECTION_LABELS } from "@/types/resume";

export interface SectionItem {
  id: string;
  block: AccomplishmentBlock;
  placeholder: boolean;
}

interface ResumeSectionProps {
  category: BlockCategory;
  items: SectionItem[];
  preset: ResumePreset;
  overflowBlockId: string | null;
  showEmptyDropSlot: boolean;
  highlighted: boolean;
  /** The dragged vault block fits here; outline the section as a valid drop area. */
  dropTarget: boolean;
  dropBlocked: boolean;
  onRemove: (blockId: string) => void;
  onTailorBullet: (blockId: string, bulletIndex: number) => void;
}

export function ResumeSection({
  category,
  items,
  preset,
  overflowBlockId,
  showEmptyDropSlot,
  highlighted,
  dropTarget,
  dropBlocked,
  onRemove,
  onTailorBullet,
}: ResumeSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionDroppableId(category),
    data: { category },
  });

  // SortableContext compares items by reference and disables sibling
  // transitions when they change, so keep the array stable across renders.
  const itemIdsKey = items.map((item) => item.id).join("\n");
  const itemIds = useMemo(
    () => (itemIdsKey ? itemIdsKey.split("\n") : []),
    [itemIdsKey],
  );

  const showSlot = showEmptyDropSlot && items.length === 0 && !dropBlocked;
  const showBlocked = dropBlocked && showEmptyDropSlot && items.length === 0;
  if (items.length === 0 && !showSlot && !showBlocked) return null;

  const ringClass = dropBlocked && (highlighted || isOver)
    ? "bg-red-50/70 ring-2 ring-inset ring-red-400"
    : dropTarget
      ? "resume-drop-target outline-2 outline-offset-4 outline-dashed outline-emerald-500/70 print:outline-none"
      : "";

  return (
    <section
      ref={setNodeRef}
      className={`mb-4 rounded-sm transition-[outline-color] duration-200 ${ringClass}`}
    >
      <h2 className="mb-2 border-b border-slate-300 text-sm font-bold uppercase tracking-wide">
        {SECTION_LABELS[category]}
      </h2>
      {showSlot && (
        <div
          className="mb-3 rounded border border-dashed border-slate-300 bg-slate-50/80 py-6 text-center text-xs text-slate-500 print:hidden"
          aria-hidden
        >
          Drop here
        </div>
      )}
      {showBlocked && (
        <p className="mb-3 rounded border border-dashed border-red-300 bg-red-50 px-2 py-3 text-center text-xs text-red-700 print:hidden">
          Not enough space on the page
        </p>
      )}
      {items.length > 0 && (
        <SortableContext
          items={itemIds}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <CanvasBlock
              key={item.id}
              block={item.block}
              preset={preset}
              sortableId={item.id}
              placeholder={item.placeholder}
              overflow={!item.placeholder && overflowBlockId === item.block.id}
              onRemove={() => onRemove(item.block.id)}
              onTailorBullet={(index) => onTailorBullet(item.block.id, index)}
            />
          ))}
        </SortableContext>
      )}
    </section>
  );
}
