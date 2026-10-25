import type { z } from "zod";
import type { ReferenceDetailsSchema } from "@/schemas/referenceFormat";

type Details = z.infer<typeof ReferenceDetailsSchema>;
export type PdfFormatMetrics = Partial<Details>;
const clamp = (value: number, low: number, high: number) => Math.round(Math.max(low, Math.min(high, value)) * 100) / 100;
const median = (values: number[]) => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];

/** Reads only first-page geometry. Returns no names, contact details, or body text. */
export async function inspectPdfFormat(data: Uint8Array, signal?: AbortSignal): Promise<PdfFormatMetrics | null> {
  const { getDocument, OPS, Util } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  // Explicitly load the Node fake worker so bundlers don't rewrite worker URLs.
  const worker = await import("pdfjs-dist/legacy/build/pdf.worker.mjs");
  (globalThis as typeof globalThis & { pdfjsWorker?: unknown }).pdfjsWorker = worker;
  const task = getDocument({ data: data.slice(), useSystemFonts: true, isEvalSupported: false, verbosity: 0 });
  const abort = () => { void task.destroy(); };
  signal?.addEventListener("abort", abort, { once: true });
  try {
    const pdf = await task.promise;
    const page = await pdf.getPage(1);
    // Rotated pages and image-only PDFs keep the vision-based approximation.
    if (page.rotate !== 0) return null;
    const viewport = page.getViewport({ scale: 816 / (page.view[2] - page.view[0]) });
    const text = await page.getTextContent();
    const items = text.items.filter((item) => "str" in item && item.str.trim());
    if (items.length < 8 || items.length > 20000) return null;
    const operators = await page.getOperatorList();
    if (operators.fnArray.length > 100000) return null;
    const fragments = items.flatMap((item) => {
      if (!("str" in item)) return [];
      const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
      const fontSize = Math.hypot(item.transform[2], item.transform[3]) * viewport.scale;
      const fontObject = page.commonObjs.has(item.fontName) ? page.commonObjs.get(item.fontName) : null;
      return [{ x, y, size: fontSize, text: item.str, font: String(fontObject?.name ?? ""), family: text.styles[item.fontName]?.fontFamily ?? "" }];
    });
    const sizes = new Map<number, number>();
    for (const fragment of fragments) {
      const size = Math.round(fragment.size * 10) / 10;
      sizes.set(size, (sizes.get(size) ?? 0) + fragment.text.length);
    }
    const bodySize = [...sizes].sort((a, b) => b[1] - a[1])[0][0];
    const body = fragments.filter((item) => Math.abs(item.size - bodySize) < 0.3);
    const dominant = body.reduce((best, item) => item.text.length > best.text.length ? item : best, body[0]);
    const face: Details["fontFace"] | undefined = /Times/i.test(dominant.font) ? "Times New Roman" : /Georgia/i.test(dominant.font) ? "Georgia" : /Arial|Helvetica/i.test(dominant.font) ? "Arial" : /Calibri/i.test(dominant.font) ? "Calibri" : /Courier/i.test(dominant.font) ? "Courier New" : undefined;
    const rows = new Map<number, typeof fragments>();
    for (const item of fragments) {
      const row = Math.round(item.y);
      rows.set(row, [...(rows.get(row) ?? []), item]);
    }
    const orderedRows = [...rows].sort((a, b) => a[0] - b[0]);
    const headingRows = orderedRows.filter(([, row]) => /^(education|work experience|professional experience|experience|projects|technical skills|skills|certifications|awards|publications)$/i.test(row.sort((a, b) => a.x - b.x).map((item) => item.text).join(" ").trim()));
    const baselineRows = [...new Set(body.map((item) => Math.round(item.y)))].sort((a, b) => a - b);
    const gaps = baselineRows.slice(1).map((y, i) => y - baselineRows[i]).filter((gap) => gap >= bodySize * 0.9 && gap <= bodySize * 1.6);
    const normalGap = gaps.length ? median(gaps) : bodySize * 1.2;

    let matrix = [1, 0, 0, 1, 0, 0];
    let lineWidth = 1;
    let strokeColor = "#000000";
    const stack: { matrix: number[]; lineWidth: number; strokeColor: string }[] = [];
    const rules: { y: number; width: number; color: string }[] = [];
    for (let i = 0; i < operators.fnArray.length; i++) {
      const fn = operators.fnArray[i];
      const args = operators.argsArray[i];
      if (fn === OPS.save) stack.push({ matrix: [...matrix], lineWidth, strokeColor });
      if (fn === OPS.restore) {
        const state = stack.pop();
        if (state) { matrix = state.matrix; lineWidth = state.lineWidth; strokeColor = state.strokeColor; }
      }
      if (fn === OPS.transform) matrix = Util.transform(matrix, args);
      if (fn === OPS.setLineWidth) lineWidth = args[0];
      if (fn === OPS.setStrokeRGBColor && typeof args[0] === "string") strokeColor = args[0];
      if (fn !== OPS.constructPath || !args[2]) continue;
      const box: number[] = Array.from(args[2]);
      const a = [box[0], box[1]], b = [box[2], box[3]];
      const transform = Util.transform(viewport.transform, matrix);
      Util.applyTransform(a, transform); Util.applyTransform(b, transform);
      if (Math.abs(b[0] - a[0]) > 400 && Math.abs(b[1] - a[1]) < 2) rules.push({
        y: (a[1] + b[1]) / 2, width: Math.abs(lineWidth * Math.hypot(transform[0], transform[1])), color: strokeColor,
      });
    }
    const headingMatches = headingRows.flatMap(([baseline, row]) => {
      const size = Math.max(...row.map((item) => item.size));
      const nearest = [...rules].sort((a, b) => Math.abs(a.y - baseline) - Math.abs(b.y - baseline))[0];
      return nearest && Math.abs(nearest.y - baseline) < size * 2.5 ? [{ rule: nearest, baseline, size }] : [];
    });
    const metrics: PdfFormatMetrics = {
      ...(face ? { fontFace: face } : {}),
      bodyPx: clamp(bodySize, 11, 18),
      namePx: clamp(Math.max(...fragments.filter((item) => item.y < viewport.height * 0.2).map((item) => item.size)), 20, 40),
      marginPx: clamp(Math.min(...fragments.map((item) => item.x)), 20, 64),
      lineHeight: clamp(normalGap / bodySize, 1, 1.6),
    };
    if (headingRows.length) metrics.headingPx = clamp(median(headingRows.map(([, row]) => Math.max(...row.map((item) => item.size)))), 11, 20);
    if (headingMatches.length >= 2) {
      metrics.rulePosition = headingMatches.filter(({ rule, baseline }) => rule.y < baseline).length >= headingMatches.length / 2 ? "above" : "below";
      metrics.ruleWidthPx = clamp(median(headingMatches.map(({ rule }) => rule.width)), 0, 3);
      if (/^#[0-9a-fA-F]{6}$/.test(headingMatches[0].rule.color)) metrics.ruleColor = headingMatches[0].rule.color;
      // Whitespace from the last text baseline to the next section rule.
      const sectionGaps = headingMatches.flatMap(({ rule }) => {
        const previous = orderedRows.filter(([y]) => y < rule.y - 2).at(-1);
        const gap = previous ? rule.y - previous[0] - normalGap * 0.2 : -1;
        return gap >= 0 && gap <= 24 ? [gap] : [];
      });
      if (sectionGaps.length) metrics.sectionGapPx = clamp(median(sectionGaps), 0, 24);
    }
    const dateRows = orderedRows.filter(([, row]) => row.some((item) => item.x > 500 && /\b(?:19|20)\d{2}\b/.test(item.text)));
    const blockGaps = dateRows.flatMap(([y]) => {
      const previous = orderedRows.filter(([rowY]) => rowY < y - 2).at(-1);
      const gap = previous ? y - previous[0] - normalGap : -1;
      return gap >= 0 && gap < 20 ? [gap] : [];
    });
    if (blockGaps.length >= 2) metrics.blockGapPx = clamp(median(blockGaps), 0, 20);
    return metrics;
  } finally { signal?.removeEventListener("abort", abort); await task.destroy(); }
}
