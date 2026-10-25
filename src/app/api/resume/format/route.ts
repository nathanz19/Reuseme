import { APICallError, NoObjectGeneratedError } from "ai";
import { aiConfigError, isMockAi } from "@/lib/ai";
import { enforceAiRateLimit } from "@/lib/server/aiRateLimit";
import { analyzeReferenceFormat } from "@/lib/server/referenceFormat";
import { DEMO_REFERENCE_FORMAT, MAX_REFERENCE_BYTES } from "@/schemas/referenceFormat";

export const maxDuration = 60;
const headers = { "Cache-Control": "no-store" };
const fail = (error: string, status: number) => Response.json({ error }, { status, headers });

export async function POST(request: Request) {
  let file: File;
  let data: Uint8Array;
  let mediaType: string;
  try {
    // Bound the entire multipart body even when Content-Length is absent/spoofed.
    const reader = request.body?.getReader();
    if (!reader) return fail("Choose a PDF, PNG, or JPG reference resume.", 400);
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_REFERENCE_BYTES + 65536) {
        await reader.cancel();
        return fail("Choose a file smaller than 4 MB.", 413);
      }
      chunks.push(chunk.value);
    }
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("Content-Type") ?? "" } }).formData();
    const entry = form.get("file");
    if (!(entry instanceof File) || entry.size === 0) return fail("Choose a reference resume first.", 400);
    file = entry;
    if (file.size > MAX_REFERENCE_BYTES) return fail("Choose a file smaller than 4 MB.", 413);
    data = new Uint8Array(await file.arrayBuffer());
    const hex = Buffer.from(data.subarray(0, 8)).toString("hex");
    mediaType = hex.startsWith("255044462d") ? "application/pdf" : hex === "89504e470d0a1a0a" ? "image/png" : hex.startsWith("ffd8ff") ? "image/jpeg" : "";
    if (!mediaType || file.type !== mediaType) return fail("Upload a PDF, PNG, or JPG file. Other formats are not supported.", 415);
  } catch { return fail("The upload could not be read. Choose a PDF, PNG, or JPG file.", 400); }

  if (isMockAi()) return Response.json({ mock: true, format: DEMO_REFERENCE_FORMAT, approximations: [] }, { headers });
  if (aiConfigError()) return fail("AI formatting is not configured yet. Please try again later.", 503);
  const limited = await enforceAiRateLimit(request);
  if (limited) return limited;
  try {
    const result = await analyzeReferenceFormat(data, mediaType, AbortSignal.any([request.signal, AbortSignal.timeout(45000)]));
    if (!result.isResume) return fail("This does not look like a resume. Try a clearer resume PDF or image.", 422);
    return Response.json({ mock: false, format: result.format, approximations: result.approximations }, { headers });
  } catch (error) {
    if (APICallError.isInstance(error) && error.statusCode === 429) return fail("The AI provider is busy or its quota was reached. Try again later.", 429);
    if (NoObjectGeneratedError.isInstance(error)) return fail("The format could not be recognized. Try a clearer PDF or image.", 422);
    if (error instanceof Error && ["AbortError", "TimeoutError"].includes(error.name)) return fail("Analyzing the format timed out. Try a smaller file.", 504);
    return fail("Unable to analyze this format right now. Please try again.", 502);
  }
}
