"use client";

import { useEffect, useState } from "react";
import {
  estimatePageBudget,
  measurePage,
  pageBudgetFromUsedPx,
  type PageBudget,
} from "@/lib/lineCount";
import { usePageFit, usePageMeasurerVersion } from "@/lib/pageFit";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

/**
 * Budget of the document on screen, in this order:
 * 1. the live canvas height, when the canvas is visible;
 * 2. the offscreen measurer, when it is not (the vault pane on small screens,
 *    or before the first measurement) and the measurer is ready;
 * 3. the character formula, until either exists.
 * `enabled` is false for the measurer's own canvas, which must never measure itself.
 */
export function usePageBudget(
  preset: ResumePreset,
  vaultBlocks: AccomplishmentBlock[],
  enabled = true,
): PageBudget {
  const fit = usePageFit();
  const measurerVersion = usePageMeasurerVersion();
  const [measured, setMeasured] = useState<{
    preset: ResumePreset;
    blocks: AccomplishmentBlock[];
    budget: PageBudget;
  } | null>(null);

  const live = enabled && fit !== null;
  useEffect(() => {
    if (!enabled || live || measurerVersion === 0) return;
    // The measurer renders synchronously, so it runs on a later task, not during commit.
    const timer = window.setTimeout(() => {
      setMeasured({ preset, blocks: vaultBlocks, budget: measurePage(preset, vaultBlocks) });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [enabled, live, measurerVersion, preset, vaultBlocks]);

  if (live) return pageBudgetFromUsedPx(preset, fit.usedPx, fit.availablePx);
  if (measured && measured.preset === preset && measured.blocks === vaultBlocks) {
    return measured.budget;
  }
  return estimatePageBudget(preset, vaultBlocks);
}
