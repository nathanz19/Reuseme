import type { DropAnimationFunction } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { DragItemData } from "@/lib/dnd";
import { CANVAS_BLOCK_TRANSITION } from "@/lib/sortableLayout";

type DropArgs = Parameters<DropAnimationFunction>[0];

function landedCanvasBlock(args: DropArgs): HTMLElement | null {
  const data = args.active.data.current as DragItemData | undefined;
  if (data?.origin !== "vault") return null;
  const el = document.querySelector(
    `[data-canvas-block-id="${window.CSS.escape(data.blockId)}"]`,
  );
  return el instanceof HTMLElement ? el : null;
}

/** Fly the overlay onto `target`, hiding it until the overlay arrives. */
function flyOverlayTo(
  args: DropArgs,
  target: HTMLElement,
  to: { left: number; top: number },
): Promise<void> {
  const { transform, dragOverlay } = args;
  const final = {
    x: transform.x + to.left - dragOverlay.rect.left,
    y: transform.y + to.top - dragOverlay.rect.top,
    scaleX: 1,
    scaleY: 1,
  };
  const previousOpacity = target.style.opacity;
  target.style.opacity = "0";
  // The overlay ends on top of its target; let a quick re-grab reach the card underneath.
  dragOverlay.node.style.pointerEvents = "none";
  const animation = dragOverlay.node.animate(
    [
      { transform: CSS.Transform.toString(transform) },
      { transform: CSS.Transform.toString(final) },
    ],
    { ...CANVAS_BLOCK_TRANSITION, fill: "forwards" },
  );
  return new Promise((resolve) => {
    animation.onfinish = () => {
      target.style.opacity = previousOpacity;
      resolve();
    };
  });
}

/**
 * dnd-kit's default animates the overlay back to the active node, which for a
 * vault drag is the sidebar card even when the block landed on the canvas.
 * Land on the new canvas block instead; otherwise return to the active node.
 */
export const resumeDropAnimation: DropAnimationFunction = (args) => {
  const landed = landedCanvasBlock(args);
  if (landed) return flyOverlayTo(args, landed, landed.getBoundingClientRect());
  return flyOverlayTo(args, args.active.node, args.active.rect);
};
