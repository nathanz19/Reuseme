import { google } from "@ai-sdk/google";

/**
 * The single AI provider adapter. Server only: it reads secrets from the
 * environment, so never import it from a client component.
 */

/** A clear message when live AI is not configured, otherwise null. */
export function aiConfigError(): string | null {
  if (!process.env.AI_MODEL) {
    return "AI is not configured: set AI_MODEL (or set MOCK_AI=1 for fixtures).";
  }
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return "AI is not configured: set GOOGLE_GENERATIVE_AI_API_KEY (or set MOCK_AI=1 for fixtures).";
  }
  return null;
}

/** Call `aiConfigError()` first; this throws if `AI_MODEL` is missing. */
export function getModel() {
  const modelId = process.env.AI_MODEL;
  if (!modelId) throw new Error("AI_MODEL is not set.");
  return google(modelId);
}

export function isMockAi(): boolean {
  return process.env.MOCK_AI === "1";
}
