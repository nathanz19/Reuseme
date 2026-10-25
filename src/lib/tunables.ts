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
/**
 * Fallback only: the formula's line limit for one US Letter page. The real
 * limit is the measured canvas height (see `measurePage`).
 */
export const MAX_LINES = 45;

/** US Letter page size in CSS px (matches spec §2). */
export const PAGE_WIDTH = 816;
export const PAGE_HEIGHT = 1056;

/**
 * Fallback only: px per formula line. It maps the formula's `MAX_LINES` onto
 * the content height of a built-in template (page minus 2 x 32px padding, with
 * 20px lines), so the fallback limit is the same as before measuring existed.
 */
export const FALLBACK_PX_PER_ESTIMATED_LINE = (PAGE_HEIGHT - 64) / (MAX_LINES * 20);
export const CONCISE_MAX_CHARS = 110;
export const HISTORY_LIMIT = 100;

export const PERSIST_VERSION = 1;
