"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { btnPrimary, headingLg } from "@/lib/theme";
import type { AccomplishmentBlock, TailoredProposal, Tone } from "@/types/resume";

const OPTIONS: { tone: Tone; label: string; description: string }[] = [
  { tone: "leadership", label: "Job-focused", description: "Connect your experience to the target role." },
  { tone: "technical_ic", label: "Technical", description: "Emphasize execution and how the work was done." },
  { tone: "concise", label: "Conversational", description: "Say it in a more natural, everyday voice." },
];

interface TailorDialogProps {
  block: AccomplishmentBlock;
  proposal: TailoredProposal | null;
  loading: boolean;
  error: string | null;
  mock: boolean;
  originalText: string;
  confirmation?: boolean;
  onConfirm?: () => void;
  onRetry: () => void;
  onToneChange: (tone: Tone) => void;
  onAccept: () => void;
  onReject: () => void;
}

export function TailorDialog({ block, proposal, loading, error, mock, originalText, confirmation = false, onConfirm, onRetry, onToneChange, onAccept, onReject }: TailorDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  const fadeOut = (action: () => void) => {
    if (closeTimer.current !== null) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      action();
      return;
    }
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      action();
      // Keep the dialog usable if Accept is refused by the page-space check.
      setClosing(false);
    }, 250);
  };
  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => {
      if (closeTimer.current !== null) clearTimeout(closeTimer.current);
      closeTimer.current = null;
      dialog?.close();
    };
  }, []);

  return createPortal(
    <dialog ref={dialogRef} aria-labelledby="tailor-title" aria-describedby="tailor-demo-note"
      data-closing={closing}
      onCancel={(event) => { event.preventDefault(); fadeOut(onReject); }}
      onClick={(event) => { if (event.target === event.currentTarget) fadeOut(onReject); }}
      onKeyDown={(event) => event.stopPropagation()}
      className="tailor-dialog fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl bg-surface p-6 text-ink shadow-[var(--shadow-soft)] backdrop:bg-black/40 print:hidden">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="tailor-title" className={headingLg}>Tailor bullet</h2>
          <p className="mt-1 text-xs text-slate-500">{block.title} · {block.organization}</p>
        </div>
        <button type="button" aria-label="Close tailoring" onClick={() => fadeOut(onReject)} disabled={closing} className="rounded-md p-1 text-ink-muted hover:bg-accent-subtle hover:text-accent-text"><X size={18} /></button>
      </div>
      {confirmation ? (
        <>
          <p id="tailor-demo-note" className="mt-4 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Tailoring uses an AI request. Continue only if you want to generate rewrite options for this bullet.
          </p>
          <div className="mt-4">
            <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Bullet to tailor</h3>
            <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm leading-relaxed">{originalText}</p>
          </div>
        </>
      ) : (
        <>
          <p id="tailor-demo-note" className="mt-4 rounded-md border border-accent-border bg-accent-subtle px-3 py-2 text-xs text-accent-text">{mock && !loading ? "Sample responses only. Mock mode is enabled." : "AI rewrites use your bullet and source notes. Review each suggestion before accepting."}</p>
      <div className="mt-4">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-400">Original bullet</h3>
          <p className="mt-2 rounded-lg bg-slate-50 px-3 py-3 text-sm leading-relaxed">{proposal?.originalText ?? originalText}</p>
        </div>
      {loading && <p role="status" className="mt-4 animate-pulse text-sm text-slate-500">Writing three rewrite options…</p>}
      {error && <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        <p>{error}</p>
        <button type="button" onClick={onRetry} disabled={closing} className="mt-2 font-medium underline">Try again</button>
      </div>}
      {proposal && <>
        <fieldset disabled={closing} className="mt-5 space-y-2">
          <legend className="mb-2 text-sm font-medium">Choose a rewrite</legend>
          {OPTIONS.map(({ tone, label, description }) => {
            const selected = proposal.selectedTone === tone;
            return <label key={tone} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selected ? "border-accent-border bg-accent-subtle" : "border-border hover:border-accent-border hover:bg-accent-subtle/50"}`}>
              <input type="radio" name="tailor-tone" value={tone} checked={selected} onChange={() => onToneChange(tone)} className="mt-1 accent-accent" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between text-sm font-medium">{label}{selected && <Check size={14} className="text-accent-text" aria-hidden="true" />}</span>
                <span className="mt-0.5 block text-xs text-slate-400">{description}</span>
                <span className="mt-2 block text-sm leading-relaxed text-slate-700">{proposal.variants[tone]}</span>
              </span>
            </label>;
          })}
        </fieldset>
        {proposal.warnings.length > 0 && <div className="mt-3 space-y-1">{proposal.warnings.map((warning) => <p key={warning} className="text-xs text-amber-700">{warning === "quote_not_found" ? "The supporting quote was not found in your notes." : warning === "source_quote_missing" ? "No supporting source quote was provided." : warning === "concise_too_long" ? "The conversational option exceeds the suggested short length." : `Check this keyword against your notes: ${warning.replace("keyword_unsupported:", "")}`}</p>)}</div>}
      </>}
        </>
      )}
      <div className="mt-5 flex justify-end gap-2 border-t border-slate-100 pt-4">
        <button type="button" onClick={() => fadeOut(onReject)} disabled={closing} className="rounded-lg border border-border px-4 py-2 text-sm text-ink-muted hover:bg-accent-subtle">{confirmation ? "Cancel" : "Reject"}</button>
        <button type="button" onClick={() => confirmation ? fadeOut(onConfirm ?? onReject) : fadeOut(onAccept)} disabled={closing || (confirmation ? !onConfirm : !proposal || loading)} className={`${btnPrimary} disabled:opacity-40`}>{confirmation ? "Continue" : "Accept"}</button>
      </div>
    </dialog>, document.body,
  );
}
