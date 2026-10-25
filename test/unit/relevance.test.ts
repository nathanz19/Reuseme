import { describe, expect, it } from "vitest";
import {
  matchTier,
  requirementsForTag,
  sanitizeMatch,
  selectRankedCards,
  type MatchModelOutput,
} from "@/lib/relevance";
import { RELEVANT_TOP_N, STRONG_THRESHOLD } from "@/lib/tunables";
import type { AccomplishmentBlock, SemanticRanking } from "@/types/resume";

function block(
  id: string,
  overrides: Partial<AccomplishmentBlock> = {},
): AccomplishmentBlock {
  return {
    id,
    category: "experience",
    title: `Title ${id}`,
    organization: "Org",
    startDate: "Jan 2020",
    endDate: "Present",
    bullets: ["one", "two", "three"],
    sourceContext: "",
    tags: ["go", "React"],
    isArchived: false,
    ...overrides,
  };
}

function ranking(
  blockId: string,
  matchScore: number,
  relevant: boolean,
): SemanticRanking {
  return {
    blockId,
    relevant,
    semanticScore: matchScore,
    matchedTags: [],
    bestBulletIndex: 0,
    matchExplanation: "",
    keywordOverlap: 0,
    matchScore,
  };
}

const parsedJD = {
  roleTitle: "Role",
  companyName: "Co",
  requiredSkills: [],
  preferredSkills: [],
  keyResponsibilities: [],
};

describe("sanitizeMatch", () => {
  const blocks = [block("a"), block("b", { tags: ["python"], bullets: ["x"] })];

  it("drops rankings for unknown block ids", () => {
    const output: MatchModelOutput = {
      parsedJD,
      tagMatches: [],
      rankings: [
        {
          blockId: "ghost",
          relevant: true,
          semanticScore: 90,
          matchedTags: [],
          bestBulletIndex: 0,
          matchExplanation: "x",
        },
      ],
    };
    const result = sanitizeMatch(output, blocks);
    expect(result.rankings.map((r) => r.blockId)).toEqual(["a", "b"]);
  });

  it("fills missing blocks with a zero ranking", () => {
    const result = sanitizeMatch(
      { parsedJD, tagMatches: [], rankings: [] },
      blocks,
    );
    expect(result.rankings).toEqual([
      {
        blockId: "a",
        relevant: false,
        semanticScore: 0,
        matchedTags: [],
        bestBulletIndex: 0,
        matchExplanation: "",
      },
      {
        blockId: "b",
        relevant: false,
        semanticScore: 0,
        matchedTags: [],
        bestBulletIndex: 0,
        matchExplanation: "",
      },
    ]);
  });

  it("filters tagMatches against the vault tag set, ignoring case", () => {
    const result = sanitizeMatch(
      {
        parsedJD,
        tagMatches: [
          { requirement: "Frontend", tags: ["REACT", "Go", "vue", "react"] },
          { requirement: "Unknown", tags: ["vue"] },
        ],
        rankings: [],
      },
      blocks,
    );
    expect(result.tagMatches).toEqual([
      { requirement: "Frontend", tags: ["React", "go"] },
      { requirement: "Unknown", tags: [] },
    ]);
  });

  it("narrows matchedTags to the card's own tags", () => {
    const result = sanitizeMatch(
      {
        parsedJD,
        tagMatches: [],
        rankings: [
          {
            blockId: "b",
            relevant: true,
            semanticScore: 50,
            matchedTags: ["Python", "go", "react"],
            bestBulletIndex: 0,
            matchExplanation: "ok",
          },
        ],
      },
      blocks,
    );
    expect(result.rankings[1].matchedTags).toEqual(["python"]);
  });

  it("clamps bestBulletIndex into the card's bullet range", () => {
    const rank = (blockId: string, bestBulletIndex: number) => ({
      blockId,
      relevant: true,
      semanticScore: 50,
      matchedTags: [],
      bestBulletIndex,
      matchExplanation: "",
    });
    const result = sanitizeMatch(
      {
        parsedJD,
        tagMatches: [],
        rankings: [rank("a", 9), rank("b", -3)],
      },
      blocks,
    );
    expect(result.rankings[0].bestBulletIndex).toBe(2);
    expect(result.rankings[1].bestBulletIndex).toBe(0);
  });

  it("clamps semanticScore into 0-100", () => {
    const result = sanitizeMatch(
      {
        parsedJD,
        tagMatches: [],
        rankings: [
          {
            blockId: "a",
            relevant: true,
            semanticScore: 140,
            matchedTags: [],
            bestBulletIndex: 0,
            matchExplanation: "",
          },
        ],
      },
      blocks,
    );
    expect(result.rankings[0].semanticScore).toBe(100);
  });
});

