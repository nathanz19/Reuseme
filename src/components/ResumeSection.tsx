"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CanvasBlock } from "@/components/CanvasBlock";
import { sectionDroppableId } from "@/lib/dnd";
import type { AccomplishmentBlock, BlockCategory, ResumePreset } from "@/types/resume";
import { SECTION_LABELS } from "@/types/resume";

interface ResumeSectionProps {
  category: BlockCategory;
  blocks: AccomplishmentBlock[];
  preset: ResumePreset;
  overflowBlockId: string | null;
  showEmptyDropSlot: boolean;
  highlighted: boolean;
  onRemove: (blockId: string) => void;
  onTailorBullet: (blockId: string, bulletIndex: number) => void;
}

export function ResumeSection({
  category,
  blocks,
  preset,
  overflowBlockId,
  showEmptyDropSlot,
  highlighted,
  onRemove,
  onTailorBullet,
}: ResumeSectionProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: sectionDroppableId(category),
    data: { category },
  });

  const showSlot = showEmptyDropSlot && blocks.length === 0;
  if (blocks.length === 0 && !showSlot) return null;

  const ringActive = highlighted || isOver;

  return (
    <section
      ref={setNodeRef}
      className={`mb-4 rounded-sm ${ringActive ? "bg-sky-50/80 ring-2 ring-inset ring-sky-300" : ""}`}
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
      {blocks.length > 0 && (
        <SortableContext
          items={blocks.map((b) => b.id)}
          strategy={verticalListSortingStrategy}
        >
          {blocks.map((block) => (
            <CanvasBlock
              key={block.id}
              block={block}
              preset={preset}
              overflow={overflowBlockId === block.id}
              onRemove={() => onRemove(block.id)}
              onTailorBullet={(index) => onTailorBullet(block.id, index)}
            />
          ))}
        </SortableContext>
      )}
    </section>
  );
}
