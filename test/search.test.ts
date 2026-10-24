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


describe("section and date filters", () => {
  const base = { query: "", selectedTags: [], includeArchived: true };
  const block = { ...SEED_BLOCKS[0], category: "experience" as const, startDate: "May 2020", endDate: "Jun 2022", tags: ["go"] };
  it("matches overlapping dates including range boundaries", () => {
    expect(searchBlocks([block], { ...base, dateFrom: "2022-06", dateTo: "2023-01" })).toHaveLength(1);
    expect(searchBlocks([block], { ...base, dateFrom: "2022-07" })).toHaveLength(0);
    expect(searchBlocks([block], { ...base, dateTo: "2020-04" })).toHaveLength(0);
  });
  it("handles year-only, ongoing, unknown, and reversed dates", () => {
    expect(searchBlocks([{ ...block, startDate: "2020", endDate: "2021" }], { ...base, dateFrom: "2021-12" })).toHaveLength(1);
    expect(searchBlocks([{ ...block, endDate: "Present" }], { ...base, dateFrom: "2026-01" })).toHaveLength(1);
    expect(searchBlocks([{ ...block, startDate: "", endDate: "" }], { ...base, dateFrom: "2020-01" })).toHaveLength(0);
    expect(searchBlocks([block], { ...base, dateFrom: "2023-01", dateTo: "2020-01" })).toHaveLength(0);
  });
  it("combines sections with tags and date filters", () => {
    const filters = { ...base, selectedSections: ["experience"], selectedTags: ["go"], dateFrom: "2021-01" };
    expect(searchBlocks([block], filters)).toHaveLength(1);
    expect(searchBlocks([block], { ...filters, selectedSections: ["project"] })).toHaveLength(0);
    expect(searchBlocks([block], { ...filters, selectedTags: ["python"] })).toHaveLength(0);
  });
});
