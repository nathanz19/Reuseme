import type { TailoredProposal } from "@/types/resume";

/** UI-only examples tied to the selected bullet; no AI or new career facts. */
export function createTailorPreview(blockId: string, bulletIndex: number, bullet: string, role?: string): TailoredProposal {
  const text = bullet.trim();
  const sentence = text.replace(/[.!?]+$/, "");
  const technical = sentence.replace(/^Built\b/, "Developed").replace(/^Implemented\b/, "Engineered").replace(/^Managed\b/, "Coordinated");
  return {
    blockId, bulletIndex, originalText: bullet,
    selectedTone: "leadership",
    variants: {
      leadership: `${sentence}. ${role ? `Relevant experience for ${role}.` : "A contribution aligned with the target role."}`,
      technical_ic: `Execution focus: ${technical}.`,
      concise: `I ${sentence.charAt(0).toLowerCase()}${sentence.slice(1)}.`,
    },
    sourceQuote: "", matchedKeywords: [], unsupportedFlags: [], warnings: [],
  };
}