describe("selectRankedCards", () => {
  it("puts relevant cards first, then the rest, each sorted by score", () => {
    const blocks = ["a", "b", "c", "d"].map((id) => block(id));
    const list = [
      ranking("a", 90, false),
      ranking("b", 60, true),
      ranking("c", 80, true),
      ranking("d", 70, false),
    ];
    expect(selectRankedCards(list, blocks, 8).map((e) => e.block.id)).toEqual([
      "c",
      "b",
      "a",
      "d",
    ]);
  });

  it("fills from non-relevant cards up to n", () => {
    const blocks = ["a", "b", "c"].map((id) => block(id));
    const list = [
      ranking("a", 10, true),
      ranking("b", 50, false),
      ranking("c", 40, false),
    ];
    expect(selectRankedCards(list, blocks, 2).map((e) => e.block.id)).toEqual([
      "a",
      "b",
    ]);
  });

  it("excludes archived cards", () => {
    const blocks = [block("a", { isArchived: true }), block("b")];
    const list = [ranking("a", 99, true), ranking("b", 1, false)];
    expect(selectRankedCards(list, blocks, 8).map((e) => e.block.id)).toEqual([
      "b",
    ]);
  });

  it("keeps vault order on ties", () => {
    const blocks = ["a", "b", "c"].map((id) => block(id));
    const list = [
      ranking("c", 50, true),
      ranking("b", 50, true),
      ranking("a", 50, true),
    ];
    expect(selectRankedCards(list, blocks, 8).map((e) => e.block.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("skips blocks without a ranking and returns the matching ranking", () => {
    const blocks = [block("a"), block("b")];
    const rankingB = ranking("b", 40, true);
    const result = selectRankedCards([rankingB], blocks, RELEVANT_TOP_N);
    expect(result).toHaveLength(1);
    expect(result[0].ranking).toBe(rankingB);
  });

  it("caps the list at n", () => {
    const blocks = Array.from({ length: 12 }, (_, i) => block(`b${i}`));
    const list = blocks.map((b, i) => ranking(b.id, i, true));
    expect(selectRankedCards(list, blocks, RELEVANT_TOP_N)).toHaveLength(8);
  });
});

describe("matchTier", () => {
  it("is strong only for relevant cards at or above the threshold", () => {
    expect(matchTier({ relevant: true, matchScore: STRONG_THRESHOLD })).toBe(
      "strong",
    );
    expect(
      matchTier({ relevant: true, matchScore: STRONG_THRESHOLD - 1 }),
    ).toBe("partial");
  });

  it("is weak for non-relevant cards regardless of score", () => {
    expect(matchTier({ relevant: false, matchScore: 100 })).toBe("weak");
    expect(matchTier({ relevant: false, matchScore: 0 })).toBe("weak");
  });
});

describe("requirementsForTag", () => {
  const tagMatches = [
    { requirement: "Distributed systems", tags: ["raft", "consensus"] },
    { requirement: "Raft consensus", tags: ["Raft"] },
    { requirement: "Kubernetes", tags: [] },
  ];

  it("returns every requirement that mapped to the tag, ignoring case", () => {
    expect(requirementsForTag(tagMatches, "RAFT")).toEqual([
      "Distributed systems",
      "Raft consensus",
    ]);
  });

  it("returns an empty list for unmapped tags", () => {
    expect(requirementsForTag(tagMatches, "go")).toEqual([]);
  });
});
