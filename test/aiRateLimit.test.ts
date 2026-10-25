import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { enforceAiRateLimit, getAiUsage } from "@/lib/server/aiRateLimit";

const fetchMock = vi.fn<typeof fetch>();
const request = (ip = "203.0.113.8") => new Request("https://reuseme.test/api", {
  headers: { "x-vercel-forwarded-for": ip, "x-forwarded-for": "198.51.100.99" },
});
beforeEach(() => {
  vi.stubEnv("MOCK_AI", "0");
  vi.stubEnv("VERCEL", "1");
  vi.stubEnv("VERCEL_ENV", "production");
  vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example.test");
  vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-secret-token");
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
});
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("shared AI rate limit", () => {
  it("can bypass Redis only during explicitly enabled local development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "");
    vi.stubEnv("DISABLE_AI_RATE_LIMIT_LOCAL", "1");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(await enforceAiRateLimit(request())).toBeNull();
    expect(await (await getAiUsage(request())).json()).toMatchObject({ mock: false, unlimited: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("never bypasses protection in production or on Vercel", async () => {
    vi.stubEnv("DISABLE_AI_RATE_LIMIT_LOCAL", "1");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL", "");
    expect((await enforceAiRateLimit(request()))?.status).toBe(503);
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL", "1");
    expect((await enforceAiRateLimit(request()))?.status).toBe(503);
  });
  it("reads remaining requests and reset time without reserving an attempt", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ result: [4, 3600] }));
    const before = Date.now();
    const response = await getAiUsage(request());
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(data).toMatchObject({ mock: false, limit: 10, remaining: 6 });
    expect(data.resetAt).toBeGreaterThanOrEqual(before + 3600000);
    const command = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(command.at(-1)).toBe("read");
  });
  it("shows a full allowance without a window and zero when exhausted", async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ result: [0, 0] }));
    expect(await (await getAiUsage(request())).json()).toMatchObject({ remaining: 10, resetAt: null });
    fetchMock.mockResolvedValueOnce(Response.json({ result: [10, 120] }));
    expect(await (await getAiUsage(request())).json()).toMatchObject({ remaining: 0 });
    fetchMock.mockResolvedValueOnce(Response.json({ result: ["bad", 120] }));
    expect((await getAiUsage(request())).status).toBe(503);
  });
  it("reports demo mode without contacting Redis", async () => {
    vi.stubEnv("MOCK_AI", "1");
    expect(await (await getAiUsage(request())).json()).toMatchObject({ mock: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("allows ten reservations and returns a retry time for the eleventh", async () => {
    for (let index = 0; index < 10; index++) {
      fetchMock.mockResolvedValueOnce(Response.json({ result: [1, 86400 - index] }));
      expect(await enforceAiRateLimit(request())).toBeNull();
    }
    fetchMock.mockResolvedValueOnce(Response.json({ result: [0, 3600] }));
    const blocked = (await enforceAiRateLimit(request()))!;
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("Retry-After")).toBe("3600");
    expect((await blocked.json()).error).toContain("10 free AI requests");
    expect(blocked.headers.get("Cache-Control")).toBe("no-store");
  });
  it("uses one private counter across API routes and isolates IPs and environments", async () => {
    fetchMock.mockImplementation(async () => Response.json({ result: [1, 86400] }));
    await enforceAiRateLimit(request());
    await enforceAiRateLimit(new Request("https://reuseme.test/api/jd/match", { headers: request().headers }));
    await enforceAiRateLimit(request("203.0.113.9"));
    vi.stubEnv("VERCEL_ENV", "preview");
    await enforceAiRateLimit(request());
    const commands = fetchMock.mock.calls.map(([, options]) => JSON.parse(String(options?.body)));
    expect(commands[0][3]).toBe(commands[1][3]);
    expect(commands[0][3]).not.toBe(commands[2][3]);
    expect(commands[0][3]).not.toBe(commands[3][3]);
    expect(commands[0]).toEqual(["EVAL", expect.any(String), "1", expect.stringMatching(/^reuseme:ai:production:[a-f0-9]{64}$/), "10", "86400", "consume"]);
    expect(JSON.stringify(commands)).not.toContain("203.0.113.8");
  });
  it("blocks live calls when storage is missing, fails, or returns invalid data", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect((await enforceAiRateLimit(request()))?.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "test-secret-token");
    fetchMock.mockRejectedValueOnce(new Error("secret provider details"));
    const failed = (await enforceAiRateLimit(request()))!;
    expect(failed.status).toBe(503);
    expect(await failed.text()).not.toContain("secret");
    fetchMock.mockResolvedValueOnce(Response.json({ result: [1, -1] }));
    expect((await enforceAiRateLimit(request()))?.status).toBe(503);
    fetchMock.mockResolvedValueOnce(new Response("unavailable", { status: 503 }));
    expect((await enforceAiRateLimit(request()))?.status).toBe(503);
  });
  it("does not trust a caller's alternative IP header when the platform IP is missing", async () => {
    expect((await enforceAiRateLimit(new Request("https://reuseme.test", {
      headers: { "x-forwarded-for": "203.0.113.8" },
    })))?.status).toBe(503);
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("leaves mock AI available without storage or quota consumption", async () => {
    vi.stubEnv("MOCK_AI", "1");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(await enforceAiRateLimit(request())).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
