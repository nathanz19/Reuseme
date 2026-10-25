import { describe, expect, it } from "vitest";
import { diffWords, type DiffPart } from "@/lib/textDiff";

const original = (parts: DiffPart[]) =>
  parts.filter((p) => !p.added).map((p) => p.text).join("");
const revised = (parts: DiffPart[]) =>
  parts.filter((p) => !p.removed).map((p) => p.text).join("");

describe("diffWords", () => {
  it("returns a single unchanged run for identical text", () => {
    const parts = diffWords("Built React dashboards", "Built React dashboards");
    expect(parts.every((p) => !p.added && !p.removed)).toBe(true);
    expect(revised(parts)).toBe("Built React dashboards");
  });

  it("marks a swapped word as removed and added", () => {
    const parts = diffWords("Built React dashboards", "Built Vue dashboards");
    expect(parts).toContainEqual({ text: "React", removed: true });
    expect(parts).toContainEqual({ text: "Vue", added: true });
  });

  it.each([
    ["Reduced latency 32%", "Reduced API p95 latency 32% with Redis"],
    ["Led a team of five engineers", "Led five engineers"],
    ["alpha beta gamma", "delta epsilon"],
    ["", "Brand new bullet"],
  ])("reconstructs both sides from %j -> %j", (a, b) => {
    const parts = diffWords(a, b);
    expect(original(parts)).toBe(a);
    expect(revised(parts)).toBe(b);
  });
});
