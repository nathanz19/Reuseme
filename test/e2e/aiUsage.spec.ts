import { expect, test } from "@playwright/test";
import { analyzeDemoJd, canvasBlock, confirmTailor, hoverClick, openApp } from "./helpers";

test("Space and AI show explanations only on hover or focus", async ({ page }) => {
  await page.route("**/api/ai/usage", (route) => route.fulfill({
    json: { mock: false, limit: 10, remaining: 9, resetAt: Date.now() + 3600000 },
  }));
  await openApp(page);
  const tooltip = page.getByRole("tooltip");
  await expect(tooltip).toHaveCount(0);
  const space = page.getByLabel("Estimated lines vs one-page budget", { exact: true });
  await space.hover();
  await expect(tooltip).toContainText("one-page resume");
  await page.mouse.move(0, 0);
  await expect(tooltip).toHaveCount(0);
  const ai = page.getByRole("status", { name: "AI request allowance", exact: true });
  await expect(ai).toHaveText("AI 9/10 left");
  await ai.hover();
  await expect(tooltip).toContainText("remaining free requests");
  await expect(tooltip).toContainText("Resets at");
  await page.mouse.move(0, 0);
  await space.focus();
  await expect(tooltip).toContainText("estimated lines");
  await space.press("Escape");
  await expect(tooltip).toHaveCount(0);
});

test("AI allowance loads next to Space and refreshes after both AI actions and reload", async ({ page }) => {
  let remaining = 10;
  await page.route("**/api/ai/usage", (route) => route.fulfill({
    json: { mock: false, limit: 10, remaining, resetAt: Date.now() + 3600000 },
  }));
  await openApp(page);
  const meter = page.getByRole("status", { name: "AI request allowance", exact: true });
  await expect(meter).toHaveText("AI 10/10 left");
  await expect(page.getByRole("toolbar", { name: "Document editing" })).toContainText("Space");
  remaining = 9;
  await analyzeDemoJd(page);
  await expect(meter).toHaveText("AI 9/10 left");
  await page.getByRole("button", { name: "Vault", exact: true }).first().click();
  remaining = 0;
  await hoverClick(canvasBlock(page, "exp-1"), "Tailor bullet");
  await confirmTailor(page);
  await expect(meter).toHaveText("AI 0/10 left");
  await page.reload();
  await expect(meter).toHaveText("AI 0/10 left");
});

test("AI allowance distinguishes demo mode and unavailable storage", async ({ page }) => {
  await openApp(page);
  const meter = page.getByRole("status", { name: "AI request allowance", exact: true });
  await expect(meter).toHaveText("AI demo");
  await page.route("**/api/ai/usage", (route) => route.fulfill({ status: 503, json: { error: "Unavailable" } }));
  await page.reload();
  await expect(meter).toHaveText("AI usage unavailable");
});
