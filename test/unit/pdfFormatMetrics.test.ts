import { expect, it } from "vitest";
import { inspectPdfFormat } from "@/lib/server/pdfFormatMetrics";
import { referencePdf } from "../fixtures/referencePdf";

it("measures actual PDF fonts, sizes, margins, and above-heading rules", async () => {
  const metrics = await inspectPdfFormat(referencePdf());
  expect(metrics).toMatchObject({ fontFace: "Times New Roman", bodyPx: 13.3, headingPx: 16, namePx: 26.67, marginPx: 48, rulePosition: "above" });
  expect(metrics?.ruleWidthPx).toBeCloseTo(0.67, 1);
  expect(JSON.stringify(metrics)).not.toContain("Example");
});
