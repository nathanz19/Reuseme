import { vi } from "vitest";

/**
 * The llm suite runs the real API routes and the real AI SDK Google provider,
 * but answers their HTTP calls here. No key, quota, or network is used.
 */
export const FAKE_GOOGLE_KEY = "fake-google-key-for-tests";
export const FAKE_MODEL = "gemini-3.1-flash-lite";
export const FAKE_UPSTASH_URL = "https://upstash.fake.test";
export const FAKE_UPSTASH_TOKEN = "fake-upstash-token";

export const LIVE_AI_ENV = {
  MOCK_AI: "0",
  AI_MODEL: FAKE_MODEL,
  GOOGLE_GENERATIVE_AI_API_KEY: FAKE_GOOGLE_KEY,
  UPSTASH_REDIS_REST_URL: FAKE_UPSTASH_URL,
  UPSTASH_REDIS_REST_TOKEN: FAKE_UPSTASH_TOKEN,
  // Off Vercel, the limiter uses one loopback identity outside production.
  VERCEL: "",
  VERCEL_ENV: "",
  DISABLE_AI_RATE_LIMIT_LOCAL: "",
} as const;

const GEMINI_ORIGIN = "https://generativelanguage.googleapis.com";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType: string; data: string };
}

interface GeminiRequestBody {
  contents: { role: string; parts: GeminiPart[] }[];
  systemInstruction?: { parts: GeminiPart[] };
  generationConfig?: {
    maxOutputTokens?: number;
    responseMimeType?: string;
    responseJsonSchema?: { required?: string[] };
    thinkingConfig?: { thinkingLevel?: string; thinkingBudget?: number };
  };
}

export interface GeminiCall {
  model: string;
  apiKey: string | null;
  body: GeminiRequestBody;
  system: string;
  prompt: string;
  attachments: { mimeType: string; data: string }[];
  signal: AbortSignal | null;
}

type GeminiReply = Response | ((call: GeminiCall) => Response | Promise<Response>);

function requestUrl(input: RequestInfo | URL): URL {
  return new URL(input instanceof Request ? input.url : String(input));
}

/** Any request the suite does not fake is a bug, so fail instead of reaching the network. */
export function blockNetwork() {
  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL) => {
    throw new Error(`Unexpected network request in the llm suite: ${requestUrl(input)}`);
  }));
}

/**
 * Installs fake Gemini and Upstash endpoints. Gemini answers with queued
 * replies in order; Upstash keeps a real 10-per-window counter.
 */
export function fakeAi({ used = 0 }: { used?: number } = {}) {
  const gemini: GeminiCall[] = [];
  const replies: GeminiReply[] = [];
  const limiter = { used, commands: [] as string[][] };

  vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const url = requestUrl(input);
    if (url.origin === new URL(FAKE_UPSTASH_URL).origin) {
      const command = JSON.parse(String(init.body)) as string[];
      limiter.commands.push(command);
      const limit = Number(command[4]);
      const windowSeconds = Number(command[5]);
      if (command[6] === "read") {
        return Response.json({ result: [limiter.used, limiter.used ? windowSeconds : 0] });
      }
      if (limiter.used >= limit) return Response.json({ result: [0, 3600] });
      limiter.used += 1;
      return Response.json({ result: [1, windowSeconds] });
    }
    if (url.origin === GEMINI_ORIGIN) {
      const body = JSON.parse(String(init.body)) as GeminiRequestBody;
      const parts = body.contents.flatMap((content) => content.parts);
      const call: GeminiCall = {
        model: url.pathname.match(/\/models\/([^:]+):generateContent$/)?.[1] ?? url.pathname,
        apiKey: new Headers(init.headers).get("x-goog-api-key"),
        body,
        system: body.systemInstruction?.parts.map((part) => part.text ?? "").join("\n") ?? "",
        prompt: parts.flatMap((part) => (part.text === undefined ? [] : [part.text])).join("\n"),
        attachments: parts.flatMap((part) => (part.inlineData ? [part.inlineData] : [])),
        signal: init.signal ?? null,
      };
      gemini.push(call);
      const reply = replies.shift();
      if (!reply) throw new Error(`Gemini was called without a queued reply (${url.pathname})`);
      return typeof reply === "function" ? reply(call) : reply;
    }
    throw new Error(`Unexpected network request in the llm suite: ${url}`);
  }));

  return {
    gemini,
    limiter,
    reply(...next: GeminiReply[]) {
      replies.push(...next);
    },
  };
}

/** A successful `generateContent` response whose text is the model's JSON output. */
export function geminiJson(output: unknown) {
  return geminiText(JSON.stringify(output));
}

export function geminiText(text: string, finishReason = "STOP") {
  return Response.json({
    responseId: "fake-response-id",
    modelVersion: FAKE_MODEL,
    candidates: [{ index: 0, finishReason, content: { role: "model", parts: [{ text }] } }],
    usageMetadata: { promptTokenCount: 1200, candidatesTokenCount: 240, totalTokenCount: 1440 },
  });
}

const GOOGLE_STATUS: Record<number, string> = {
  400: "INVALID_ARGUMENT",
  401: "UNAUTHENTICATED",
  403: "PERMISSION_DENIED",
  404: "NOT_FOUND",
  429: "RESOURCE_EXHAUSTED",
  500: "INTERNAL",
  503: "UNAVAILABLE",
};

/** A Google API error body, shaped like the ones the provider parses. */
export function geminiError(status: number, message: string) {
  return Response.json(
    { error: { code: status, message, status: GOOGLE_STATUS[status] ?? "UNKNOWN" } },
    { status },
  );
}

/** Never settles until the request is aborted, like a model call that hangs. */
export function geminiHang(call: GeminiCall): Promise<Response> {
  return new Promise((_, reject) => {
    const signal = call.signal;
    if (!signal) return reject(new Error("Gemini call has no abort signal"));
    if (signal.aborted) return reject(signal.reason);
    signal.addEventListener("abort", () => reject(signal.reason), { once: true });
  });
}

export function postJson(url: string, body: unknown, init: RequestInit = {}) {
  return new Request(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
    ...init,
  });
}
