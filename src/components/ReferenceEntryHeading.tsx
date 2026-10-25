import type { ReferenceFormat } from "@/schemas/referenceFormat";

export function ReferenceEntryHeading({ title, organization, location, dates, format }: {
  title: string; organization: string; location?: string; dates: string; format: ReferenceFormat;
}) {
  const layout = format.layout!;
  const metadata = [organization, location].filter(Boolean).join(" · ");
  const metaClass = `${layout.metadataWeight === "bold" ? "font-bold" : "font-normal"} ${layout.metadataColor === "muted" ? "text-slate-500" : ""}`;
  const inlineDates = layout.datesPlacement === "inline" && dates;
  const dateRight = layout.datesPlacement === "right" && dates;
  const meta = <p className={metaClass}>{metadata}{inlineDates && `${metadata ? " | " : ""}${dates}`}</p>;
  const date = dateRight ? <p className={`shrink-0 text-right ${metaClass}`}>{dates}</p> : null;
  return <div className="reference-entry-heading" data-metadata-placement={layout.metadataPlacement}>
    {layout.metadataPlacement === "above" && <div className="flex items-baseline justify-between gap-4">{meta}{date}</div>}
    {layout.metadataPlacement === "inline" ? <div className="flex items-baseline justify-between gap-4"><p><strong>{title}</strong>{metadata && <span className={metaClass}> — {metadata}</span>}{inlineDates && <span className={metaClass}> | {dates}</span>}</p>{date}</div>
      : <p className="font-bold">{title}</p>}
    {layout.metadataPlacement === "below" && <div className="flex items-baseline justify-between gap-4">{meta}{date}</div>}
  </div>;
}
