import { describe, expect, it } from "vitest";
import { checkGrounding } from "@/lib/grounding";
import { CONCISE_MAX_CHARS } from "@/lib/tunables";
import type { AccomplishmentBlock } from "@/types/resume";

const block: AccomplishmentBlock = {
  id: "b1",
  category: "experience",
  title: "Backend Engineer",
  organization: "Co",
  startDate: "2020",
  endDate: "2021",
  bullets: ["Built Go services processing ledger events."],
  sourceContext: "Payments team.  Go 1.20,\nKafka, PostgreSQL 14.",
  tags: ["go", "kafka"],
  isArchived: false,
};

const variants = {
  technical_ic: "Built Go services on Kafka.",
  leadership: "Led the payments services team.",
  concise: "Built Go payment services.",
};

describe("checkGrounding", () => {
  it("returns no warnings for a quote and keywords from the notes", () => {
    const warnings = checkGrounding(
      block,
      {
        sourceQuote: "Go 1.20, Kafka, PostgreSQL 14.",
        variants,
        matchedKeywords: ["Go", "Postgres"],
      },
      block.bullets,
    );
    expect(warnings).toEqual([]);
  });

  it("flags a quote that is not in the source notes", () => {
    const warnings = checkGrounding(
      block,
      { sourceQuote: "Rust and WebAssembly", variants, matchedKeywords: [] },
      block.bullets,
    );
    expect(warnings).toContain("quote_not_found");
  });

  it("flags a concise variant over the length limit", () => {
    const warnings = checkGrounding(
      block,
      {
        sourceQuote: "",
        variants: { ...variants, concise: "x".repeat(CONCISE_MAX_CHARS + 1) },
        matchedKeywords: [],
      },
      block.bullets,
    );
    expect(warnings).toEqual(["concise_too_long"]);
  });

  it("flags matched keywords with no evidence", () => {
    const warnings = checkGrounding(
      block,
      { sourceQuote: "", variants, matchedKeywords: ["Kubernetes"] },
      block.bullets,
    );
    expect(warnings).toEqual(["keyword_unsupported:Kubernetes"]);
  });
});
