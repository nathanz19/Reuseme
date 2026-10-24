import { matchedKeywordUnsupported } from "@/lib/matchScore";
import { collapseWhitespace } from "@/lib/normalize";
import { CONCISE_MAX_CHARS } from "@/lib/tunables";
import type { AccomplishmentBlock, TailoredProposal } from "@/types/resume";

export function checkGrounding(
  block: AccomplishmentBlock,
  proposal: Pick<
    TailoredProposal,
    "sourceQuote" | "variants" | "matchedKeywords"
  >,
  effectiveBullets: string[],
): string[] {
  const warnings: string[] = [];
  const ctx = collapseWhitespace(block.sourceContext);
  const quote = collapseWhitespace(proposal.sourceQuote);
  if (quote && !ctx.includes(quote)) {
    warnings.push("quote_not_found");
  }
  if (proposal.variants.concise.length > CONCISE_MAX_CHARS) {
    warnings.push("concise_too_long");
  }
  for (const kw of proposal.matchedKeywords) {
    if (matchedKeywordUnsupported(block, kw, effectiveBullets)) {
      warnings.push(`keyword_unsupported:${kw}`);
    }
  }
  return warnings;
}
