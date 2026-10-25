"use client";

import { useEffect, useState } from "react";
import { AI_USAGE_CHANGED } from "@/lib/aiUsage";
import { MeterBadge } from "@/components/MeterBadge";

type Usage = { mock: boolean; unlimited?: boolean; limit: number; remaining: number; resetAt: number | null };

export function AiUsageMeter() {
  const [usage, setUsage] = useState<Usage | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let controller: AbortController | null = null;
    let active = true;
    const refresh = async () => {
      if (document.visibilityState === "hidden") return;
      controller?.abort();
      const request = new AbortController();
      controller = request;
      try {
        const response = await fetch("/api/ai/usage", { cache: "no-store", signal: request.signal });
        if (!response.ok) throw new Error("Unavailable");
        const value: Usage = await response.json();
        if (typeof value.mock !== "boolean" || !Number.isInteger(value.limit) || value.limit < 1 ||
          !Number.isInteger(value.remaining) || value.remaining < 0 || value.remaining > value.limit ||
          !(value.resetAt === null || (typeof value.resetAt === "number" && Number.isFinite(value.resetAt)))) throw new Error("Invalid usage");
        if (active && !request.signal.aborted) { setUsage(value); setUnavailable(false); }
      } catch {
        if (active && !request.signal.aborted) { setUsage(null); setUnavailable(true); }
      }
    };
    void refresh();
    const update = () => { void refresh(); };
    window.addEventListener(AI_USAGE_CHANGED, update);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    const interval = setInterval(update, 60000);
    return () => {
      active = false;
      controller?.abort();
      clearInterval(interval);
      window.removeEventListener(AI_USAGE_CHANGED, update);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);

  const exhausted = usage && !usage.mock && usage.remaining === 0;
  const label = unavailable ? "AI usage unavailable" : !usage ? "AI loading…" : usage.mock ? "AI demo" : usage.unlimited ? "AI local testing" : `AI ${usage.remaining}/${usage.limit} left`;
  const reset = usage?.resetAt ? ` Resets at ${new Date(usage.resetAt).toLocaleString()}.` : "";
  const help = unavailable ? "Could not load your AI allowance. It will retry automatically."
    : usage?.mock ? "Demo mode uses sample responses and does not consume AI requests."
    : usage?.unlimited ? "The app's request limit is disabled for local testing. Live requests still use your Google quota."
    : `AI shows your remaining free requests. You get 10 attempts every 24 hours, shared between tailoring, job matching, and copying a resume format. People on the same network share this allowance.${reset}`;
  return <MeterBadge status label="AI request allowance" help={help}
    className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-md border px-2.5 text-xs leading-none font-medium ${exhausted ? "border-red-200 bg-red-50 text-red-700" : unavailable ? "border-amber-200 bg-amber-50 text-amber-800" : "border-accent-border bg-accent-subtle text-accent-text"}`}>
    {label}
  </MeterBadge>;
}
