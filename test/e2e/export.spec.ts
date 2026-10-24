import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { inflateSync } from "node:zlib";
import { docxPlainText, readZipText } from "../docxZip";
import { canvasBlock, hoverClick, openApp } from "./helpers";

function pdfTextCommands(pdf: Buffer): string {
  const contents = pdf.toString("latin1");
  const streams: string[] = [];
  for (const match of contents.matchAll(/<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g)) {
    if (!match[1].includes("/FlateDecode")) continue;
    const decoded = inflateSync(Buffer.from(match[2], "latin1")).toString("latin1");
    streams.push(...Array.from(decoded.matchAll(/BT\b([\s\S]*?)\bET/g), (text) => text[1]));
  }
  return streams.join("\n");
}

test("export opens the browser print dialog", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute("data-print-requested", "true");
  });
  const exportButton = page.getByRole("button", { name: "Export", exact: true });
  await expect(exportButton).toBeDisabled();
  await expect(page.getByRole("menuitem")).toHaveCount(0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await page.locator("[data-export-control]").hover();
  await expect(page.getByRole("tooltip")).toContainText("before exporting");
  await page.mouse.move(0, 0);
  await expect(page.getByRole("tooltip")).toHaveCount(0);
  await expect(page.locator("body")).not.toHaveAttribute("data-print-requested", "true");
  await hoverClick(canvasBlock(page, "proj-4"), "Remove from resume");
  await expect(exportButton).toBeEnabled();
  await exportButton.click();
  await expect(page.getByRole("menu", { name: "Export format" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu", { name: "Export format" })).toBeHidden();
  await exportButton.click();
  await page.getByRole("menuitem", { name: /^PDF/ }).click();
  await expect(page.locator("body")).toHaveAttribute("data-print-requested", "true");
  await expect(page.getByRole("menu", { name: "Export format" })).toBeHidden();
});

test("export downloads a docx of the active resume", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => {
    window.print = () => document.body.setAttribute("data-print-requested", "true");
  });
  await hoverClick(canvasBlock(page, "proj-4"), "Remove from resume");
  await page.getByRole("button", { name: "Export", exact: true }).click();
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("menuitem", { name: /^Word/ }).click(),
  ]);
  expect(download.suggestedFilename()).toBe("Frontend SWE.docx");
  await expect(page.locator("body")).not.toHaveAttribute("data-print-requested", "true");
  const filePath = await download.path();
  if (!filePath) throw new Error("download missing");
  const bytes = await readFile(filePath);
  const text = docxPlainText(readZipText(bytes, "word/document.xml"));
  expect(text).toContain("Alex Morgan");
  expect(text).toContain("Lumen Cartography");
  expect(text).toContain("Accessibility (WCAG)");
  expect(text).not.toContain("Harbor Ledger");
});

for (const width of [900, 1440]) {
  test(`PDF contains printed text at viewport width ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/editor");
    const resume = page.locator("#resume-print-root");
    await expect(resume).toBeAttached();
    const name = await resume.locator("h1").innerText();

    // Exercise the actual printing lifecycle rather than just emulating print CSS.
    const pdf = await page.pdf({ preferCSSPageSize: true });
    expect(pdf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(pdfTextCommands(pdf)).toMatch(/(?:Tj|TJ)\b/);
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
    await expect(page.locator("#resume-print-copy")).toHaveCount(0);

    // Inspect the document that beforeprint supplies to the print compositor.
    await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
    await page.emulateMedia({ media: "print" });
    const copy = page.locator("body > #resume-print-copy");
    await expect(copy).toBeVisible();
    await expect(copy.locator("h1")).toHaveText(name);
    await expect(page.locator("aside")).toBeHidden();
    await expect(page.getByRole("button", { name: "Export", exact: true })).toBeHidden();
    await expect(copy.locator(".overflow-flag")).toBeVisible();
    await expect(copy.locator("button, .overflow-label")).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await page.emulateMedia({ media: "screen" });
    await expect(page.getByRole("button", { name: "Export", exact: true })).toBeVisible();
  });
}

test("printing preserves canvas margins and does not push Skills lower", async ({ page }) => {
  await openApp(page);
  const original = page.locator("#resume-print-root");
  const measure = (element: HTMLElement | SVGElement) => {
    const root = element.getBoundingClientRect();
    const skills = element.querySelector("section:last-child p")!.getBoundingClientRect();
    return {
      padding: getComputedStyle(element).padding,
      skillsBottom: skills.bottom - root.top,
    };
  };
  const screen = await original.evaluate(measure);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  const printed = await page.locator("#resume-print-copy").evaluate(measure);
  expect(printed.padding).toBe(screen.padding);
  expect(printed.skillsBottom).toBeLessThanOrEqual(screen.skillsBottom + 1);
});

test("print fits the entire Skills section inside the page instead of clipping", async ({ page }) => {
  await openApp(page);
  // Reproduce a document with more physical content than the line estimate predicts.
  await page.locator("#resume-print-root section:last-child p").evaluate((skills) => {
    skills.textContent += ", " + "Additional skill ".repeat(100);
  });
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await page.emulateMedia({ media: "print" });
  const layout = await page.locator("#resume-print-copy").evaluate((copy) => {
    const page = copy.getBoundingClientRect();
    const skills = copy.querySelector("section:last-child p")!.getBoundingClientRect();
    const padding = parseFloat(getComputedStyle(copy).paddingBottom);
    return { bottom: skills.bottom, pageBottom: page.bottom - padding };
  });
  expect(layout.bottom).toBeLessThanOrEqual(layout.pageBottom + 1);
});

test("normal export retains readable scale when prepared in the screen layout", async ({ page }) => {
  await openApp(page);
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  const scale = await page.locator("#resume-print-copy .resume-print-content").evaluate((content) =>
    new DOMMatrix(getComputedStyle(content).transform).a,
  );
  expect(scale).toBeGreaterThan(0.85);
  expect(scale).toBeLessThanOrEqual(1);
});
