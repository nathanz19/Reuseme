import { generateText, NoObjectGeneratedError, Output } from "ai";
import { matchVault } from "@/data/fixtures";
import { aiConfigError, getModel, isMockAi } from "@/lib/ai";
import { enforceAiRateLimit } from "@/lib/server/aiRateLimit";
import {
  MATCH_SYSTEM_PROMPT,
  buildMatchPrompt,
  buildMatchResult,
} from "@/lib/jdMatch";
import {
  JDMatchModelSchema,
  JDMatchRequestSchema,
  type JDMatchResponse,
} from "@/schemas/jdMatch";

// A live model call over a full vault can take a while.
export const maxDuration = 60;

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Request body must be valid JSON.", 400);
  }

  const parsed = JDMatchRequestSchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(
      `Invalid request: ${parsed.error.issues
        .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
        .join("; ")}`,
      400,
    );
  }
  const { jdText, blocks } = parsed.data;

  if (isMockAi()) {
    const result = matchVault(jdText, blocks);
    if ("error" in result) return errorResponse(result.error, 502);
    return Response.json(result satisfies JDMatchResponse);
  }

  const configError = aiConfigError();
  if (configError) return errorResponse(configError, 500);
  const limited = await enforceAiRateLimit(request);
  if (limited) return limited;

  try {
    const { output } = await generateText({
      model: getModel(),
      maxRetries: 0,
      system: MATCH_SYSTEM_PROMPT,
      prompt: buildMatchPrompt(jdText, blocks),
      output: Output.object({
        name: "JDMatch",
        description: "Parsed job description, requirement-to-tag mapping, and a ranking for every vault card.",
        schema: JDMatchModelSchema,
      }),
    });
    const result = buildMatchResult(output, blocks, jdText);
    return Response.json(result satisfies JDMatchResponse);
  } catch (error) {
    console.error("POST /api/jd/match failed", error);
    if (NoObjectGeneratedError.isInstance(error)) {
      return errorResponse("The model returned an unusable response. Try again.", 502);
    }
    return errorResponse("The AI request failed. Try again.", 502);
  }
}
