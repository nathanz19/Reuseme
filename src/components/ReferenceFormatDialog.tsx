"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, Upload } from "lucide-react";
import { IconAction } from "@/components/IconAction";
import { ReferenceEntryHeading } from "@/components/ReferenceEntryHeading";
import { ReferenceLayoutControls } from "@/components/ReferenceLayoutControls";
import { useResumeStore } from "@/store/resumeStore";
import { notifyAiUsageChanged } from "@/lib/aiUsage";
import { referenceFormatStyle } from "@/lib/referenceFormat";
import { FormatAnalysisSchema, MAX_REFERENCE_BYTES } from "@/schemas/referenceFormat";
import type { ResumePreset } from "@/types/resume";
import { z } from "zod";

const ResultSchema = FormatAnalysisSchema.omit({ isResume: true }).extend({ mock: z.boolean() });
type Result = z.infer<typeof ResultSchema>;
const approximationLabels = {
  "multiple-columns": "Multiple columns become a single column.", sidebar: "Sidebar content uses the main column.",
  graphics: "Graphics and photos are not copied.", "custom-font": "Custom fonts use the closest supported font family.",
  "multiple-pages": "The first page is used as the style reference.",
};

export function ReferenceFormatDialog({ preset, onClose }: { preset: ResumePreset; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [formatName, setFormatName] = useState("");
  const nameEdited = useRef(false);
  const [result, setResult] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const apply = useResumeStore((state) => state.applyReferenceFormat);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => { requestRef.current?.abort(); dialog?.close(); };
  }, []);

  const analyze = async () => {
    if (!file) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true); setError(null); setResult(null);
    try {
      const body = new FormData(); body.set("file", file);
      const response = await fetch("/api/resume/format", { method: "POST", body, signal: controller.signal });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Unable to analyze this resume.");
      const analysis = ResultSchema.parse(data);
      if (!controller.signal.aborted) setResult(analysis);
    } catch (failure) {
      if (!controller.signal.aborted) setError(failure instanceof Error ? failure.message : "Unable to analyze this resume.");
    } finally {
      notifyAiUsageChanged();
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  return createPortal(<dialog ref={ref} onCancel={onClose} aria-labelledby="reference-format-title"
    className="fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-2xl overflow-y-auto rounded-2xl bg-surface p-6 text-ink shadow-xl backdrop:bg-black/40 print:hidden">
    <div className="flex items-center justify-between gap-4"><h2 id="reference-format-title" className="text-xl font-semibold">Upload a resume format</h2><IconAction label="Close format upload" onClick={onClose}><X size={18} /></IconAction></div>
    <p className="mt-3 text-sm leading-relaxed text-ink-muted">Upload a reference resume to match its fonts, colors, spacing, header alignment, and section order. Your own name, experience, and skills stay in the document.</p>
    <p className="mt-2 text-xs leading-relaxed text-ink-muted">PDF, PNG, or JPG · Up to 4 MB. Live analysis sends the file to Google AI and uses one of your 10 free requests. The upload is processed for this request; the app saves only the detected style. Use a resume you have permission to upload.</p>
    <label className="mt-5 block text-sm font-medium">Format name
      <input type="text" value={formatName} maxLength={80} placeholder="e.g. My professional template"
        onChange={(event) => { nameEdited.current = true; setFormatName(event.target.value); }}
        className="mt-2 block w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm" />
    </label>
    <p className="mt-1 text-xs text-ink-muted">This name will appear in your template dropdown.</p>
    <label className="mt-4 block text-sm font-medium">Reference resume
      <input type="file" accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg" disabled={loading}
        className="mt-2 block w-full rounded-lg border border-border p-3 text-sm file:mr-3 file:rounded file:border-0 file:bg-accent-subtle file:px-3 file:py-1 file:text-accent-text"
        onChange={(event) => {
          const next = event.target.files?.[0] ?? null;
          setError(null); setResult(null); setFile(null);
          if (next && next.size > MAX_REFERENCE_BYTES) { setError("Choose a file smaller than 4 MB."); return; }
          if (next && !["application/pdf", "image/png", "image/jpeg"].includes(next.type)) { setError("Choose a PDF, PNG, or JPG file."); return; }
          setFile(next);
          if (next && !nameEdited.current) setFormatName(next.name.replace(/\.[^.]+$/, "").slice(0, 80));
        }} />
    </label>
    {!result && <button type="button" disabled={!file || loading} onClick={() => void analyze()} className="btn-primary mt-4 inline-flex items-center gap-2 disabled:opacity-50"><Upload size={16} />{loading ? "Analyzing format…" : "Analyze format"}</button>}
    {loading && <p role="status" className="mt-3 text-sm text-ink-muted">Looking at the reference’s visual style…</p>}
    {error && <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    {result && <div className="mt-5">
      {result.mock && <p className="mb-3 text-sm text-amber-800">Demo preview: this is a sample format, not an analysis of your upload.</p>}
      <h3 className="text-sm font-semibold">Style preview</h3>
      <ReferenceLayoutControls format={result.format} onChange={(format) => setResult({ ...result, format })} />
      <p className="mt-1 text-xs text-ink-muted">A single-column approximation, not an exact replica. Applying may change how much fits on the page. You can undo it or choose a built-in template to reset the style.</p>
      {result.approximations.length > 0 && <ul className="mt-3 list-disc pl-5 text-xs text-amber-800">{result.approximations.map((item) => <li key={item}>{approximationLabels[item]}</li>)}</ul>}
      <div aria-label="Detected format preview" className="resume-reference mt-4 rounded border border-border bg-white text-slate-900" style={referenceFormatStyle(result.format)}>
        <header><h1 className="font-bold">{preset.header.fullName || "Your name"}</h1>
          {result.format.layout?.subtitle === "under-name" && <p className="reference-subtitle">{preset.additionalSections?.find((section) => section.id === "target-title")?.content || "Your target title"}</p>}
          {result.format.layout?.contactLayout === "spread" ? <div className="reference-contacts">{[preset.header.phone || "Your phone", preset.header.email || "Your email", preset.header.location || "Your location"].map((value, index) => <span key={index}>{value}</span>)}</div>
            : <p className="mt-1">{[preset.header.email, preset.header.location].filter(Boolean).join(" · ") || "Your contact information"}</p>}
        </header>
        <section className="mt-5!"><h2>{result.format.details?.experienceHeading ?? "Experience"}</h2>
          {result.format.layout ? <ReferenceEntryHeading title="Your role" organization="Your company" dates="2024 – Present" format={result.format} /> : result.format.details?.entryLayout && result.format.details.entryLayout !== "inline" ? <div>
            <div className="flex items-baseline justify-between gap-4"><p className="font-bold">{result.format.details.entryLayout === "organization-first" ? "Your company" : "Your role"}</p><p className="font-bold">2024 – Present</p></div>
            <p className="font-semibold">{result.format.details.entryLayout === "organization-first" ? "Your role" : "Your company"}</p>
          </div> : <p className="font-semibold">Your role · Your company</p>}<ul data-description-style={result.format.layout?.descriptionStyle} className="mt-2 list-disc pl-5"><li>Your own experience will use this style.</li></ul></section>
        <section><h2>{result.format.details?.skillsHeading ?? "Skills"}</h2>
          {result.format.layout && result.format.layout.skillsStyle !== "inline" ? <ul className="reference-skills list-disc pl-4" data-skills-style={result.format.layout.skillsStyle}>{(preset.customSkillsSection.length ? preset.customSkillsSection.slice(0, 6) : ["Your skills", "Your interests", "Your tools"]).map((skill, index) => <li key={index}>{skill}</li>)}</ul>
            : <p>{preset.customSkillsSection.slice(0, 6).join(", ") || "Your skills and interests"}</p>}
        </section>
      </div>
      <p className="mt-3 text-xs text-ink-muted">Detected: {result.format.details?.fontFace ?? result.format.font} font · {result.format.headerAlignment}-aligned header · {result.format.spacing} spacing · {result.format.margins} margins.</p>
      <p className="mt-3 text-xs text-ink-muted">Applying also saves this style in your template list for reuse.</p>
      <div className="mt-5 flex flex-wrap justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="button" disabled={!formatName.trim()} onClick={() => { apply(preset.id, result.format, formatName); onClose(); }} className="btn-primary disabled:opacity-50">Apply format</button></div>
    </div>}
  </dialog>, document.body);
}
