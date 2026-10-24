import { checkGrounding } from "@/lib/grounding";
import { getEffectiveBullets } from "@/lib/getEffectiveBullets";
import { computeKeywordOverlap, computeMatchScore } from "@/lib/matchScore";
import type {
  AccomplishmentBlock,
  ParsedJobDescription,
  SemanticRanking,
  TailoredProposal,
  Tone,
} from "@/types/resume";

export const FIXTURE_MATCH_FAIL_TOKEN = "__FIXTURE_MATCH_FAIL__";

export interface MatchVaultResult {
  parsedJD: ParsedJobDescription;
  rankings: SemanticRanking[];
}

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
  block: AccomplishmentBlock,
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

export function matchVault(
  jdText: string,
  blocks: AccomplishmentBlock[],
): MatchVaultResult | MatchVaultError {
  if (jdText.includes(FIXTURE_MATCH_FAIL_TOKEN)) {
    return { error: "Fixture match failed (simulated API error)." };
  }

  const parsedJD = parseDemoJd(jdText);

  const rankings: SemanticRanking[] = blocks.map((block) => {
    const { score: semanticScore, explanation } = semanticScoreForBlock(
      block,
      parsedJD,
    );
    const keywordOverlap = computeKeywordOverlap(block, parsedJD);
    const matchScore = computeMatchScore(semanticScore, keywordOverlap);
    return {
      blockId: block.id,
      semanticScore,
      matchExplanation: explanation,
      keywordOverlap,
      matchScore,
    };
  });

  rankings.sort((a, b) => b.matchScore - a.matchScore);

  return { parsedJD, rankings };
}

export interface TailorBulletInput {
  block: AccomplishmentBlock;
  bulletIndex: number;
  bulletText: string;
  parsedJD: ParsedJobDescription;
  presetId: string;
}

export async function tailorBullet(
  input: TailorBulletInput,
): Promise<TailoredProposal> {
  await new Promise((r) => setTimeout(r, 120));

  const { block, bulletIndex, bulletText, parsedJD } = input;
  const quote =
    block.sourceContext.match(/Raft[^.]*\./)?.[0] ??
    block.sourceContext.slice(0, 80);

  const variants: Record<Tone, string> = {
    technical_ic:
      "Implemented Raft leader election for a metadata plane at 8k RPS with partition-tested failover runbooks.",
    leadership:
      "Owned consensus reliability for the metadata service, leading failover drills and cross-team incident reviews.",
    concise:
      "Led Raft-based metadata service reliability with sub-2s failover and documented recovery runbooks for the team.",
  };

  const matchedKeywords = ["Distributed systems", "Go", "Docker", "AWS"].filter(
    (kw) => parsedJD.requiredSkills.some((s) => s.toLowerCase().includes(kw.toLowerCase().split(" ")[0])),
  );

  const unsupportedFlags = ["Kubernetes", "Terraform", "Rust"].filter((kw) =>
    parsedJD.rawText.toLowerCase().includes(kw.toLowerCase()),
  );

  const base: Omit<TailoredProposal, "warnings"> = {
    blockId: block.id,
    bulletIndex,
    originalText: bulletText,
    variants,
    selectedTone: "technical_ic",
    sourceQuote: quote,
    matchedKeywords,
    unsupportedFlags,
  };

  const effectiveBullets = getEffectiveBullets(block, {
    id: input.presetId,
    name: "",
    templateId: "classic-ats",
    header: {
      fullName: "",
      email: "",
      phone: "",
      location: "",
      links: [],
    },
    activeBlockIds: [],
    bulletOverrides: {},
    customSkillsSection: [],
  });

  const warnings = checkGrounding(block, base, effectiveBullets);

  return { ...base, warnings };
}
