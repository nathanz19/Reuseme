import type { TemplateId } from "@/types/resume";

export const W_SEM = 0.6;
export const W_KW = 0.4;
export const FORGOTTEN_THRESHOLD = 60;
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
