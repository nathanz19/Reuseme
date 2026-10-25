import { expect, test } from "@playwright/test";
import { canvasBlock, hoverClick, openApp, vaultCard } from "./helpers";

test.use({ reducedMotion: "no-preference" });

test("vault drag outlines the valid section and the skeleton follows the pointer", async ({ page }) => {
  await openApp(page);
  for (const id of ["cert-3", "proj-4", "lead-4"]) {
    await hoverClick(canvasBlock(page, id), "Remove from resume");
  }
  const grip = vaultCard(page, "Backend Engineer").getByRole("button", { name: "Drag to resume" });
  // A scrolled vault list used to offset the skeleton from the pointer.
  await grip.scrollIntoViewIfNeeded();
  const last = canvasBlock(page, "exp-3");
  await last.scrollIntoViewIfNeeded();
  const gripBox = (await grip.boundingBox())!;
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + 20, gripBox.y + 4, { steps: 4 });

  const targets = page.locator(".resume-drop-target");
  await expect(targets).toHaveCount(1);
  await expect(targets).toContainText("Experience");

  const lastBox = (await last.boundingBox())!;
  await page.mouse.move(lastBox.x + lastBox.width / 2, lastBox.y + lastBox.height - 8, { steps: 20 });
  const placeholder = page.locator(".resume-drop-placeholder");
  await expect(placeholder).toHaveCount(1);
  await expect
    .poll(() => placeholder.evaluate((el) => el.nextElementSibling === null))
    .toBe(true);

  await page.mouse.up();
  await expect(targets).toHaveCount(0);
  const experienceIds = await page
    .locator('[data-canvas-block-id^="exp-"]')
    .evaluateAll((blocks) => blocks.map((block) => block.getAttribute("data-canvas-block-id")));
  expect(experienceIds).toEqual(["exp-1", "exp-3", "exp-2"]);
  await page.waitForTimeout(600);
  await expect(page.locator(".resume-drop-placeholder")).toHaveCount(0);
  await expect(page.locator("section .bg-slate-200")).toHaveCount(0);
});

test("dropping into an emptied section leaves no skeleton behind", async ({ page }) => {
  await openApp(page);
  for (const id of ["exp-1", "exp-3", "cert-3"]) {
    await hoverClick(canvasBlock(page, id), "Remove from resume");
  }
  const grip = vaultCard(page, "Backend Engineer").getByRole("button", { name: "Drag to resume" });
  await grip.scrollIntoViewIfNeeded();
  const gripBox = (await grip.boundingBox())!;
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + 20, gripBox.y + 4, { steps: 4 });
  const section = page.locator(".resume-drop-target");
  await expect(section).toContainText("Experience");
  const box = (await section.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 20 });
  await page.waitForTimeout(300);
  await page.mouse.up();
  await expect(canvasBlock(page, "exp-2")).toBeVisible();
  await page.waitForTimeout(600);
  await expect(page.locator(".resume-drop-placeholder")).toHaveCount(0);
  await expect(page.locator("section .bg-slate-200")).toHaveCount(0);
});

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
  // Wait for the landing overlay to release the card before clicking toolbar controls.
  await expect(canvasBlock(page, "exp-2")).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.locator("[data-canvas-block-id]")).toHaveCount(1);
  expect(errors).toEqual([]);
});
