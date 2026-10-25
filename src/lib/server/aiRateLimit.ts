import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const AI_REQUEST_LIMIT = 10;
const WINDOW_SECONDS = 24 * 60 * 60;
// Check and increment atomically, so concurrent requests cannot exceed the cap.
const SCRIPT = `
local count = tonumber(redis.call('GET', KEYS[1]) or '0')
local ttl = redis.call('TTL', KEYS[1])
if ARGV[3] == 'read' then return {count, math.max(0, ttl)} end
if count >= tonumber(ARGV[1]) then return {0, ttl} end
count = redis.call('INCR', KEYS[1])
if count == 1 or ttl < 0 then
  redis.call('EXPIRE', KEYS[1], ARGV[2])
  ttl = tonumber(ARGV[2])
end
return {1, ttl}
`;

/** Returns a blocking response, or null when one live AI attempt is reserved. */
export async function enforceAiRateLimit(request: Request): Promise<Response | null> {
  return rateLimit(request, true);
}

/** Reads the same counter without consuming an AI request or starting a window. */
export async function getAiUsage(request: Request): Promise<Response> {
  return (await rateLimit(request, false))!;
}

async function rateLimit(request: Request, consume: boolean): Promise<Response | null> {
  const localBypass = process.env.NODE_ENV === "development" && process.env.VERCEL !== "1" &&
    process.env.DISABLE_AI_RATE_LIMIT_LOCAL === "1";
  if (localBypass) return consume ? null : Response.json(
    { mock: process.env.MOCK_AI === "1", unlimited: true, limit: AI_REQUEST_LIMIT, remaining: AI_REQUEST_LIMIT, resetAt: null },
    { headers: { "Cache-Control": "no-store" } },
  );
  if (process.env.MOCK_AI === "1") return consume ? null : Response.json(
    { mock: true, limit: AI_REQUEST_LIMIT, remaining: AI_REQUEST_LIMIT, resetAt: null },
    { headers: { "Cache-Control": "no-store" } },
  );
  const unavailable = () => Response.json(
    { error: "AI is temporarily unavailable while its usage protection is being configured. Please try again later." },
    { status: 503, headers: { "Cache-Control": "no-store", "Retry-After": "60" } },
  );
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return unavailable();

  // Only trust platform-provided IPs on Vercel. Other hosts need their own
  // trusted proxy integration; never accept arbitrary client identity in JSON.
  const ip = process.env.VERCEL === "1"
    ? request.headers.get("x-vercel-forwarded-for")?.split(",")[0].trim()
    : process.env.NODE_ENV !== "production" ? "127.0.0.1" : undefined;
  if (!ip || !isIP(ip)) return unavailable();
  const identity = createHmac("sha256", token).update(ip).digest("hex");
  const environment = process.env.VERCEL_ENV || "development";
  const key = `reuseme:ai:${environment}:${identity}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(["EVAL", SCRIPT, "1", key, String(AI_REQUEST_LIMIT), String(WINDOW_SECONDS), consume ? "consume" : "read"]),
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) return unavailable();
    const data: unknown = await response.json();
    const result = (data as { result?: unknown } | null)?.result;
    if (!consume) {
      if (!Array.isArray(result) || result.length !== 2 || !Number.isInteger(result[0]) || result[0] < 0 ||
        !Number.isInteger(result[1]) || result[1] < 0) return unavailable();
      return Response.json({
        mock: false,
        limit: AI_REQUEST_LIMIT,
        remaining: Math.max(0, AI_REQUEST_LIMIT - result[0]),
        resetAt: result[1] > 0 ? Date.now() + result[1] * 1000 : null,
      }, { headers: { "Cache-Control": "no-store" } });
    }
    if (!Array.isArray(result) || result.length !== 2 || ![0, 1].includes(result[0]) ||
      !Number.isInteger(result[1]) || result[1] < 1) return unavailable();
    if (result[0] === 1) return null;
    const retryAfter = Math.min(result[1], WINDOW_SECONDS);
    const hours = Math.max(1, Math.ceil(retryAfter / 3600));
    return Response.json({
      error: `You've used your 10 free AI requests for this 24-hour period. Try again in about ${hours} ${hours === 1 ? "hour" : "hours"}.`,
    }, {
      status: 429,
      headers: { "Cache-Control": "no-store", "Retry-After": String(retryAfter), "X-RateLimit-Limit": String(AI_REQUEST_LIMIT), "X-RateLimit-Remaining": "0" },
    });
  } catch {
    // Fail closed: an unavailable counter must never allow unmetered AI calls.
    return unavailable();
  }
}
