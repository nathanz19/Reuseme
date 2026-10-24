import { z } from "zod";

export const JD_TEXT_MAX_CHARS = 15_000;

/**
 * Model output. `tagMatches` comes before `rankings` so the model works out
 * the requirement-to-tag mapping before it scores cards.
 */
export const JDMatchModelSchema = z.object({
  parsedJD: z.object({
    roleTitle: z.string(),
    companyName: z.string(),
    requiredSkills: z.array(z.string()),
    preferredSkills: z.array(z.string()),
    keyResponsibilities: z.array(z.string()),
  }),
  tagMatches: z.array(
    z.object({
      requirement: z.string(),
      tags: z
        .array(z.string())
        .describe("Only tags from the provided vault tag list"),
    }),
  ),
  rankings: z.array(
    z.object({
      blockId: z.string(),
      relevant: z
        .boolean()
        .describe("True if the card's content shows at least one job requirement"),
      semanticScore: z.number().min(0).max(100),
      matchedTags: z
        .array(z.string())
        .describe("Only tags from this card's own tag list"),
      bestBulletIndex: z
        .number()
        .int()
        .describe("0-based index of the bullet that best evidences the job"),
      matchExplanation: z
        .string()
        .describe("1 concise sentence on why this card supports the job"),
    }),
  ),
});

export type JDMatchModelOutput = z.infer<typeof JDMatchModelSchema>;

export const JDMatchRequestSchema = z.object({
  jdText: z.string().min(1).max(JD_TEXT_MAX_CHARS),
  blocks: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      organization: z.string(),
      tags: z.array(z.string()),
      bullets: z.array(z.string()),
      sourceContext: z.string(),
    }),
  ),
});

export type JDMatchRequest = z.infer<typeof JDMatchRequestSchema>;

/** What the route returns on success (and what the client validates). */
export const JDMatchResponseSchema = z.object({
  parsedJD: z.object({
    rawText: z.string(),
    roleTitle: z.string(),
    companyName: z.string(),
    requiredSkills: z.array(z.string()),
    preferredSkills: z.array(z.string()),
    keyResponsibilities: z.array(z.string()),
  }),
  tagMatches: z.array(
    z.object({ requirement: z.string(), tags: z.array(z.string()) }),
  ),
  rankings: z.array(
    z.object({
      blockId: z.string(),
      relevant: z.boolean(),
      semanticScore: z.number(),
      matchedTags: z.array(z.string()),
      bestBulletIndex: z.number(),
      matchExplanation: z.string(),
      keywordOverlap: z.number(),
      matchScore: z.number(),
    }),
  ),
});

export type JDMatchResponse = z.infer<typeof JDMatchResponseSchema>;

export const JDMatchErrorSchema = z.object({ error: z.string() });
