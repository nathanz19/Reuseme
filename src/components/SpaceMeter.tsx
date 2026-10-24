import { estimateLineCount, spaceMeterState } from "@/lib/lineCount";
import { MAX_LINES } from "@/lib/tunables";
import type { AccomplishmentBlock, ResumePreset } from "@/types/resume";

interface SpaceMeterProps {
  preset: ResumePreset;
  vaultBlocks: AccomplishmentBlock[];
}

export function SpaceMeter({ preset, vaultBlocks }: SpaceMeterProps) {
  const total = estimateLineCount(preset, vaultBlocks);
  const display = Math.ceil(total);
  const state = spaceMeterState(total);

  const color =
    state === "over"
      ? "text-red-700 bg-red-50 border-red-200"
      : state === "warn"
        ? "text-amber-800 bg-amber-50 border-amber-200"
        : "text-slate-700 bg-slate-50 border-slate-200";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-medium ${color}`}
      title="Estimated lines vs one-page budget"
    >
      Space {display}/{MAX_LINES}
    </span>
  );
}
