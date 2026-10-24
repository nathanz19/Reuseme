import type { TemplateId } from "@/types/resume";

export const W_SEM = 0.6;
export const W_KW = 0.4;
/** Number of cards shown in the JD tab's ranked vault list. */
export const RELEVANT_TOP_N = 8;
/** A relevant card with matchScore at or above this is a STRONG match. */
export const STRONG_THRESHOLD = 75;
export const CHARS_PER_LINE: Record<TemplateId, number> = {
  "classic-ats": 95,
  "modern-tech": 85,
};
/** Calibrated estimate for one US Letter page (see PAGE_WIDTH × PAGE_HEIGHT). */
export const MAX_LINES = 45;

/** US Letter page size in CSS px (matches spec §2). */
export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;
export const CONCISE_MAX_CHARS = 110;
export const HISTORY_LIMIT = 100;

export const PERSIST_VERSION = 1;
