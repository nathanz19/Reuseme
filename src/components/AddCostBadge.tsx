/** What adding a vault block does to the page, measured on the current resume. */
export interface AddCost {
  /** Body lines the block adds: `ceil(px / lineHeightPx)`, at least 1. */
  lines: number;
  /** Height the block adds, in px. Includes the section heading when the section is empty. */
  px: number;
  /** Page height still free before the block is added, in px. Negative when over. */
  freePx: number;
}

export function addCostFromCheck(
  check: { currentCanvasHeight: number; draggedBlockHeight: number; maxCanvasHeight: number },
  lineHeightPx: number,
): AddCost {
  return {
    lines: Math.max(1, Math.ceil(check.draggedBlockHeight / lineHeightPx)),
    px: Math.round(check.draggedBlockHeight),
    freePx: Math.round(check.maxCanvasHeight - check.currentCanvasHeight),
  };
}

export function AddCostBadge({ cost }: { cost: AddCost | null | undefined }) {
  if (!cost) return null;
  const free =
    cost.freePx >= 0
      ? `${cost.freePx}px free on the page now`
      : `the page is ${-cost.freePx}px over now`;
  return (
    <span
      data-add-cost={cost.lines}
      title={`Adds about ${cost.px}px to the page; ${free}.`}
      className="shrink-0 text-[11px] font-medium tabular-nums text-slate-500"
    >
      +{cost.lines} {cost.lines === 1 ? "line" : "lines"}
    </span>
  );
}
