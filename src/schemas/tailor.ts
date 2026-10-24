import { z } from "zod";

const text = z.string().trim().max(4000);
export const TailorRequestSchema = z.object({
  block: z.object({
    id: z.string().min(1).max(200),
    category: z.enum(["experience", "project", "education", "leadership", "certification", "awards", "publications"]),
    title: text, organization: text, location: text.optional(),
    startDate: text, endDate: text,
    bullets: z.array(text).min(1).max(50),
    sourceContext: z.string().max(40000),
    tags: z.array(text).max(100), isArchived: z.boolean(),
  }),
  bulletIndex: z.number().int().min(0),
  bulletText: text.min(1),
  jdText: z.string().max(15000).default(""),
  parsedJD: z.object({
    rawText: z.string().max(15000), roleTitle: text, companyName: text,
    requiredSkills: z.array(text).max(100), preferredSkills: z.array(text).max(100),
    keyResponsibilities: z.array(text).max(100),
  }).nullable().optional(),
}).refine((input) => input.bulletIndex < input.block.bullets.length, { path: ["bulletIndex"], message: "Bullet index is outside this block." });

export const TailorModelSchema = z.object({
  variants: z.object({
    leadership: z.string().min(1).max(4000).describe("Job-focused resume bullet aligned with the job description, using only evidenced facts"),
    technical_ic: z.string().min(1).max(4000).describe("Technical or execution-focused bullet; no invented tools or technologies"),
    concise: z.string().min(1).max(4000).describe("Natural, plain-language resume bullet; aim for under 110 characters, no first-person pronouns"),
  }),
  sourceQuote: z.string().max(4000).describe("Exact supporting substring of sourceContext, or empty if only the existing bullet provides evidence"),
  matchedKeywords: z.array(z.string().max(200)).max(50),
  unsupportedFlags: z.array(z.string().max(200)).max(50).describe("Relevant job skills excluded because the user has no evidence for them"),
});
export const TailorProposalSchema = TailorModelSchema.extend({
  blockId: z.string(), bulletIndex: z.number().int().min(0), originalText: z.string(),
  selectedTone: z.enum(["leadership", "technical_ic", "concise"]), warnings: z.array(z.string()),
});
export const TailorResponseSchema = z.object({ proposal: TailorProposalSchema, mock: z.boolean() });
export type TailorRequest = z.infer<typeof TailorRequestSchema>;
