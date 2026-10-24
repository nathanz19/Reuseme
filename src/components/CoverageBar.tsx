import type { CoverageResult } from "@/lib/coverage";
import type { ParsedJobDescription } from "@/types/resume";

interface CoverageBarProps {
  coverage: CoverageResult;
  parsedJD: ParsedJobDescription | null;
}

export function CoverageBar({ coverage, parsedJD }: CoverageBarProps) {
  if (!parsedJD) {
    return (
      <p className="text-xs text-slate-500">
        Analyze a job description to see required-skill coverage.
      </p>
    );
  }

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-800">Required skill coverage</span>
        <span className="text-slate-600">{coverage.percent}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded bg-slate-100">
        <div
          className="h-full bg-emerald-500 transition-all"
          style={{ width: `${coverage.percent}%` }}
        />
      </div>
      {coverage.missing.length > 0 && (
        <p className="text-xs text-slate-600">
          Missing: {coverage.missing.join(", ")}
        </p>
      )}
      {coverage.covered.length > 0 && (
        <p className="text-xs text-slate-600">
          Covered: {coverage.covered.join(", ")}
        </p>
      )}
      {parsedJD.preferredSkills.length > 0 && (
        <div className="flex flex-wrap gap-1">
          <span className="text-xs text-slate-500">Preferred:</span>
          {parsedJD.preferredSkills.map((skill) => (
            <span
              key={skill}
              className="rounded border border-slate-200 bg-white px-1.5 text-xs text-slate-700"
            >
              {skill}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
