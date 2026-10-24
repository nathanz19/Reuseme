import {
  closestCenter,
  pointerWithin,
  rectIntersection,
  type CollisionDetection,
  type DroppableContainer,
  type KeyboardCoordinateGetter,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates } from "@dnd-kit/sortable";
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

/** A whole canvas section below the header, dragged by its grip. */
export interface SectionDragData {
  origin: "section";
  sectionId: string;
}

const SECTION_SORTABLE_PREFIX = "section-sort:";

export function sectionSortableId(sectionId: string): string {
  return `${SECTION_SORTABLE_PREFIX}${sectionId}`;
}

export function parseSectionSortableId(id: string): string | null {
  return id.startsWith(SECTION_SORTABLE_PREFIX)
    ? id.slice(SECTION_SORTABLE_PREFIX.length)
    : null;
}

export function isSectionDragData(data: unknown): data is SectionDragData {
  return (
    typeof data === "object" &&
    data !== null &&
    (data as Partial<SectionDragData>).origin === "section"
  );
}

function isSectionContainer(container: DroppableContainer): boolean {
  return isSectionDragData(container.data.current);
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
  /** Fading out after the pointer left the canvas; not a drop target. */
  leaving?: boolean;
}

/** Matches the `.resume-drop-placeholder-leaving` fade in globals.css. */
export const PLACEHOLDER_FADE_OUT_MS = 150;

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

/**
 * Canvas reorders resolve against same-section blocks by center distance so the
 * gaps between blocks never fall through to the section droppable, which would
 * reset sibling transforms mid-drag. Raw pointer hits go stale once the canvas
 * auto-scrolls, so they only decide whether the block is being dropped on the vault.
 * Section drags only see other sections, and block drags never see sections.
 */
export const resumeDropCollision: CollisionDetection = (allArgs) => {
  if (isSectionDragData(allArgs.active.data.current)) {
    return closestCenter({
      ...allArgs,
      droppableContainers: allArgs.droppableContainers.filter(isSectionContainer),
    });
  }
  const args = {
    ...allArgs,
    droppableContainers: allArgs.droppableContainers.filter(
      (container) => !isSectionContainer(container),
    ),
  };
  const pointerCollisions = pointerWithin(args);
  const activeData = args.active.data.current as DragItemData | undefined;
  if (
    activeData?.origin === "canvas" &&
    !pointerCollisions.some((collision) => collision.id === VAULT_DROP_ID)
  ) {
    const siblings = args.droppableContainers.filter((container) => {
      const data = container.data.current as Partial<DragItemData> | undefined;
      return data?.origin === "canvas" && data.category === activeData.category;
    });
    if (siblings.length > 0) {
      return closestCenter({ ...args, droppableContainers: siblings });
    }
  }
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return rectIntersection(args);
};

class FilteredDroppableContainers extends Map<UniqueIdentifier, DroppableContainer> {
  getEnabled(): DroppableContainer[] {
    return [...this.values()].filter((container) => !container.disabled);
  }

  toArray(): DroppableContainer[] {
    return [...this.values()];
  }

  getNodeFor(id: UniqueIdentifier | null | undefined): HTMLElement | undefined {
    if (id == null) return undefined;
    return this.get(id)?.node.current ?? undefined;
  }
}

/**
 * Arrow keys step a picked-up section past whole neighbouring sections, and a
 * picked-up block past blocks only, instead of landing on whatever droppable
 * of the other kind happens to be nearest.
 */
export const resumeKeyboardCoordinates: KeyboardCoordinateGetter = (event, args) => {
  const { droppableContainers, active } = args.context;
  const sectionDrag = isSectionDragData(active?.data.current);
  const containers = new FilteredDroppableContainers(
    [...droppableContainers.entries()].filter(
      ([, container]) => isSectionContainer(container) === sectionDrag,
    ),
  );
  return sortableKeyboardCoordinates(event, {
    ...args,
    context: { ...args.context, droppableContainers: containers },
  });
};
