"use client";

import { spaceMeterState } from "@/lib/lineCount";
import { usePageBudget } from "@/lib/usePageBudget";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";
import { MeterBadge } from "@/components/MeterBadge";

interface SpaceMeterProps {
  preset: ResumePreset;
  vaultBlocks: AccomplishmentBlock[];
}

export function SpaceMeter({ preset, vaultBlocks }: SpaceMeterProps) {
  const budget = usePageBudget(preset, vaultBlocks);
  const state = spaceMeterState(budget);

  const color =
    state === "over"
      ? "text-red-700 bg-red-50 border-red-200"
      : state === "warn"
        ? "text-amber-800 bg-amber-50 border-amber-200"
        : "text-accent-text bg-accent-subtle border-accent-border";

  return (
    <MeterBadge
      className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs leading-none font-medium ${color}`}
      label="Estimated lines vs one-page budget"
      help={`Space shows how much of your one-page resume is used: ${budget.usedLines} of ${budget.maxLines} lines, measured on the page. If you go over the limit, shorten or remove content before exporting.`}
    >
      Space {budget.usedLines}/{budget.maxLines}
    </MeterBadge>
  );
}
