import { Loader2 } from "lucide-react";
import type { AddCost } from "@/components/AddCostBadge";
import { RankedVaultList, type RankedEntry } from "@/components/RankedVaultList";
import { RequiredSkills } from "@/components/RequiredSkills";
import type { CoverageResult } from "@/lib/coverage";
import { btnPrimarySm } from "@/lib/theme";
import type {
  ParsedJobDescription,
  ResumePreset,
  TagMatch,
} from "@/types/resume";

interface JDPanelProps {
  jdText: string;
  matchLoading: boolean;
  lastMatchError: string | null;
  parsedJD: ParsedJobDescription | null;
  coverage: CoverageResult;
  ranked: RankedEntry[];
  tagMatches: TagMatch[];
  preset: ResumePreset;
  canAddBlock: (blockId: string) => boolean;
  addCost: (blockId: string) => AddCost | null;
  onJdTextChange: (text: string) => void;
  onAnalyze: () => void;
  onAddBlock: (blockId: string) => boolean;
}

export function JDPanel({
  jdText,
  matchLoading,
  lastMatchError,
  parsedJD,
  coverage,
  ranked,
  tagMatches,
  preset,
  canAddBlock,
  addCost,
  onJdTextChange,
  onAnalyze,
  onAddBlock,
}: JDPanelProps) {
  const requiredCount = parsedJD?.requiredSkills.length ?? 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-2 border-b border-border p-3">
        <textarea
          rows={5}
          className="w-full resize-none rounded border border-slate-300 p-2 text-sm"
          placeholder="Paste job description…"
          value={jdText}
          onChange={(e) => onJdTextChange(e.target.value)}
        />
        <button
          type="button"
          onClick={onAnalyze}
          disabled={matchLoading}
          className={`inline-flex w-full items-center justify-center gap-2 ${btnPrimarySm}`}
        >
          {matchLoading && (
            <Loader2 size={14} className="animate-spin" aria-hidden="true" />
          )}
          Analyze &amp; Rank Vault
        </button>
        {parsedJD && !lastMatchError && !matchLoading && (
          <p className="text-xs text-slate-500" role="status">
            Ranked {ranked.length} vault {ranked.length === 1 ? "entry" : "entries"}{" "}
            against {requiredCount} required {requiredCount === 1 ? "skill" : "skills"}.
          </p>
        )}
        {lastMatchError && (
          <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
            {lastMatchError}
          </p>
        )}
      </div>
      <RequiredSkills coverage={coverage} parsedJD={parsedJD} />
      <RankedVaultList
        ranked={ranked}
        preset={preset}
        tagMatches={tagMatches}
        canAddBlock={canAddBlock}
        addCost={addCost}
        onAdd={onAddBlock}
      />
    </div>
  );
}
