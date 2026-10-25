import type { ReferenceFormat } from "@/schemas/referenceFormat";

export type BlockCategory =
  | "experience"
  | "project"
  | "education"
  | "leadership"
  | "certification"
  | "awards"
  | "publications";

export type TemplateId = "classic-ats" | "modern-tech";

export type Tone = "technical_ic" | "leadership" | "concise";

/** Immutable source of truth. Holds no JD/AI state. */
export interface AccomplishmentBlock {
  id: string;
  category: BlockCategory;
  title: string;
  organization: string;
  location?: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  sourceContext: string;
  tags: string[];
  isArchived: boolean;
}

/** The block fields the match route and scoring need (no dates, category, or archive flag). */
export type MatchableBlock = Pick<
  AccomplishmentBlock,
  "id" | "title" | "organization" | "tags" | "bullets" | "sourceContext"
>;

export interface AdditionalSection {
  id: string;
  title: string;
  content: string;
}

export interface ResumePreset {
  id: string;
  name: string;
  templateId: TemplateId;
  referenceFormat?: ReferenceFormat;
  referenceFormatId?: string;
  header: {
    fullName: string;
    email: string;
    phone: string;
    location: string;
    links: { label: string; url: string }[];
  };
  activeBlockIds: string[];
  bulletOverrides: Record<string, Record<number, string>>;
  customSkillsSection: string[];
  additionalSections?: AdditionalSection[];
  /** Canvas order of the sections below the header (see `resolveSectionOrder`). */
  sectionOrder?: string[];
}

export interface ParsedJobDescription {
  rawText: string;
  roleTitle: string;
  companyName: string;
  requiredSkills: string[];
  preferredSkills: string[];
  keyResponsibilities: string[];
}

export interface BlockRanking {
  score: number;
  explanation: string;
}

export interface SemanticRanking {
  blockId: string;
  /** True when the card's content shows at least one job requirement. */
  relevant: boolean;
  semanticScore: number;
  /** Subset of the card's own tags that map to job requirements. */
  matchedTags: string[];
  /** 0-based index of the bullet that best evidences the job. */
  bestBulletIndex: number;
  matchExplanation: string;
  keywordOverlap: number;
  matchScore: number;
}

/** A job requirement mapped to existing vault tags. */
export interface TagMatch {
  requirement: string;
  tags: string[];
}

export interface TailoredProposal {
  blockId: string;
  bulletIndex: number;
  originalText: string;
  variants: Record<Tone, string>;
  selectedTone: Tone;
  sourceQuote: string;
  matchedKeywords: string[];
  unsupportedFlags: string[];
  warnings: string[];
}

export const SECTION_ORDER: BlockCategory[] = [
  "education",
  "experience",
  "project",
  "leadership",
  "certification",
  "awards",
  "publications",
];

export const SECTION_LABELS: Record<BlockCategory, string> = {
  education: "Education",
  experience: "Experience",
  project: "Projects",
  leadership: "Leadership",
  certification: "Certifications",
  awards: "Awards & Scholarships",
  publications: "Publications",
};
