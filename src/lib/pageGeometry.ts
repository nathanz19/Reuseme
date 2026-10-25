import { referenceFormatMetrics } from "@/lib/referenceFormat";
import { PAGE_HEIGHT, PAGE_WIDTH } from "@/lib/tunables";
import type { ResumePreset } from "@/types/resume";

/** Built-in templates use the `p-8` page padding and `text-sm` (14px / 20px) body text. */
export const BUILTIN_PADDING_PX = 32;
export const BUILTIN_BODY_PX = 14;
export const BUILTIN_LINE_HEIGHT_PX = 20;

export interface PageGeometry {
  /** Padding on every side of the page. */
  paddingPx: number;
  /** Height of the content area: the page height minus the top and bottom padding. */
  availablePx: number;
  /** Width of the content area. */
  contentWidthPx: number;
  /** Body font size. */
  bodyPx: number;
  /** One body line: the unit of the Space meter. */
  lineHeightPx: number;
  /** Whole body lines that fit in `availablePx`. */
  maxLines: number;
}

/**
 * Page geometry of a preset. These are the same inputs the canvas CSS uses
 * (`p-8` and `text-sm` for built-in templates, `referenceFormatStyle` for
 * imported ones). A template field that changes the page margin or the line
 * height must change this function too.
 */
export function pageGeometry(preset: Pick<ResumePreset, "referenceFormat">): PageGeometry {
  const format = preset.referenceFormat;
  let paddingPx = BUILTIN_PADDING_PX;
  let bodyPx = BUILTIN_BODY_PX;
  let lineHeightPx = BUILTIN_LINE_HEIGHT_PX;
  if (format) {
    const metrics = referenceFormatMetrics(format);
    paddingPx = metrics.marginPx;
    bodyPx = metrics.bodyPx;
    lineHeightPx = metrics.bodyPx * metrics.leading;
  }
  const availablePx = PAGE_HEIGHT - 2 * paddingPx;
  return {
    paddingPx,
    availablePx,
    contentWidthPx: PAGE_WIDTH - 2 * paddingPx,
    bodyPx,
    lineHeightPx,
    maxLines: Math.max(1, Math.floor(availablePx / lineHeightPx)),
  };
}
