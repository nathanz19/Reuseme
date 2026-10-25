import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/resume/format/route";
import { analyzeReferenceFormat } from "@/lib/server/referenceFormat";
import { enforceAiRateLimit } from "@/lib/server/aiRateLimit";
import { DEMO_REFERENCE_FORMAT, MAX_REFERENCE_BYTES } from "@/schemas/referenceFormat";

vi.mock("@/lib/server/referenceFormat", () => ({ analyzeReferenceFormat: vi.fn() }));
vi.mock("@/lib/server/aiRateLimit", () => ({ enforceAiRateLimit: vi.fn(async () => null) }));
const analyze = vi.mocked(analyzeReferenceFormat);
const limit = vi.mocked(enforceAiRateLimit);
function upload(data = "%PDF-1.4\nreference", type = "application/pdf", name = "reference.pdf") {
  const form = new FormData();
  form.set("file", new File([data], name, { type }));
  return new Request("http://localhost/api/resume/format", { method: "POST", body: form });
}
beforeEach(() => {
  vi.stubEnv("MOCK_AI", "0"); vi.stubEnv("AI_MODEL", "test-model"); vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "test-key");
  analyze.mockReset(); limit.mockReset(); limit.mockResolvedValue(null);
  analyze.mockResolvedValue({ isResume: true, format: DEMO_REFERENCE_FORMAT, approximations: [] });
});
afterEach(() => vi.unstubAllEnvs());

describe("reference resume format upload", () => {
  it("rejects invalid files before using AI allowance", async () => {
    expect((await POST(upload("not a pdf"))).status).toBe(415);
    expect((await POST(upload("%PDF-1.4", "text/html", "resume.html"))).status).toBe(415);
    expect((await POST(upload(""))).status).toBe(400);
    expect((await POST(upload("%PDF-" + "a".repeat(MAX_REFERENCE_BYTES)))).status).toBe(413);
    expect(analyze).not.toHaveBeenCalled();
    expect(limit).not.toHaveBeenCalled();
  });
  it("reserves the shared allowance before sending a PDF for analysis", async () => {
    const response = await POST(upload());
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({ mock: false, format: DEMO_REFERENCE_FORMAT, approximations: [] });
    expect(limit).toHaveBeenCalledOnce();
    expect(analyze).toHaveBeenCalledWith(expect.any(Uint8Array), "application/pdf", expect.any(AbortSignal));
  });
  it("rejects malformed multipart requests", async () => {
    expect((await POST(new Request("http://localhost", { method: "POST", body: "bad" }))).status).toBe(400);
  });
  it("never calls Gemini when the limit is reached", async () => {
    limit.mockResolvedValue(Response.json({ error: "No requests left" }, { status: 429 }));
    expect((await POST(upload())).status).toBe(429);
    expect(analyze).not.toHaveBeenCalled();
  });
  it("clearly labels the demo without contacting AI or Redis", async () => {
    vi.stubEnv("MOCK_AI", "1");
    expect(await (await POST(upload())).json()).toMatchObject({ mock: true });
    expect(analyze).not.toHaveBeenCalled(); expect(limit).not.toHaveBeenCalled();
  });
  it("reports non-resumes and provider errors without leaking private details", async () => {
    analyze.mockResolvedValueOnce({ isResume: false, format: DEMO_REFERENCE_FORMAT, approximations: [] });
    expect((await POST(upload())).status).toBe(422);
    analyze.mockRejectedValueOnce(new Error("private-resume-data-and-key"));
    const response = await POST(upload());
    expect(response.status).toBe(502); expect(await response.text()).not.toContain("private");
  });
});
