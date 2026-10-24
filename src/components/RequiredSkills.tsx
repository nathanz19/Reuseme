"use client";

import { Check, ChevronDown, ChevronRight, Minus } from "lucide-react";
import { useId, useState } from "react";
import type { CoverageResult } from "@/lib/coverage";
import type { ParsedJobDescription } from "@/types/resume";

interface RequiredSkillsProps {
  coverage: CoverageResult;
  parsedJD: ParsedJobDescription | null;
}

export function RequiredSkills({ coverage, parsedJD }: RequiredSkillsProps) {
  const [open, setOpen] = useState(true);
  const listId = useId();

  if (!parsedJD || parsedJD.requiredSkills.length === 0) return null;

  const covered = new Set(coverage.covered);
  const total = parsedJD.requiredSkills.length;

  return (
    <section
      aria-label="Required skills"
      className="shrink-0 border-b border-border px-3 py-3"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={listId}
        className="flex w-full items-center justify-between text-[11px]"
      >
        <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-wide text-slate-500">
          {open ? (
            <ChevronDown size={12} aria-hidden="true" />
          ) : (
            <ChevronRight size={12} aria-hidden="true" />
          )}
          Required skills
        </span>
        <span className="font-semibold text-slate-800">
          {coverage.covered.length} of {total} covered
        </span>
      </button>
      <ul id={listId} hidden={!open} className="mt-2 flex flex-wrap gap-1.5">
        {parsedJD.requiredSkills.map((skill) => {
          const isCovered = covered.has(skill);
          return (
            <li
              key={skill}
              data-skill-state={isCovered ? "covered" : "missing"}
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                isCovered
                  ? "border-accent-border bg-accent-subtle text-accent-text"
                  : "border-dashed border-border-strong bg-surface text-ink-muted"
              }`}
            >
              {isCovered ? (
                <Check size={12} aria-hidden="true" />
              ) : (
                <Minus size={12} aria-hidden="true" />
              )}
              {skill}
              <span className="sr-only">{isCovered ? "covered" : "missing"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
