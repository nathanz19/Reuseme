import type { CSSProperties } from "react";
import type { ReferenceFormat } from "@/schemas/referenceFormat";

export function referenceFormatStyle(format: ReferenceFormat): CSSProperties {
  const details = format.details;
  const margin = details?.marginPx ?? { narrow: 24, standard: 32, wide: 48 }[format.margins];
  return {
    fontFamily: details ? `"${details.fontFace}", ${format.font === "serif" ? "serif" : format.font === "mono" ? "monospace" : "sans-serif"}` : { serif: 'Georgia, "Times New Roman", serif', sans: 'Arial, Helvetica, sans-serif', mono: '"Courier New", monospace' }[format.font],
    padding: margin,
    "--reference-rail-width": `${margin - 4}px`,
    "--reference-actions-direction": margin < 46 ? "column" : "row",
    "--reference-control-size": margin < 46 ? "18px" : "20px",
    "--reference-name-case": format.layout?.nameCase === "uppercase" ? "uppercase" : "none",
    "--reference-heading-tracking": `${format.layout?.headingTrackingEm ?? 0.04}em`,
    "--reference-skills-columns": format.layout?.skillsColumns ?? 1,
    "--reference-body": `${details?.bodyPx ?? { small: 13, medium: 14, large: 16 }[format.bodySize]}px`,
    "--reference-heading": `${details?.headingPx ?? 14}px`,
    "--reference-name": `${details?.namePx ?? { medium: 24, large: 28, "extra-large": 32 }[format.nameSize]}px`,
    "--reference-align": format.headerAlignment,
    "--reference-case": format.headingCase === "uppercase" ? "uppercase" : "none",
    "--reference-rule": `${{ none: 0, thin: 1, thick: 2 }[format.headingRule]}px`,
    "--reference-accent": format.accent,
    "--reference-leading": details?.lineHeight ?? { compact: 1.25, balanced: 1.4, airy: 1.55 }[format.spacing],
    "--reference-section-gap": `${details?.sectionGapPx ?? { compact: 8, balanced: 12, airy: 18 }[format.spacing]}px`,
    "--reference-block-gap": `${details?.blockGapPx ?? { compact: 4, balanced: 8, airy: 12 }[format.spacing]}px`,
    "--reference-heading-gap": `${details?.headingGapPx ?? 6}px`,
    "--reference-rule-color": details?.ruleColor ?? format.accent,
    "--reference-above-rule": details?.rulePosition === "above" ? `${details.ruleWidthPx}px` : "0px",
    "--reference-below-rule": details?.rulePosition === "above" ? "0px" : `${details?.ruleWidthPx ?? { none: 0, thin: 1, thick: 2 }[format.headingRule]}px`,
    "--reference-card-padding": details ? "0px" : "8px",
  } as CSSProperties;
}
