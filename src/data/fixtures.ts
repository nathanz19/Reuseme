import {
  computeKeywordOverlap,
  computeMatchScore,
  jdSkillsList,
} from "@/lib/matchScore";
import { textContainsSkill } from "@/lib/normalize";
import type {
  MatchableBlock,
  ParsedJobDescription,
  SemanticRanking,
  TagMatch,
} from "@/types/resume";

export const FIXTURE_MATCH_FAIL_TOKEN = "__FIXTURE_MATCH_FAIL__";

export interface MatchVaultResult {
  parsedJD: ParsedJobDescription;
  tagMatches: TagMatch[];
  rankings: SemanticRanking[];
}

/** Fixture rule: a card is relevant when its semantic score reaches this. */
const FIXTURE_RELEVANT_SCORE = 70;

export interface MatchVaultError {
  error: string;
}

function parseDemoJd(jdText: string): ParsedJobDescription {
  const lower = jdText.toLowerCase();
  const required: string[] = [];
  const preferred: string[] = [];

  const reqIdx = lower.indexOf("required skills");
  const prefIdx = lower.indexOf("preferred skills");
  const respIdx = lower.indexOf("responsibilities");

  const sliceSkills = (start: number, end: number) =>
    jdText
      .slice(start, end)
      .split("\n")
      .map((l) => l.replace(/^[-•*]\s*/, "").trim())
      .filter((l) => l && !l.toLowerCase().includes("skills"));

  if (reqIdx >= 0) {
    const end = prefIdx >= 0 ? prefIdx : respIdx >= 0 ? respIdx : jdText.length;
    required.push(...sliceSkills(reqIdx, end));
  }
  if (prefIdx >= 0) {
    const end = respIdx >= 0 ? respIdx : jdText.length;
    preferred.push(...sliceSkills(prefIdx, end));
  }

  const titleLine = jdText.split("\n")[0] ?? "Role";
  const roleTitle = titleLine.split("—")[0]?.trim() ?? titleLine.trim();
  const companyMatch = titleLine.match(/—\s*(.+)$/);
  const companyName = companyMatch?.[1]?.trim() ?? "Company";

  return {
    rawText: jdText,
    roleTitle,
    companyName,
    requiredSkills: required,
    preferredSkills: preferred,
    keyResponsibilities: [],
  };
}

function semanticScoreForBlock(
  block: MatchableBlock,
  _parsedJD: ParsedJobDescription,
): { score: number; explanation: string } {
  const corpus = [
    block.title,
    block.organization,
    ...block.tags,
    ...block.bullets,
    block.sourceContext,
  ]
    .join(" ")
    .toLowerCase();

  const boosts: { needle: string; score: number; explain: string }[] = [
    {
      needle: "raft",
      score: 92,
      explain:
        "Strong evidence of Raft consensus implementation in source notes.",
    },
    {
      needle: "distributed",
      score: 78,
      explain: "Distributed systems experience aligns with platform ownership.",
    },
    {
      needle: "react",
      score: 85,
      explain: "Frontend delivery track record matches product-facing requirements.",
    },
    {
      needle: "go",
      score: 80,
      explain: "Go microservices background supports backend service work.",
    },
    {
      needle: "python",
      score: 75,
      explain: "Python services and data work cover scripting and ML adjacency.",
    },
    {
      needle: "postgresql",
      score: 70,
      explain: "PostgreSQL migrations and analytics schemas show datastore depth.",
    },
    {
      needle: "prometheus",
      score: 68,
      explain: "Observability work with Prometheus supports reliability goals.",
    },
    {
      needle: "machine learning",
      score: 72,
      explain: "ML platform and federated learning notes support preferred ML skills.",
    },
  ];

  for (const b of boosts) {
    if (corpus.includes(b.needle)) {
      return { score: b.score, explanation: b.explain };
    }
  }

  return {
    score: 35,
    explanation: "Peripheral overlap with the role; limited direct evidence in notes.",
  };
}

function fixtureTagMatches(
  parsedJD: ParsedJobDescription,
  blocks: MatchableBlock[],
): TagMatch[] {
  const vaultTags = [...new Set(blocks.flatMap((block) => block.tags))];
  return jdSkillsList(parsedJD).map((requirement) => ({
    requirement,
    tags: vaultTags.filter((tag) => textContainsSkill(tag, requirement)),
  }));
}

function fixtureMatchedTags(
  block: MatchableBlock,
  skills: string[],
): string[] {
  return block.tags.filter((tag) =>
    skills.some((skill) => textContainsSkill(tag, skill)),
  );
}

/** Bullet with the most job-skill hits; the first bullet wins ties. */
function fixtureBestBulletIndex(
  block: MatchableBlock,
  skills: string[],
): number {
  let best = 0;
  let bestHits = -1;
  block.bullets.forEach((bullet, index) => {
    const hits = skills.filter((skill) => textContainsSkill(bullet, skill)).length;
    if (hits > bestHits) {
      best = index;
      bestHits = hits;
    }
  });
  return best;
}

export function matchVault(
  jdText: string,
  blocks: MatchableBlock[],
): MatchVaultResult | MatchVaultError {
  if (jdText.includes(FIXTURE_MATCH_FAIL_TOKEN)) {
    return { error: "Fixture match failed (simulated API error)." };
  }

  const parsedJD = parseDemoJd(jdText);

  const skills = jdSkillsList(parsedJD);
  const rankings: SemanticRanking[] = blocks.map((block) => {
    const { score: semanticScore, explanation } = semanticScoreForBlock(
      block,
      parsedJD,
    );
    const keywordOverlap = computeKeywordOverlap(block, parsedJD);
    const matchScore = computeMatchScore(semanticScore, keywordOverlap);
    return {
      blockId: block.id,
      relevant: semanticScore >= FIXTURE_RELEVANT_SCORE,
      semanticScore,
      matchedTags: fixtureMatchedTags(block, skills),
      bestBulletIndex: fixtureBestBulletIndex(block, skills),
      matchExplanation: explanation,
      keywordOverlap,
      matchScore,
    };
  });

  rankings.sort((a, b) => b.matchScore - a.matchScore);

  return {
    parsedJD,
    tagMatches: fixtureTagMatches(parsedJD, blocks),
    rankings,
  };
}
