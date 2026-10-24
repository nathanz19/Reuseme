import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { APICallError } from "ai";
import { SEED_BLOCKS } from "@/data/seed";
import { POST } from "@/app/api/blocks/tailor/route";
import { AIConfigurationError, generateTailoring } from "@/lib/server/tailor";

vi.mock("@/lib/server/tailor", async (original) => {
  const actual = await original<typeof import("@/lib/server/tailor")>();
  return { ...actual, generateTailoring: vi.fn() };
});
const generate = vi.mocked(generateTailoring);
const input = () => ({ block: SEED_BLOCKS[0], bulletIndex: 0, bulletText: "Used Go for reliable services.", jdText: "Go and Kubernetes required" });
const request = (body: unknown) => new Request("http://localhost/api/blocks/tailor", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.stubEnv("MOCK_AI", "1"); generate.mockReset(); });
afterEach(() => vi.unstubAllEnvs());

describe("tailor route", () => {
  it("validates JSON, bullet indexes, and JD length before calling AI", async () => {
    expect((await POST(new Request("http://localhost", { method: "POST", body: "bad json" }))).status).toBe(400);
    expect((await POST(request({ ...input(), bulletIndex: -1 }))).status).toBe(400);
    expect((await POST(request({ ...input(), bulletIndex: 100 }))).status).toBe(400);
    expect((await POST(request({ ...input(), jdText: "x".repeat(15001) }))).status).toBe(400);
    expect(generate).not.toHaveBeenCalled();
  });
  it("returns deterministic mock rewrites of the effective bullet without needing a key", async () => {
    vi.stubEnv("GOOGLE_GENERATIVE_AI_API_KEY", "");
    const response = await POST(request(input()));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.mock).toBe(true);
    expect(data.proposal.originalText).toBe(input().bulletText);
    expect(data.proposal.variants.technical_ic).toContain("Go");
    expect(generate).not.toHaveBeenCalled();
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
  it("adds nonblocking evidence warnings and checks keywords against the effective bullet", async () => {
    vi.stubEnv("MOCK_AI", "0");
    generate.mockResolvedValue({ variants: { leadership: "Built services.", technical_ic: "Used Go.", concise: "Reliable services." }, sourceQuote: "An invented quote", matchedKeywords: ["Go"], unsupportedFlags: ["Kubernetes"] });
    const response = await POST(request(input()));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.mock).toBe(false);
    expect(data.proposal.warnings).toContain("quote_not_found");
    expect(data.proposal.warnings).not.toContain("keyword_unsupported:Go");
    expect(data.proposal.unsupportedFlags).toContain("Kubernetes");
    expect(generate).toHaveBeenCalledOnce();
  });
  it("returns actionable configuration and quota errors", async () => {
    vi.stubEnv("MOCK_AI", "0");
    generate.mockRejectedValueOnce(new AIConfigurationError("Configure AI_MODEL."));
    expect((await POST(request(input()))).status).toBe(503);
    generate.mockRejectedValueOnce(new APICallError({ message: "quota", url: "https://example.com", requestBodyValues: {}, statusCode: 429 }));
    const response = await POST(request(input()));
    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain("quota");
  });
  it("does not expose internal error messages or secrets", async () => {
    vi.stubEnv("MOCK_AI", "0");
    generate.mockRejectedValue(new Error("secret-key-and-provider-body"));
    const response = await POST(request(input()));
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain("secret-key");
  });
  it("handles timeouts and rejects excessive payloads", async () => {
    vi.stubEnv("MOCK_AI", "0");
    generate.mockRejectedValue(new DOMException("timeout", "TimeoutError"));
    expect((await POST(request(input()))).status).toBe(504);
    expect((await POST(request({ padding: "x".repeat(250001) }))).status).toBe(413);
  });
});
