import { CoverageBar } from "@/components/CoverageBar";
import { ForgottenList } from "@/components/ForgottenList";
import type { CoverageResult } from "@/lib/coverage";
import type { AccomplishmentBlock, ParsedJobDescription, SemanticRanking } from "@/types/resume";

interface JDPanelProps {
  jdText: string;
  lastMatchError: string | null;
  parsedJD: ParsedJobDescription | null;
  coverage: CoverageResult;
  forgottenBlocks: AccomplishmentBlock[];
  rankings: Record<string, SemanticRanking>;
  activeBlockIds: string[];
  canAddBlock: (blockId: string) => boolean;
  onJdTextChange: (text: string) => void;
  onAnalyze: () => void;
  onAddBlock: (blockId: string) => boolean;
}

export function JDPanel({
  jdText,
  lastMatchError,
  parsedJD,
  coverage,
  forgottenBlocks,
  rankings,
  activeBlockIds,
  canAddBlock,
  onJdTextChange,
  onAnalyze,
  onAddBlock,
}: JDPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-3">
      <textarea
        className="min-h-[200px] w-full rounded border border-slate-300 p-2 text-sm"
        placeholder="Paste job description…"
        value={jdText}
        onChange={(e) => onJdTextChange(e.target.value)}
      />
      <button
        type="button"
        onClick={onAnalyze}
        className="rounded bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800"
      >
        Analyze &amp; Rank Vault
      </button>
      {lastMatchError && (
        <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800">
          {lastMatchError}
        </p>
      )}
      <CoverageBar coverage={coverage} parsedJD={parsedJD} />
      <ForgottenList
        blocks={forgottenBlocks}
        rankings={rankings}
        activeBlockIds={activeBlockIds}
        canAddBlock={canAddBlock}
        onAdd={onAddBlock}
      />
    </div>
  );
}
