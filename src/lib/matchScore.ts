import { W_KW, W_SEM } from "@/lib/tunables";
import { expandAlias, normalizeToken, textContainsSkill } from "@/lib/normalize";
import type {
  AccomplishmentBlock,
  MatchableBlock,
  ParsedJobDescription,
} from "@/types/resume";

function blockCorpus(block: MatchableBlock): string {
  return [
    ...block.tags,
    ...block.bullets,
    block.sourceContext,
    block.title,
    block.organization,
  ].join(" ");
}

export function computeKeywordOverlap(
  block: MatchableBlock,
  parsedJD: ParsedJobDescription,
): number {
  const required = parsedJD.requiredSkills;
  const preferred = parsedJD.preferredSkills;
  const totalWeight = required.length * 2 + preferred.length;
  if (totalWeight === 0) return 0;

  const corpus = blockCorpus(block);
  let matchedWeight = 0;

  for (const skill of required) {
    if (textContainsSkill(corpus, skill)) {
      matchedWeight += 2;
    }
  }
  for (const skill of preferred) {
    if (textContainsSkill(corpus, skill)) {
      matchedWeight += 1;
    }
  }

  return Math.round((matchedWeight / totalWeight) * 100);
}

export function computeMatchScore(
  semanticScore: number,
  keywordOverlap: number,
): number {
  return Math.round(W_SEM * semanticScore + W_KW * keywordOverlap);
}

export function jdSkillsList(parsedJD: ParsedJobDescription): string[] {
  return [...parsedJD.requiredSkills, ...parsedJD.preferredSkills];
}

export function skillInBlockEvidence(
  block: AccomplishmentBlock,
  skill: string,
  effectiveBullets: string[],
): boolean {
  const corpus = [
    ...block.tags,
    block.title,
    ...effectiveBullets,
  ].join(" ");
  return textContainsSkill(corpus, skill);
}

export function matchedKeywordUnsupported(
  block: AccomplishmentBlock,
  keyword: string,
  effectiveBullets: string[],
): boolean {
  const normalized = expandAlias(keyword);
  const sources = [
    ...block.tags.map(normalizeToken),
    ...block.bullets.map((b) => normalizeToken(b)),
    ...effectiveBullets.map((b) => normalizeToken(b)),
    normalizeToken(block.sourceContext),
  ];
  return !sources.some(
    (s) => s.includes(normalized) || normalized.includes(s),
  );
}
