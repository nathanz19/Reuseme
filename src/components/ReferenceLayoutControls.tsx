"use client";

import type { ReferenceFormat } from "@/schemas/referenceFormat";

type Layout = NonNullable<ReferenceFormat["layout"]>;
export function ReferenceLayoutControls({ format, onChange }: { format: ReferenceFormat; onChange: (format: ReferenceFormat) => void }) {
  if (!format.layout) return null;
  const update = (patch: Partial<Layout>) => onChange({ ...format, layout: { ...format.layout!, ...patch } });
  const selects: { key: "metadataPlacement" | "datesPlacement" | "descriptionStyle" | "skillsStyle" | "contactLayout" | "nameCase" | "metadataWeight" | "metadataColor"; label: string; options: [string, string][] }[] = [
    { key: "metadataPlacement", label: "Company and role layout", options: [["above", "Company above role"], ["below", "Company below role"], ["inline", "One combined row"]] },
    { key: "datesPlacement", label: "Date position", options: [["inline", "Beside company"], ["right", "Right edge"]] },
    { key: "metadataWeight", label: "Company text", options: [["normal", "Regular"], ["bold", "Bold"]] },
    { key: "metadataColor", label: "Company text color", options: [["body", "Body color"], ["muted", "Muted gray"]] },
    { key: "descriptionStyle", label: "Descriptions", options: [["paragraphs", "Paragraphs"], ["bullets", "Bullet points"]] },
    { key: "skillsStyle", label: "Skills layout", options: [["inline", "Comma-separated"], ["list", "Bullet list"], ["columns", "Columns"]] },
    { key: "contactLayout", label: "Contact layout", options: [["inline", "Single line"], ["spread", "Spread across page"]] },
    { key: "nameCase", label: "Name style", options: [["original", "Original capitalization"], ["uppercase", "Uppercase"]] },
  ];
  return <details className="my-4 rounded-lg border border-border p-3 text-sm">
    <summary className="cursor-pointer font-medium">Adjust detected layout</summary>
    <p className="mt-2 text-xs text-ink-muted">Correct a missed detail here. These changes update the preview and do not use an AI request.</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {selects.map(({ key, label, options }) => <label key={key} className="text-xs text-ink-muted">{label}<select aria-label={label} value={String(format.layout![key])} onChange={(event) => update({ [key]: event.target.value })} className="mt-1 block w-full rounded border border-border bg-surface px-2 py-2 text-sm text-ink">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}
      <label className="text-xs text-ink-muted">Skill columns<select aria-label="Skill columns" value={format.layout.skillsColumns} onChange={(event) => update({ skillsColumns: Number(event.target.value) })} className="mt-1 block w-full rounded border border-border bg-surface px-2 py-2 text-sm text-ink">{[1, 2, 3].map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
      <label className="text-xs text-ink-muted">Heading letter spacing (em)<input type="number" min={0} max={0.25} step={0.01} value={format.layout.headingTrackingEm} onChange={(event) => { const value = Number(event.target.value); if (value >= 0 && value <= 0.25) update({ headingTrackingEm: value }); }} className="mt-1 block w-full rounded border border-border bg-surface px-2 py-2 text-sm text-ink" /></label>
      {format.details && <>
        <label className="text-xs text-ink-muted">Section rule position<select aria-label="Section rule position" value={format.details.rulePosition} onChange={(event) => onChange({ ...format, details: { ...format.details!, rulePosition: event.target.value as "above" | "below" } })} className="mt-1 block w-full rounded border border-border bg-surface px-2 py-2 text-sm text-ink"><option value="above">Above heading</option><option value="below">Below heading</option></select></label>
        <label className="text-xs text-ink-muted">Body text size (px)<input type="number" min={11} max={18} step={0.1} value={format.details.bodyPx} onChange={(event) => { const value = Number(event.target.value); if (value >= 11 && value <= 18) onChange({ ...format, details: { ...format.details!, bodyPx: value } }); }} className="mt-1 block w-full rounded border border-border bg-surface px-2 py-2 text-sm text-ink" /></label>
      </>}
    </div>
  </details>;
}
