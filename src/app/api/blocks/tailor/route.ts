import { APICallError, NoObjectGeneratedError } from "ai";
import { TailorModelSchema, TailorRequestSchema } from "@/schemas/tailor";
import { generateTailoring, AIConfigurationError } from "@/lib/server/tailor";
import { createTailorPreview } from "@/lib/tailorPreview";
import { checkGrounding } from "@/lib/grounding";
import { enforceAiRateLimit } from "@/lib/server/aiRateLimit";

export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers });

export async function POST(request: Request) {
  let body: unknown;
  try {
    const raw = await request.text();
    if (raw.length > 250000) return fail("This tailoring request is too large.", 413);
    body = JSON.parse(raw);
  } catch { return fail("Send a valid JSON tailoring request.", 400); }
  const parsed = TailorRequestSchema.safeParse(body);
  if (!parsed.success) return fail("Check the selected bullet and job description (maximum 15,000 characters).", 400);
  const input = parsed.data;
  const mock = process.env.MOCK_AI === "1";
  const limited = await enforceAiRateLimit(request);
  if (limited) return limited;
  try {
    const result = mock
      ? TailorModelSchema.parse(createTailorPreview(input.block.id, input.bulletIndex, input.bulletText, input.jdText.trim() && input.jdText === input.parsedJD?.rawText ? input.parsedJD.roleTitle : undefined))
      : await generateTailoring(input, AbortSignal.any([request.signal, AbortSignal.timeout(45000)]));
    const effectiveBullets = [...input.block.bullets];
    effectiveBullets[input.bulletIndex] = input.bulletText;
    const warnings = checkGrounding(input.block, result, effectiveBullets);
    if (!result.sourceQuote.trim()) warnings.push("source_quote_missing");
    return Response.json({ mock, proposal: {
      ...result, blockId: input.block.id, bulletIndex: input.bulletIndex,
      originalText: input.bulletText, selectedTone: "leadership", warnings,
    } }, { headers });
  } catch (error) {
    // Log only diagnostic categories, never prompts, response bodies, or credentials.
    console.error("Tailoring request failed", {
      name: error instanceof Error ? error.name : "UnknownError",
      cause: error instanceof Error && error.cause instanceof Error ? error.cause.name : undefined,
      status: APICallError.isInstance(error) ? error.statusCode : undefined,
    });
    if (error instanceof AIConfigurationError) return fail(error.message, 503);
    if (APICallError.isInstance(error)) {
      if (error.statusCode === 429) return fail("Gemini's quota or rate limit was reached. Check your Google AI Studio quota or try again later.", 429);
      if (error.statusCode === 401 || error.statusCode === 403) return fail("Gemini rejected the API key or access. Check your server's Google AI Studio key and model permissions.", 502);
      if (error.statusCode === 404) return fail("The configured AI_MODEL is unavailable. Choose an available Gemini text model in .env.local and restart the server.", 502);
    }
    if (NoObjectGeneratedError.isInstance(error)) return fail("Gemini did not return valid rewrite options. Please retry.", 502);
    if (error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name)) return fail("The rewrite request timed out or was cancelled. Please retry.", 504);
    // Never send provider error bodies, user notes or API keys to the browser/logs.
    return fail("Unable to generate rewrites right now. Please retry.", 502);
  }
}
