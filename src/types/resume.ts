export type BlockCategory =
  | "experience"
  | "project"
  | "education"
  | "leadership"
  | "certification";

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

export interface ResumePreset {
  id: string;
  name: string;
  templateId: TemplateId;
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
  semanticScore: number;
  matchExplanation: string;
  keywordOverlap: number;
  matchScore: number;
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
];

export const SECTION_LABELS: Record<BlockCategory, string> = {
  education: "Education",
  experience: "Experience",
  project: "Projects",
  leadership: "Leadership",
  certification: "Certifications",
};
