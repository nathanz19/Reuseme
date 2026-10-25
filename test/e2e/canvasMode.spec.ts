import { expect, test, type Locator, type Page } from "@playwright/test";
import { openApp, vaultCard } from "./helpers";

function experienceBlocks(page: Page) {
  return page.locator('[data-resume-section="experience"] [data-canvas-block-id]');
}

function blockOrder(page: Page) {
  return experienceBlocks(page).evaluateAll((blocks) =>
    blocks.map((block) => block.getAttribute("data-canvas-block-id")),
  );
}

/** Press on `from` and drag it to the top edge of `target`. */
async function dragOnto(page: Page, from: Locator, target: Locator) {
  const fromBox = (await from.boundingBox())!;
  const to = (await target.boundingBox())!;
  const x = fromBox.x + 40;
  await page.mouse.move(x, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, fromBox.y - 10, { steps: 4 });
  await page.mouse.move(to.x + 40, to.y + 4, { steps: 20 });
  await page.waitForTimeout(250);
}

function modeButton(page: Page, name: string) {
  return page.getByRole("group", { name: "Drag mode" }).getByRole("button", { name, exact: true });
}

async function selectionText(page: Page) {
  return page.evaluate(() => window.getSelection()?.toString().trim() ?? "");
}

test("arrange mode drags a block from its text, and undo restores the order", async ({ page }) => {
  await openApp(page);
  await expect(modeButton(page, "Arrange")).toHaveAttribute("aria-pressed", "true");
  const before = await blockOrder(page);
  expect(before.length).toBeGreaterThan(1);

  await dragOnto(page, experienceBlocks(page).nth(1).locator("li").first(), experienceBlocks(page).first());
  await page.mouse.up();

  await expect.poll(() => blockOrder(page)).toEqual([before[1], before[0], ...before.slice(2)]);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => blockOrder(page)).toEqual(before);
});

test("arrange mode drags a vault card from its title", async ({ page }) => {
  await openApp(page);
  const card = vaultCard(page, "Backend Engineer");
  await card.scrollIntoViewIfNeeded();
  await dragOnto(page, card.getByRole("heading"), page.locator("#resume-print-root"));
  await expect(card).toHaveClass(/opacity-60/);
  await page.keyboard.press("Escape");
  await page.mouse.up();
});

test("select text mode keeps the resume and vault in place and lets text be selected", async ({ page }) => {
  await openApp(page);
  await modeButton(page, "Select text").click();
  await expect(modeButton(page, "Select text")).toHaveAttribute("aria-pressed", "true");
  for (const name of [/^Drag .* section$/, "Drag to reorder", "Drag to resume"]) {
    await expect(page.getByRole("button", { name })).toHaveCount(0);
  }

  const before = await blockOrder(page);
  await dragOnto(page, experienceBlocks(page).nth(1).locator("li").first(), experienceBlocks(page).first());
  await page.mouse.up();
  await page.waitForTimeout(250);
  expect(await blockOrder(page)).toEqual(before);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();

  const bullet = experienceBlocks(page).first().locator("li").first();
  await bullet.click({ clickCount: 3 });
  const selected = await selectionText(page);
  expect(selected.length).toBeGreaterThan(0);
  expect((await bullet.innerText()).trim()).toContain(selected.slice(0, 20));

  const card = vaultCard(page, "Backend Engineer");
  await card.scrollIntoViewIfNeeded();
  await dragOnto(page, card.getByRole("heading"), page.locator("#resume-print-root"));
  await expect(card).not.toHaveClass(/opacity-60/);
  await page.mouse.up();
  await card.getByRole("heading").click({ clickCount: 3 });
  expect(await selectionText(page)).toContain("Backend Engineer");

  await modeButton(page, "Arrange").click();
  await expect(page.getByRole("button", { name: /^Drag .* section$/ }).first()).toBeAttached();
  await expect(card.getByRole("button", { name: "Drag to resume" })).toBeAttached();
});
