"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { sectionSortableId, type SectionDragData } from "@/lib/dnd";
import { CANVAS_BLOCK_TRANSITION } from "@/lib/sortableLayout";

interface SortableSectionProps {
  sectionId: string;
  label: string;
  children: ReactNode;
}

/** A canvas section below the header that drags as a whole by its grip. */
export function SortableSection({ sectionId, label, children }: SortableSectionProps) {
  const data: SectionDragData = { origin: "section", sectionId };
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: sectionSortableId(sectionId),
    data,
    transition: CANVAS_BLOCK_TRANSITION,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 20 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-resume-section={sectionId}
      data-dragging={isDragging ? "true" : undefined}
      className={`resume-section ${
        isDragging
          ? "rounded-sm bg-white shadow-xl ring-1 ring-slate-900/10"
          : ""
      }`}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        aria-label={`Drag ${label} section`}
        title={`Drag to move the ${label} section`}
        className="resume-section-handle absolute -left-7 top-0 flex h-5 w-7 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-focus-ring print:hidden"
      >
        <GripVertical size={16} aria-hidden="true" />
      </button>
      {children}
    </div>
  );
}
