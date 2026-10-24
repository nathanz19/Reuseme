import {
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
} from "@dnd-kit/core";
import type { BlockCategory } from "@/types/resume";

export const VAULT_DROP_ID = "vault-drop";
export const RESUME_DROP_ID = "resume-drop";

/** Stable @dnd-kit context id — avoids module-scoped ID counters that break SSR hydration. */
export const DND_CONTEXT_ID = "reuseme-dnd";

export function vaultDraggableId(blockId: string): string {
  return `vault:${blockId}`;
}

export function parseVaultDraggableId(id: string): string | null {
  return id.startsWith("vault:") ? id.slice("vault:".length) : null;
}

export function sectionDroppableId(category: BlockCategory): string {
  return `section:${category}`;
}

export function parseSectionDroppableId(id: string): BlockCategory | null {
  if (!id.startsWith("section:")) return null;
  return id.slice("section:".length) as BlockCategory;
}

export type DragOrigin = "canvas" | "vault";

export interface DragItemData {
  origin: DragOrigin;
  blockId: string;
  category?: BlockCategory;
}

const PLACEHOLDER_PREFIX = "placeholder:";

export function placeholderId(blockId: string): string {
  return `${PLACEHOLDER_PREFIX}${blockId}`;
}

export function parsePlaceholderId(id: string): string | null {
  return id.startsWith(PLACEHOLDER_PREFIX)
    ? id.slice(PLACEHOLDER_PREFIX.length)
    : null;
}

/** Temporary sortable row inserted while a vault block is over the canvas. */
export interface CanvasPlaceholder {
  id: string;
  blockId: string;
  category: BlockCategory;
  beforeBlockId: string | null;
}

export function isResumeDropTarget(
  overId: string | null,
  blockIds: readonly string[],
): boolean {
  if (!overId) return false;
  if (overId === RESUME_DROP_ID) return true;
  if (parseSectionDroppableId(overId)) return true;
  if (parsePlaceholderId(overId)) return true;
  return blockIds.includes(overId);
}

export interface BlockSpan {
  id: string;
  top: number;
  height: number;
}

/** Insert before the first block whose midpoint is below the pointer, or append. */
export function insertionBeforeBlockId(
  pointerY: number,
  blocks: readonly BlockSpan[],
): string | null {
  for (const block of blocks) {
    const midpoint = block.top + block.height / 2;
    if (pointerY < midpoint) return block.id;
  }
  return null;
}

export function dragPointerY(event: {
  activatorEvent: Event;
  delta: { y: number };
}): number | null {
  const activator = event.activatorEvent;
  if (!("clientY" in activator)) return null;
  const clientY = activator.clientY;
  if (typeof clientY !== "number") return null;
  return clientY + event.delta.y;
}

export const resumeDropCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};
