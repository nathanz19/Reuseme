import { STRONG_THRESHOLD } from "@/lib/tunables";
import type {
  AccomplishmentBlock,
  MatchableBlock,
  ParsedJobDescription,
  SemanticRanking,
  TagMatch,
} from "@/types/resume";

/** Per-card result as returned by the model, before scores are combined. */
export interface ModelRanking {
  blockId: string;
  relevant: boolean;
  semanticScore: number;
  matchedTags: string[];
  bestBulletIndex: number;
  matchExplanation: string;
}

/** Model output shape (the parsed job description has no `rawText` yet). */
export interface MatchModelOutput {
  parsedJD: Omit<ParsedJobDescription, "rawText">;
  tagMatches: TagMatch[];
  rankings: ModelRanking[];
}

export type MatchTier = "strong" | "partial" | "weak";

function tagKey(tag: string): string {
  return tag.trim().toLowerCase();
}

/** Maps lowercase tag to the vault's own spelling of it. */
function canonicalTags(tags: readonly string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const tag of tags) {
    const key = tagKey(tag);
    if (key && !map.has(key)) map.set(key, tag);
  }
  return map;
}

function filterToCanonical(
  tags: readonly string[],
  allowed: Map<string, string>,
): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of tags) {
    const key = tagKey(tag);
    const canonical = allowed.get(key);
    if (canonical === undefined || seen.has(key)) continue;
    seen.add(key);
    result.push(canonical);
  }
  return result;
}

function clampBulletIndex(index: number, bulletCount: number): number {
  if (!Number.isFinite(index) || bulletCount <= 0) return 0;
  return Math.min(Math.max(Math.trunc(index), 0), bulletCount - 1);
}

function clampScore(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.min(Math.max(score, 0), 100);
}

/**
 * Cleans model output against the vault:
 * - drops rankings for unknown block IDs (first entry per ID wins)
 * - fills missing blocks with a zero ranking
 * - keeps only tags the vault has (ignoring case) in `tagMatches`
 * - narrows each card's `matchedTags` to that card's own tags
 * - clamps `bestBulletIndex` into the card's bullet range
 * Rankings come back in vault order.
 */
export function sanitizeMatch(
  output: MatchModelOutput,
  blocks: readonly MatchableBlock[],
): MatchModelOutput {
  const vaultTags = canonicalTags(blocks.flatMap((block) => block.tags));

  const tagMatches = output.tagMatches.map((match) => ({
    requirement: match.requirement,
    tags: filterToCanonical(match.tags, vaultTags),
  }));

  const byId = new Map<string, ModelRanking>();
  for (const ranking of output.rankings) {
    if (!byId.has(ranking.blockId)) byId.set(ranking.blockId, ranking);
  }

  const rankings = blocks.map((block): ModelRanking => {
    const ranking = byId.get(block.id);
    if (!ranking) {
      return {
        blockId: block.id,
        relevant: false,
        semanticScore: 0,
        matchedTags: [],
        bestBulletIndex: 0,
        matchExplanation: "",
      };
    }
    return {
      blockId: block.id,
      relevant: ranking.relevant,
      semanticScore: clampScore(ranking.semanticScore),
      matchedTags: filterToCanonical(
        ranking.matchedTags,
        canonicalTags(block.tags),
      ),
      bestBulletIndex: clampBulletIndex(
        ranking.bestBulletIndex,
        block.bullets.length,
      ),
      matchExplanation: ranking.matchExplanation,
    };
  });

  return { parsedJD: output.parsedJD, tagMatches, rankings };
}

/**
 * Picks the cards for the ranked vault list. Archived cards are skipped.
 * Relevant cards come first, then the rest; each group sorts by `matchScore`
 * (high to low) and ties keep vault order. Blocks without a ranking are skipped.
 */
export function selectRankedCards(
  rankingsList: readonly SemanticRanking[],
  blocks: readonly AccomplishmentBlock[],
  n: number,
): { block: AccomplishmentBlock; ranking: SemanticRanking }[] {
  const rankingById = new Map<string, SemanticRanking>();
  for (const ranking of rankingsList) {
    if (!rankingById.has(ranking.blockId)) {
      rankingById.set(ranking.blockId, ranking);
    }
  }

  const entries: { block: AccomplishmentBlock; ranking: SemanticRanking }[] = [];
  for (const block of blocks) {
    if (block.isArchived) continue;
    const ranking = rankingById.get(block.id);
    if (ranking) entries.push({ block, ranking });
  }

  // Array.prototype.sort is stable, so ties keep vault order.
  const byScore = (
    a: { ranking: SemanticRanking },
    b: { ranking: SemanticRanking },
  ) => b.ranking.matchScore - a.ranking.matchScore;
  const relevant = entries.filter((e) => e.ranking.relevant).sort(byScore);
  const rest = entries.filter((e) => !e.ranking.relevant).sort(byScore);

  return [...relevant, ...rest].slice(0, Math.max(0, n));
}

export function matchTier(
  ranking: Pick<SemanticRanking, "relevant" | "matchScore">,
): MatchTier {
  if (!ranking.relevant) return "weak";
  return ranking.matchScore >= STRONG_THRESHOLD ? "strong" : "partial";
}

/** Job requirements that mapped to the given tag (ignoring case). */
export function requirementsForTag(
  tagMatches: readonly TagMatch[],
  tag: string,
): string[] {
  const key = tagKey(tag);
  return tagMatches
    .filter((match) => match.tags.some((t) => tagKey(t) === key))
    .map((match) => match.requirement);
}
