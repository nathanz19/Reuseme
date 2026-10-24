import type { UniqueIdentifier } from "@dnd-kit/core";
import {
  defaultAnimateLayoutChanges,
  type AnimateLayoutChanges,
} from "@dnd-kit/sortable";

/** True when a sortable row changed index because the list order changed mid-drag. */
export function sortableIndexChanged(
  previousItems: readonly UniqueIdentifier[],
  items: readonly UniqueIdentifier[],
  id: UniqueIdentifier,
): boolean {
  const prevIndex = previousItems.indexOf(id);
  const nextIndex = items.indexOf(id);
  return prevIndex !== -1 && nextIndex !== -1 && prevIndex !== nextIndex;
}

/** Sibling glide and skeleton slide timing for canvas block reordering. */
export const CANVAS_BLOCK_TRANSITION = {
  duration: 200,
  easing: "cubic-bezier(0.2, 0, 0, 1)",
};

/**
 * Forcing `wasDragging` keeps the dragged row animating into its slot after
 * drop instead of snapping. dnd-kit also skips layout animation when the active
 * draggable is not in the list (vault → canvas skeleton) and `newIndex` stays
 * equal to `index`, so animate siblings when that skeleton moves up or down.
 */
export const canvasBlockAnimateLayoutChanges: AnimateLayoutChanges = (args) => {
  // A block dropped on the vault collapses its slot before removal; replaying
  // a layout animation from pre-drag rects would bounce siblings back down.
  if (!args.isSorting && args.items.length < args.previousItems.length) {
    return false;
  }
  if (defaultAnimateLayoutChanges({ ...args, wasDragging: true })) {
    return true;
  }
  const { active, previousItems, items, id, wasDragging, transition } = args;
  if (!transition || !wasDragging || previousItems === items) {
    return false;
  }
  // After a canvas reorder the siblings already sit in their new slot visually;
  // animating from their pre-drag layout would flash them back for a frame.
  if (!active || items.includes(active.id)) {
    return false;
  }
  return sortableIndexChanged(previousItems, items, id);
};
