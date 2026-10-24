"use client";

import { useSortable } from "@dnd-kit/sortable";
import { canvasBlockAnimateLayoutChanges } from "@/lib/sortableLayout";
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
  /** Sortable id. Differs from `block.id` for the temporary vault skeleton. */
  sortableId?: string;
  /** Gray stand-in inserted while a sidebar block is over the canvas. */
  placeholder?: boolean;
}

export function CanvasBlock({
  block,
  preset,
  overflow,
  onRemove,
  onTailorBullet,
  sortableId,
  placeholder = false,
}: CanvasBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId ?? block.id,
    data: { origin: "canvas", blockId: block.id, category: block.category },
    disabled: placeholder ? { draggable: true } : false,
    animateLayoutChanges: canvasBlockAnimateLayoutChanges,
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

  const skeleton = placeholder || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-canvas-block-id={placeholder ? undefined : block.id}
      aria-hidden={placeholder ? true : undefined}
      className={`group relative mb-3 w-full rounded border p-2 ${
        placeholder ? "resume-drop-placeholder print:hidden" : ""
      } ${
        skeleton
          ? "border-slate-300 bg-slate-200"
          : overflow
            ? "overflow-flag border-2 border-amber-500 bg-white"
            : "border-transparent bg-white"
      }`}
    >
      <div className={skeleton ? "pointer-events-none invisible" : undefined}>
        {overflow && (
          <p className="overflow-label mb-1 text-xs font-medium text-amber-800">
            Suggested to cut for space
          </p>
        )}
        <div className="flex items-start gap-1">
          <button
            type="button"
            className="resume-hover-control drag-handle cursor-grab text-slate-400 print:hidden"
            {...(placeholder ? {} : attributes)}
            {...(placeholder ? {} : listeners)}
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
    </div>
  );
}
