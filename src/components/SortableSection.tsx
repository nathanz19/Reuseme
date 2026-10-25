"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { CSSProperties, ReactNode } from "react";
import { KEYBOARD_DRAG_FOCUS, KeyboardDragHandle } from "@/components/KeyboardDragHandle";
import { sectionSortableId, wholeElementDragListeners, type SectionDragData } from "@/lib/dnd";
import {
  CANVAS_BLOCK_TRANSITION,
  canvasBlockAnimateLayoutChanges,
} from "@/lib/sortableLayout";

interface SortableSectionProps {
  sectionId: string;
  label: string;
  /** Allow the section to move. */
  draggable?: boolean;
  children: ReactNode;
}

/**
 * A canvas section below the header that drags as a whole from any point
 * outside its blocks and controls.
 * Like a canvas block, the section itself turns into a gray skeleton that
 * slides between slots while an elevated copy follows the pointer inside
 * `<DragOverlay>` (see `SectionOverlay`).
 */
export function SortableSection({ sectionId, label, draggable = true, children }: SortableSectionProps) {
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
    disabled: draggable ? false : { draggable: true },
    animateLayoutChanges: canvasBlockAnimateLayoutChanges,
    transition: CANVAS_BLOCK_TRANSITION,
  });

  const style: CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    position: "relative",
    zIndex: isDragging ? 10 : undefined,
  };

  // Presses inside a canvas block reach the block first, so they never move the section.
  const dragListeners = wholeElementDragListeners(listeners);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...dragListeners}
      data-resume-section={sectionId}
      data-dragging={isDragging ? "true" : undefined}
      // Equal gutters extend into the page padding so the dragged card is
      // symmetrical, while the section content stays aligned with the page.
      className={`resume-section -mx-7 rounded-sm px-7 ${KEYBOARD_DRAG_FOCUS} ${
        dragListeners && !isDragging ? "cursor-grab select-none" : ""
      } ${isDragging ? "bg-slate-200 ring-1 ring-inset ring-slate-300" : ""}`}
    >
      {dragListeners && (
        <KeyboardDragHandle label={`Drag ${label} section`} attributes={attributes} handleRef={setActivatorNodeRef} />
      )}
      <div data-section-content className={isDragging ? "pointer-events-none invisible" : undefined}>
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
  return { sectionId, html: (clone.querySelector(":scope > [data-section-content]") ?? clone).innerHTML };
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
