import type { ReferenceFormat } from "@/schemas/referenceFormat";

export const COMPACT_SERIF_FORMAT: ReferenceFormat = {
  font: "serif", bodySize: "small", nameSize: "large", headerAlignment: "center", headingCase: "uppercase", headingRule: "thin", accent: "#000000", spacing: "compact", margins: "wide",
  sectionOrder: ["education", "experience", "project", "skills"],
  details: {
    fontFace: "Times New Roman", bodyPx: 13.3, headingPx: 16, namePx: 26.67,
    lineHeight: 1.35, marginPx: 48, sectionGapPx: 13, blockGapPx: 0, headingGapPx: 4,
    entryLayout: "organization-first", rulePosition: "above", ruleColor: "#888888", ruleWidthPx: 1,
    contactSeparator: "pipe", experienceHeading: "Work Experience", skillsHeading: "Technical Skills",
  },
};

export const MODERN_PARAGRAPH_FORMAT: ReferenceFormat = {
  ...COMPACT_SERIF_FORMAT, font: "sans", accent: "#000000", sectionOrder: ["summary", "education", "experience", "skills"],
  details: { ...COMPACT_SERIF_FORMAT.details!, fontFace: "Arial", bodyPx: 12, headingPx: 14, namePx: 34, lineHeight: 1.3, marginPx: 50, sectionGapPx: 16, blockGapPx: 12 },
  layout: {
    nameCase: "uppercase", subtitle: "under-name", contactLayout: "spread", contactIcons: true,
    metadataPlacement: "above", datesPlacement: "inline", metadataWeight: "normal", metadataColor: "muted",
    descriptionStyle: "paragraphs", skillsStyle: "columns", skillsColumns: 3, headingTrackingEm: 0.1, summaryHeading: "About Me",
  },
};
