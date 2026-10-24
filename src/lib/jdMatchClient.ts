import {
  JDMatchErrorSchema,
  JDMatchResponseSchema,
  type JDMatchResponse,
} from "@/schemas/jdMatch";
import type { AccomplishmentBlock } from "@/types/resume";

export type JDMatchOutcome = JDMatchResponse | { error: string };

/** Calls POST /api/jd/match and validates the response. Never throws. */
export async function requestJdMatch(
  jdText: string,
  blocks: readonly AccomplishmentBlock[],
): Promise<JDMatchOutcome> {
  let response: Response;
  try {
    response = await fetch("/api/jd/match", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jdText,
        blocks: blocks.map((block) => ({
          id: block.id,
          title: block.title,
          organization: block.organization,
          tags: block.tags,
          bullets: block.bullets,
          sourceContext: block.sourceContext,
        })),
      }),
    });
  } catch {
    return { error: "Could not reach the match service. Check your connection." };
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    return { error: `Match request failed (${response.status}).` };
  }

  if (!response.ok) {
    const failure = JDMatchErrorSchema.safeParse(payload);
    return {
      error: failure.success
        ? failure.data.error
        : `Match request failed (${response.status}).`,
    };
  }

  const result = JDMatchResponseSchema.safeParse(payload);
  if (!result.success) return { error: "The match service returned an unexpected response." };
  return result.data;
}
