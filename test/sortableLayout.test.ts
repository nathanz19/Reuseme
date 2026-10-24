import { describe, expect, it } from "vitest";
import { sortableIndexChanged } from "@/lib/sortableLayout";

describe("sortableIndexChanged", () => {
  const items = ["a", "b", "c"];

  it("detects when an item moved up in the list", () => {
    const previous = ["a", "b", "placeholder", "c"];
    const next = ["a", "placeholder", "b", "c"];
    expect(sortableIndexChanged(previous, next, "b")).toBe(true);
  });

  it("detects when an item moved down in the list", () => {
    const previous = ["a", "placeholder", "b", "c"];
    const next = ["a", "b", "placeholder", "c"];
    expect(sortableIndexChanged(previous, next, "b")).toBe(true);
  });

  it("is false when order is unchanged", () => {
    expect(sortableIndexChanged(items, items, "b")).toBe(false);
  });
});
