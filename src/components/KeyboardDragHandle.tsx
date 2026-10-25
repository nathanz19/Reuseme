"use client";

import type { DraggableAttributes } from "@dnd-kit/core";

/**
 * Outline for a draggable whose direct-child `KeyboardDragHandle` has keyboard
 * focus. The direct-child match keeps a section from lighting up for a focused
 * block handle inside it.
 */
export const KEYBOARD_DRAG_FOCUS =
  "has-[>[data-drag-handle]:focus-visible]:outline-2 has-[>[data-drag-handle]:focus-visible]:outline-offset-2 has-[>[data-drag-handle]:focus-visible]:outline-focus-ring";

/**
 * Visually hidden activator for keyboard drags (Space, arrows, Space).
 * Pointers drag the whole element, so this takes no space in the layout.
 */
export function KeyboardDragHandle({ label, attributes, handleRef }: {
  label: string;
  attributes: DraggableAttributes;
  handleRef: (node: HTMLElement | null) => void;
}) {
  return (
    <button type="button" ref={handleRef} {...attributes} aria-label={label} data-drag-handle
      className="sr-only print:hidden" />
  );
}
