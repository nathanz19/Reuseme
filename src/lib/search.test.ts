import { describe, expect, it } from "vitest";
import { searchBlocks } from "@/lib/search";
import { SEED_BLOCKS } from "@/data/seed";

describe("searchBlocks", () => {
  it("requires every query token", () => {
    const result = searchBlocks(SEED_BLOCKS, {
      query: "react redis",
      selectedTags: [],
      includeArchived: false,
    });
    expect(result.some((b) => b.id === "exp-1")).toBe(true);
    expect(result.every((b) => !b.isArchived)).toBe(true);
  });

  it("ANDs tag filters", () => {
    const result = searchBlocks(SEED_BLOCKS, {
      query: "",
      selectedTags: ["go", "postgresql"],
      includeArchived: false,
    });
    expect(result.length).toBeGreaterThan(0);
    for (const b of result) {
      expect(b.tags).toEqual(
        expect.arrayContaining(["go", "postgresql"].map((t) => t)),
      );
    }
  });

  it("excludes archived unless toggled", () => {
    const hidden = searchBlocks(SEED_BLOCKS, {
      query: "raft",
      selectedTags: [],
      includeArchived: false,
    });
    expect(hidden.some((b) => b.id === "exp-6")).toBe(false);

    const shown = searchBlocks(SEED_BLOCKS, {
      query: "raft",
      selectedTags: [],
      includeArchived: true,
    });
    expect(shown.some((b) => b.id === "exp-6")).toBe(true);
  });
});
