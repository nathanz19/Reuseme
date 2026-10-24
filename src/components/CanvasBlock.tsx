"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

interface CanvasBlockProps {
  block: AccomplishmentBlock;
  preset: ResumePreset;
  overflow: boolean;
  onRemove: () => void;
  onTailorBullet: (bulletIndex: number) => void;
}

export function CanvasBlock({
  block,
  preset,
  overflow,
  onRemove,
  onTailorBullet,
}: CanvasBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: block.id,
    data: { origin: "canvas", blockId: block.id, category: block.category },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const bullets = getEffectiveBullets(block, preset);
  const dateLine = [block.startDate, block.endDate].filter(Boolean).join(" – ");
  const meta = [block.organization, block.location, dateLine]
    .filter(Boolean)
    .join(" · ");

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative mb-3 rounded border bg-white p-2 ${
        overflow
          ? "overflow-flag border-amber-500 border-2"
          : "border-transparent"
      } ${isDragging ? "opacity-60" : ""}`}
    >
      {overflow && (
        <p className="overflow-label mb-1 text-xs font-medium text-amber-800">
          Suggested to cut for space
        </p>
      )}
      <div className="flex items-start gap-1">
        <button
          type="button"
          className="resume-hover-control drag-handle cursor-grab text-slate-400 print:hidden"
          {...attributes}
          {...listeners}
          aria-label="Drag to reorder"
        >
          <GripVertical size={16} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm">
            {block.title}
            {meta && (
              <span className="font-normal text-slate-700"> — {meta}</span>
            )}
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-900">
            {bullets.map((bullet, index) => (
              <li key={index} className="group/bullet relative pr-16">
                {bullet}
                <button
                  type="button"
                  className="resume-hover-control absolute right-0 top-0 text-xs text-slate-600 underline print:hidden"
                  onClick={() => onTailorBullet(index)}
                >
                  Tailor
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          className="resume-hover-control text-xs text-red-700 underline print:hidden"
          onClick={onRemove}
        >
          Remove
        </button>
      </div>
    </div>
  );
}
