"use client";

import type { ReactNode } from "react";
import { collapseWhitespace } from "@/lib/normalize";
import { diffWords } from "@/lib/textDiff";
import type { AccomplishmentBlock, TailoredProposal, Tone } from "@/types/resume";

const TONE_LABELS: Record<Tone, string> = {
  technical_ic: "Technical IC",
  leadership: "Leadership",
  concise: "Concise",
};

function warningLabel(code: string): string {
  if (code === "quote_not_found") return "Quote not found in your notes";
  if (code === "concise_too_long") return "Concise variant exceeds length limit";
  if (code.startsWith("keyword_unsupported:")) {
    return `Keyword unsupported: ${code.split(":")[1] ?? ""}`;
  }
  return code;
}

interface TailorDialogProps {
  block: AccomplishmentBlock;
  proposal: TailoredProposal | null;
  loading: boolean;
  onToneChange: (tone: Tone) => void;
  onAccept: () => void;
  onReject: () => void;
}

export function TailorDialog({
  block,
  proposal,
  loading,
  onToneChange,
  onAccept,
  onReject,
}: TailorDialogProps) {
  if (!proposal && !loading) return null;

  const selectedTone = proposal?.selectedTone ?? "technical_ic";
  const revised = proposal?.variants[selectedTone] ?? "";
  const diff = proposal ? diffWords(proposal.originalText, revised) : [];

  const quote = proposal?.sourceQuote ?? "";
  const ctx = block.sourceContext;
  const collapsedCtx = collapseWhitespace(ctx);
  const collapsedQuote = collapseWhitespace(quote);
  const quoteFound =
    quote.length > 0 && collapsedCtx.includes(collapsedQuote);

  let highlightedContext = ctx;
  if (quoteFound && quote) {
    const idx = collapsedCtx.indexOf(collapsedQuote);
    if (idx >= 0) {
      highlightedContext = ctx;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tailor-title"
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl">
        <h2 id="tailor-title" className="text-lg font-semibold text-emerald-950">
          Tailor bullet
        </h2>
        {loading && <p className="mt-2 text-sm text-slate-600">Loading proposal…</p>}
        {proposal && (
          <>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(TONE_LABELS) as Tone[]).map((tone) => (
                <button
                  key={tone}
                  type="button"
                  onClick={() => onToneChange(tone)}
                  className={`rounded border px-2 py-1 text-xs ${
                    selectedTone === tone
                      ? "border-emerald-900 bg-emerald-900 text-white hover:bg-emerald-800"
                      : "border-slate-300 hover:border-emerald-200 hover:bg-emerald-50"
                  }`}
                >
                  {TONE_LABELS[tone]}
                </button>
              ))}
            </div>
            <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-sm">
              {diff.map((part, i) => (
                <span
                  key={i}
                  className={
                    part.added
                      ? "bg-emerald-50 text-emerald-700"
                      : part.removed
                        ? "line-through bg-red-100"
                        : ""
                  }
                >
                  {part.text}
                </span>
              ))}
            </div>
            <div className="mt-3">
              <p className="text-xs font-medium text-slate-500">Source context</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800">
                {quoteFound && quote
                  ? highlightQuote(ctx, quote)
                  : highlightedContext}
              </p>
            </div>
            {proposal.unsupportedFlags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {proposal.unsupportedFlags.map((flag) => (
                  <span
                    key={flag}
                    className="rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs"
                  >
                    not in your notes: {flag}
                  </span>
                ))}
              </div>
            )}
            {proposal.warnings.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {proposal.warnings.map((w) => (
                  <span
                    key={w}
                    className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs text-amber-900"
                  >
                    {warningLabel(w)}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded border border-slate-300 px-3 py-1 text-sm"
                onClick={onReject}
              >
                Reject
              </button>
              <button
                type="button"
                className="rounded bg-emerald-900 px-3 py-1 text-sm text-white hover:bg-emerald-800"
                onClick={onAccept}
              >
                Accept
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function highlightQuote(context: string, quote: string): ReactNode {
  const idx = context.indexOf(quote);
  if (idx < 0) {
    const parts = context.split(new RegExp(`(${escapeRegExp(quote)})`, "i"));
    return parts.map((part, i) =>
      part.toLowerCase() === quote.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200">{part}</mark>
      ) : (
        part
      ),
    );
  }
  return (
    <>
      {context.slice(0, idx)}
      <mark className="bg-yellow-200">{quote}</mark>
      {context.slice(idx + quote.length)}
    </>
  );
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
