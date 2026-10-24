"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { sectionSortableId, type SectionDragData } from "@/lib/dnd";
import {
  CANVAS_BLOCK_TRANSITION,
  canvasBlockAnimateLayoutChanges,
} from "@/lib/sortableLayout";

interface SortableSectionProps {
  sectionId: string;
  label: string;
  children: ReactNode;
}

/**
 * A canvas section below the header that drags as a whole by its grip.
 * Like a canvas block, the section itself turns into a gray skeleton that
 * slides between slots while an elevated copy follows the pointer inside
 * `<DragOverlay>` (see `SectionOverlay`).
 */
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
    animateLayoutChanges: canvasBlockAnimateLayoutChanges,
    transition: CANVAS_BLOCK_TRANSITION,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      data-resume-section={sectionId}
      data-dragging={isDragging ? "true" : undefined}
      // Equal gutters extend into the page padding so the card contains the grip
      // and is symmetrical, while the section content stays aligned with the page.
      className={`resume-section -mx-7 rounded-sm px-7 ${
        isDragging ? "bg-slate-200 ring-1 ring-inset ring-slate-300" : ""
      }`}
    >
      <div className={isDragging ? "pointer-events-none invisible" : undefined}>
        <button
          type="button"
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Drag ${label} section`}
          title={`Drag to move the ${label} section`}
          className="resume-section-handle absolute left-0 top-0 flex h-5 w-7 cursor-grab touch-none items-center justify-center rounded text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-focus-ring print:hidden"
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
        {children}
      </div>
    </div>
  );
}

/** Static copy of a section's markup, taken when its drag starts. */
export interface SectionSnapshot {
  sectionId: string;
  html: string;
}

/** Copy the section's rendered markup without ids that would duplicate the live section. */
export function snapshotSection(sectionId: string, node: HTMLElement | null): SectionSnapshot | null {
  if (!node) return null;
  const clone = node.cloneNode(true) as HTMLElement;
  for (const el of clone.querySelectorAll("[data-canvas-block-id], [data-removing], [id], [tabindex]")) {
    el.removeAttribute("data-canvas-block-id");
    el.removeAttribute("data-removing");
    el.removeAttribute("id");
    el.removeAttribute("tabindex");
  }
  // The first child wraps the grip and the section content.
  return { sectionId, html: (clone.firstElementChild ?? clone).innerHTML };
}

/** Elevated copy of a section that follows the pointer inside `<DragOverlay>`. */
export function SectionOverlay({ snapshot }: { snapshot: SectionSnapshot }) {
  return (
    <div
      aria-hidden="true"
      data-dragging="true"
      className="resume-section relative cursor-grabbing rounded-sm bg-white px-7 shadow-xl ring-1 ring-slate-900/10 [&>*]:pointer-events-none [&>section]:!m-0"
      dangerouslySetInnerHTML={{ __html: snapshot.html }}
    />
  );
}
