"use client";

import type { CSSProperties, ReactNode } from "react";
import { BlockActions } from "@/components/BlockActions";
import { useSortable } from "@dnd-kit/sortable";
import {
  CANVAS_BLOCK_TRANSITION,
  canvasBlockAnimateLayoutChanges,
} from "@/lib/sortableLayout";
import { CSS } from "@dnd-kit/utilities";
import { IconAction } from "@/components/IconAction";
import { GripVertical, RefreshCw } from "lucide-react";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import type { AccomplishmentBlock, ResumePreset, TemplateId } from "@/types/resume";

export function resumeTemplateClass(templateId: TemplateId): string {
  return templateId === "modern-tech"
    ? "font-[family-name:var(--font-geist-sans)]"
    : "font-serif";
}

interface CanvasBlockBodyProps {
  block: AccomplishmentBlock;
  preset: ResumePreset;
  overflow: boolean;
  handle: ReactNode;
  actions?: ReactNode;
  onTailorBullet?: (bulletIndex: number) => void;
}

function CanvasBlockBody({
  block,
  preset,
  overflow,
  handle,
  actions,
  onTailorBullet,
}: CanvasBlockBodyProps) {
  const bullets = getEffectiveBullets(block, preset);
  const dateLine = [block.startDate, block.endDate].filter(Boolean).join(" – ");
  const meta = [block.organization, block.location, dateLine]
    .filter(Boolean)
    .join(" · ");

  return (
    <>
      {overflow && (
        <p className="overflow-label mb-1 text-xs font-medium text-amber-800">
          Suggested to cut for space
        </p>
      )}
      <div className="flex items-start gap-1">
        {handle}
        <div className="min-w-0 flex-1">
          <p className="pr-16 font-semibold text-sm print:pr-0">
            {block.title}
            {meta && (
              <span className="font-normal text-slate-700"> — {meta}</span>
            )}
          </p>
          <ul className="mt-1 list-disc pl-5 text-sm text-slate-900">
            {bullets.map((bullet, index) => (
              <li key={index} className="group/bullet relative pr-8 print:pr-0">
                {bullet}
                {onTailorBullet && (
                  <IconAction label="Tailor bullet" className="resume-hover-control absolute right-0 top-0 print:hidden" onClick={() => onTailorBullet(index)}>
                    <RefreshCw size={14} aria-hidden="true" />
                  </IconAction>
                )}
              </li>
            ))}
          </ul>
        </div>
        {actions}
      </div>
    </>
  );
}

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
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sortableId ?? block.id,
    data: { origin: "canvas", blockId: block.id, category: block.category },
    disabled: placeholder ? { draggable: true } : false,
    animateLayoutChanges: canvasBlockAnimateLayoutChanges,
    transition: CANVAS_BLOCK_TRANSITION,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    // Stays active while dragging so the skeleton slides into its new slot.
    transition,
    position: "relative",
    zIndex: isDragging ? 10 : "auto",
  };

  const skeleton = placeholder || isDragging;

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-canvas-block-id={placeholder ? undefined : block.id}
      aria-hidden={placeholder ? true : undefined}
      className={`group mb-3 w-full rounded border p-2 ${
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
        <CanvasBlockBody
          block={block}
          preset={preset}
          overflow={overflow}
          onTailorBullet={onTailorBullet}
          handle={
            <button
              type="button"
              ref={placeholder ? undefined : setActivatorNodeRef}
              className="resume-hover-control drag-handle cursor-grab text-slate-400 print:hidden"
              {...(placeholder ? {} : attributes)}
              {...(placeholder ? {} : listeners)}
              aria-label="Drag to reorder"
            >
              <GripVertical size={16} />
            </button>
          }
          actions={
            <div className="resume-hover-control absolute right-1 top-1 print:hidden">
              {!placeholder && <BlockActions block={block} onRemove={onRemove} />}
            </div>
          }
        />
      </div>
    </div>
  );
}

/** Elevated copy of a canvas block that follows the pointer inside `<DragOverlay>`. */
export function CanvasBlockOverlay({
  block,
  preset,
  width,
  blocked = false,
}: {
  block: AccomplishmentBlock;
  preset: ResumePreset;
  /** Canvas block width in px; defaults to the dragged node's width. */
  width?: number;
  blocked?: boolean;
}) {
  return (
    <div
      style={width ? { width } : undefined}
      className={`w-full rounded border bg-white p-2 shadow-xl ring-1 ring-slate-900/5 ${
        blocked ? "cursor-not-allowed border-red-500" : "cursor-grabbing border-slate-300"
      } ${resumeTemplateClass(preset.templateId)}`}
    >
      {blocked && (
        <p className="mb-1 text-xs font-medium text-red-700">
          Not enough space on the page
        </p>
      )}
      <CanvasBlockBody
        block={block}
        preset={preset}
        overflow={false}
        handle={
          <span className="text-slate-500" aria-hidden="true">
            <GripVertical size={16} />
          </span>
        }
      />
    </div>
  );
}
