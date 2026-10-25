import { z } from "zod";

export const ReferenceLayoutSchema = z.object({
  nameCase: z.enum(["original", "uppercase"]),
  subtitle: z.enum(["section", "under-name"]),
  contactLayout: z.enum(["inline", "spread"]),
  contactIcons: z.boolean(),
  metadataPlacement: z.enum(["inline", "above", "below"]),
  datesPlacement: z.enum(["inline", "right"]),
  metadataWeight: z.enum(["normal", "bold"]),
  metadataColor: z.enum(["body", "muted"]),
  descriptionStyle: z.enum(["bullets", "paragraphs"]),
  skillsStyle: z.enum(["inline", "list", "columns"]),
  skillsColumns: z.number().int().min(1).max(3),
  headingTrackingEm: z.number().min(0).max(0.25),
  summaryHeading: z.enum(["Summary", "About Me", "Profile", "Professional Summary"]),
});

export const ReferenceDetailsSchema = z.object({
  fontFace: z.enum(["Times New Roman", "Georgia", "Arial", "Calibri", "Courier New"]),
  bodyPx: z.number().min(11).max(18),
  headingPx: z.number().min(11).max(20),
  namePx: z.number().min(20).max(40),
  lineHeight: z.number().min(1).max(1.6),
  marginPx: z.number().min(20).max(64),
  sectionGapPx: z.number().min(0).max(24),
  blockGapPx: z.number().min(0).max(20),
  headingGapPx: z.number().min(0).max(12),
  entryLayout: z.enum(["inline", "organization-first", "title-first"]),
  rulePosition: z.enum(["above", "below"]),
  ruleColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  ruleWidthPx: z.number().min(0).max(3),
  contactSeparator: z.enum(["pipe", "dot"]),
  experienceHeading: z.enum(["Experience", "Work Experience", "Professional Experience"]),
  skillsHeading: z.enum(["Skills", "Technical Skills"]),
});

export const ReferenceFormatSchema = z.object({
  details: ReferenceDetailsSchema.optional(),
  layout: ReferenceLayoutSchema.optional(),
  font: z.enum(["serif", "sans", "mono"]),
  bodySize: z.enum(["small", "medium", "large"]),
  nameSize: z.enum(["medium", "large", "extra-large"]),
  headerAlignment: z.enum(["left", "center", "right"]),
  headingCase: z.enum(["uppercase", "title"]),
  headingRule: z.enum(["none", "thin", "thick"]),
  accent: z.enum(["#000000", "#0f172a", "#334155", "#1e40af", "#075985", "#365314", "#7f1d1d", "#581c87"]),
  spacing: z.enum(["compact", "balanced", "airy"]),
  margins: z.enum(["narrow", "standard", "wide"]),
  sectionOrder: z.array(z.enum(["target-title", "summary", "education", "experience", "project", "leadership", "certification", "awards", "publications", "skills"])).max(10),
});
export type ReferenceFormat = z.infer<typeof ReferenceFormatSchema>;

export const FormatAnalysisSchema = z.object({
  isResume: z.boolean(),
  format: ReferenceFormatSchema,
  approximations: z.array(z.enum(["multiple-columns", "sidebar", "graphics", "custom-font", "multiple-pages"])).max(5),
});

export const DEMO_REFERENCE_FORMAT: ReferenceFormat = {
  font: "sans", bodySize: "medium", nameSize: "large", headerAlignment: "center",
  headingCase: "uppercase", headingRule: "thin", accent: "#075985", spacing: "balanced",
  margins: "standard", sectionOrder: ["summary", "experience", "project", "education", "skills"],
};
export const MAX_REFERENCE_BYTES = 4 * 1024 * 1024;
