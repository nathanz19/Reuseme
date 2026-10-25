import type { BlockCategory } from "@/types/resume";

export type VaultCategoryId =
  | `custom-${string}`
  | "contact"
  | "target-title"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "certification"
  | "awards"
  | "project"
  | "leadership"
  | "publications";

export type VaultCategoryKind = "contact" | "skills" | "blocks" | "placeholder";

export interface VaultCategory {
  id: VaultCategoryId;
  label: string;
  kind: VaultCategoryKind;
  blockCategory?: BlockCategory;
}

/** Category rows shown in the vault, in display order. */
export const VAULT_CATEGORIES: VaultCategory[] = [
  { id: "contact", label: "Contact Information", kind: "contact" },
  { id: "skills", label: "Skills & Interests", kind: "skills" },
  { id: "target-title", label: "Target Title", kind: "placeholder" },
  { id: "summary", label: "Professional Summary", kind: "placeholder" },
  {
    id: "experience",
    label: "Work Experience",
    kind: "blocks",
    blockCategory: "experience",
  },
  {
    id: "education",
    label: "Education",
    kind: "blocks",
    blockCategory: "education",
  },
  {
    id: "certification",
    label: "Certifications",
    kind: "blocks",
    blockCategory: "certification",
  },
  { id: "awards", label: "Awards & Scholarships", kind: "blocks", blockCategory: "awards" },
  {
    id: "project",
    label: "Projects",
    kind: "blocks",
    blockCategory: "project",
  },
  {
    id: "leadership",
    label: "Volunteering & Leadership",
    kind: "blocks",
    blockCategory: "leadership",
  },
  { id: "publications", label: "Publications", kind: "blocks", blockCategory: "publications" },
];

/** Populated categories start open so existing cards stay reachable. */
export const DEFAULT_OPEN_VAULT_CATEGORIES: VaultCategoryId[] = [
  "contact",
  "experience",
  "education",
  "skills",
  "certification",
  "project",
  "leadership",
];
