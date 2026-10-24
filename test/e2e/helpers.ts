import { expect, type Locator, type Page } from "@playwright/test";

export async function openApp(page: Page) {
  await page.goto("/");
  await expect(page.locator("#resume-print-root")).toBeVisible();
}

export function spaceMeter(page: Page): Locator {
  return page.getByTitle("Estimated lines vs one-page budget");
}

export function canvasBlock(page: Page, blockId: string): Locator {
  return page.locator(`[data-canvas-block-id="${blockId}"]`);
}

/** Vault card located by its heading, scoped to the left pane. */
export function vaultCard(page: Page, title: string): Locator {
  return page
    .locator("aside article")
    .filter({ has: page.getByRole("heading", { name: title, exact: true }) });
}

/** Canvas controls are hidden until the block is hovered. */
export async function hoverClick(block: Locator, name: string, nth = 0) {
  await block.hover();
  await block.getByRole("button", { name, exact: true }).nth(nth).click();
}

export async function analyzeDemoJd(page: Page) {
  await page.getByRole("button", { name: "Job Description", exact: true }).click();
  await expect(page.getByPlaceholder("Paste job description…")).toHaveValue(
    /Nimbus Analytics/,
  );
  await page.getByRole("button", { name: "Analyze & Rank Vault" }).click();
  await expect(page.getByText(/\d+ of \d+ covered/)).toBeVisible();
}

/** Ranked vault card in the JD tab, located by block id. */
export function rankedCard(page: Page, blockId: string): Locator {
  return page.locator(`[data-ranked-block-id="${blockId}"]`);
}

export async function confirmTailor(page: Page) {
  await page.getByRole("dialog", { name: "Tailor bullet", exact: true })
    .getByRole("button", { name: "Continue", exact: true })
    .click();
}
