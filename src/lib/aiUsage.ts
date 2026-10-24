export const AI_USAGE_CHANGED = "reuseme:ai-usage-changed";

export function notifyAiUsageChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(AI_USAGE_CHANGED));
}
