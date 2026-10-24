import { afterEach, expect, it, vi } from "vitest";
import { generateText } from "ai";
import { POST } from "@/app/api/jd/match/route";
import { enforceAiRateLimit } from "@/lib/server/aiRateLimit";

vi.mock("@/lib/server/aiRateLimit", () => ({ enforceAiRateLimit: vi.fn() }));
vi.mock("@/lib/ai", () => ({ aiConfigError: () => null, isMockAi: () => false, getModel: vi.fn() }));
vi.mock("ai", async (original) => ({ ...await original<typeof import("ai")>(), generateText: vi.fn() }));
afterEach(() => vi.clearAllMocks());

it("blocks job matching before calling Gemini when the shared allowance is exhausted", async () => {
  vi.mocked(enforceAiRateLimit).mockResolvedValue(Response.json({ error: "Daily limit reached" }, { status: 429 }));
  const response = await POST(new Request("https://reuseme.test/api/jd/match", {
    method: "POST", body: JSON.stringify({ jdText: "A software engineer role", blocks: [] }),
  }));
  expect(response.status).toBe(429);
  expect(generateText).not.toHaveBeenCalled();
});

it("does not consume allowance for invalid job-matching input", async () => {
  const response = await POST(new Request("https://reuseme.test/api/jd/match", {
    method: "POST", body: JSON.stringify({ jdText: "", blocks: [] }),
  }));
  expect(response.status).toBe(400);
  expect(enforceAiRateLimit).not.toHaveBeenCalled();
  expect(generateText).not.toHaveBeenCalled();
});
