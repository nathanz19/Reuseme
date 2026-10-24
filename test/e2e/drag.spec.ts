import { expect, test } from "@playwright/test";
import { canvasBlock, hoverClick, openApp, vaultCard } from "./helpers";

test("vault placeholder stays stable near a block midpoint without crashing", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openApp(page);
  // Leave one experience block and plenty of room for the new entry.
  const ids = await page.locator("[data-canvas-block-id]").evaluateAll((blocks) =>
    blocks.map((block) => block.getAttribute("data-canvas-block-id")!),
  );
  for (const id of ids.filter((id) => id !== "exp-1")) {
    await hoverClick(canvasBlock(page, id), "Remove from resume");
  }
  const target = canvasBlock(page, "exp-1");
  await target.scrollIntoViewIfNeeded();
  const targetBox = (await target.boundingBox())!;
  const grip = vaultCard(page, "Backend Engineer").getByRole("button", { name: "Drag to resume" });
  const gripBox = (await grip.boundingBox())!;
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  const x = targetBox.x + targetBox.width / 2;
  const midpoint = targetBox.y + targetBox.height / 2;
  await page.mouse.move(x, midpoint - 2, { steps: 20 });
  await expect(page.locator(".resume-drop-placeholder")).toHaveCount(1);
  for (const offset of [2, -2, 3, -3, 1]) {
    await page.mouse.move(x, midpoint + offset, { steps: 5 });
    // Let layout measurements and animations settle at each boundary.
    await expect(page.locator(".resume-drop-placeholder")).toHaveCount(1);
  }
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.locator(".resume-drop-placeholder")).toHaveCount(0);
  await expect(target).toBeVisible();
  expect(errors).toEqual([]);
  await expect(page.locator("[data-canvas-block-id]")).toHaveCount(1);

  const start = (await grip.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, midpoint + 2, { steps: 20 });
  await expect(page.locator(".resume-drop-placeholder")).toHaveCount(1);
  await page.mouse.up();
  await expect(page.locator("[data-canvas-block-id]")).toHaveCount(2);
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("[data-canvas-block-id]")).toHaveCount(1);
  expect(errors).toEqual([]);
});
