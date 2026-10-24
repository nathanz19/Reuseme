import { expect, test } from "@playwright/test";
import { inflateSync } from "node:zlib";
import { openApp } from "./helpers";

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
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(page.locator("body")).toHaveAttribute("data-print-requested", "true");
});

for (const width of [900, 1440]) {
  test(`PDF contains printed text at viewport width ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
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
    await expect(page.getByRole("button", { name: "Export PDF" })).toBeHidden();
    await expect(copy.locator(".overflow-flag")).toBeVisible();
    await expect(copy.locator("button, .overflow-label")).toHaveCount(0);
    await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
    await page.emulateMedia({ media: "screen" });
    await expect(page.getByRole("button", { name: "Export PDF" })).toBeVisible();
  });
}
