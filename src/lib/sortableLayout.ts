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

/**
 * dnd-kit skips layout animation when the active draggable is not in the list
 * (vault → canvas skeleton) and `newIndex` stays equal to `index`. Animate
 * siblings when the skeleton moves up or down in the section.
 */
export const canvasBlockAnimateLayoutChanges: AnimateLayoutChanges = (args) => {
  if (defaultAnimateLayoutChanges(args)) {
    return true;
  }
  const { previousItems, items, id, wasDragging, transition } = args;
  if (!transition || !wasDragging || previousItems === items) {
    return false;
  }
  return sortableIndexChanged(previousItems, items, id);
};
