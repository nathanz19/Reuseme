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

export const resumeDropCollision: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};
