import { expect, test, type Page } from "@playwright/test";
import { openApp } from "./helpers";

test.use({ reducedMotion: "no-preference" });

function sectionOrder(page: Page) {
  return page
    .locator("#resume-print-root [data-resume-section]")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-resume-section")));
}

function sectionHandle(page: Page, label: string) {
  return page.getByRole("button", { name: `Drag ${label} section`, exact: true });
}

test("dragging a section by its heading moves the whole section, and undo restores it", async ({ page }) => {
  await openApp(page);
  const before = await sectionOrder(page);
  expect(before.indexOf("experience")).toBeLessThan(before.indexOf("project"));

  const experience = page.locator('[data-resume-section="experience"]');
  const projects = page.locator('[data-resume-section="project"]');
  const fromBox = (await projects.getByRole("heading").first().boundingBox())!;
  const targetBox = (await experience.boundingBox())!;
  const x = fromBox.x + 40;
  await page.mouse.move(x, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, fromBox.y - 10, { steps: 4 });
  await page.mouse.move(x, targetBox.y + 4, { steps: 20 });
  await page.waitForTimeout(250);

  // The section stays in the page as a hidden skeleton that reaches equally into
  // both page margins, while an elevated copy follows the pointer.
  const skeleton = page.locator('[data-resume-section="project"][data-dragging="true"]');
  const overlay = page.locator("[data-dragging]:not([data-resume-section])");
  await expect(skeleton).toBeVisible();
  await expect(skeleton.locator("[data-section-content]")).toHaveCSS("visibility", "hidden");
  await expect(overlay).toContainText("Projects");
  const layout = await skeleton.evaluate((section) => {
    const box = (element: Element) => element.getBoundingClientRect();
    const sheet = box(section.closest("#resume-print-root")!);
    const shell = box(section);
    const heading = box(section.querySelector("h2")!);
    return {
      margins: [shell.left - sheet.left, sheet.right - shell.right],
      gutters: [heading.left - shell.left, shell.right - heading.right],
    };
  });
  expect(Math.abs(layout.margins[0] - layout.margins[1])).toBeLessThan(1);
  expect(layout.gutters[0]).toBeGreaterThan(0);
  expect(Math.abs(layout.gutters[0] - layout.gutters[1])).toBeLessThan(1);
  const overlayStart = (await overlay.boundingBox())!;
  await page.mouse.move(x + 30, targetBox.y + 44, { steps: 5 });
  await expect.poll(async () => {
    const moved = (await overlay.boundingBox())!;
    return [Math.round(moved.x - overlayStart.x), Math.round(moved.y - overlayStart.y)];
  }).toEqual([30, 40]);
  await page.mouse.move(x, targetBox.y + 4, { steps: 5 });
  await page.waitForTimeout(250);
  await page.mouse.up();
  await expect(page.locator("[data-dragging]")).toHaveCount(0);

  await expect.poll(() => sectionOrder(page)).not.toEqual(before);
  const after = await sectionOrder(page);
  expect(after.indexOf("project")).toBeLessThan(after.indexOf("experience"));
  expect([...after].sort()).toEqual([...before].sort());
  // Blocks travel with their section.
  await expect(projects.locator("[data-canvas-block-id]").first()).toHaveAttribute(
    "data-canvas-block-id",
    /^proj-/,
  );

  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect.poll(() => sectionOrder(page)).toEqual(before);
});

test("sections reorder from the keyboard and the order survives a reload", async ({ page }) => {
  await openApp(page);
  const before = await sectionOrder(page);
  const projectIndex = before.indexOf("project");
  expect(projectIndex).toBeGreaterThan(0);

  const projects = page.locator('[data-resume-section="project"]');
  await page.keyboard.press("Tab");
  await sectionHandle(page, "Projects").focus();
  await expect(projects).toHaveCSS("outline-style", "solid");
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(250);
  await page.keyboard.press("Space");

  const expected = [...before];
  expected.splice(projectIndex, 1);
  expected.splice(projectIndex - 1, 0, "project");
  await expect.poll(() => sectionOrder(page)).toEqual(expected);

  await page.reload();
  await expect(page.locator("#resume-print-root")).toBeVisible();
  await expect.poll(() => sectionOrder(page)).toEqual(expected);
});

test("the header stays pinned at the top and has no section handle", async ({ page }) => {
  await openApp(page);
  const header = page.locator("#resume-print-root header");
  await header.hover();
  expect(
    await header.evaluate((node) => node.closest("[data-resume-section]") === null),
  ).toBe(true);
  await expect(page.getByRole("button", { name: /^Drag .*Contact.* section$/ })).toHaveCount(0);

  // Dropping the first section above the header still leaves it below the header.
  const first = page.locator("#resume-print-root [data-resume-section]").first();
  const firstId = await first.getAttribute("data-resume-section");
  const fromBox = (await first.getByRole("heading").first().boundingBox())!;
  const headerBox = (await header.boundingBox())!;
  const x = fromBox.x + 40;
  await page.mouse.move(x, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, headerBox.y, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator("#resume-print-root [data-resume-section]").first()).toHaveAttribute(
    "data-resume-section",
    firstId!,
  );
  const firstBox = (await page.locator("#resume-print-root [data-resume-section]").first().boundingBox())!;
  expect(firstBox.y).toBeGreaterThan(headerBox.y + headerBox.height - 1);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
});

test("pressing inside a block drags the block, not its section", async ({ page }) => {
  await openApp(page);
  const before = await sectionOrder(page);
  const experience = page.locator('[data-resume-section="experience"]');
  const blocks = experience.locator("[data-canvas-block-id]");
  const blockIds = () => blocks.evaluateAll((els) => els.map((el) => el.getAttribute("data-canvas-block-id")));
  const blocksBefore = await blockIds();

  const fromBox = (await blocks.nth(1).locator("li").first().boundingBox())!;
  const toBox = (await blocks.first().boundingBox())!;
  const x = fromBox.x + 40;
  await page.mouse.move(x, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(x, fromBox.y - 10, { steps: 4 });
  await page.mouse.move(x, toBox.y + 4, { steps: 20 });
  await page.waitForTimeout(250);
  await page.mouse.up();

  await expect.poll(blockIds).toEqual([blocksBefore[1], blocksBefore[0], ...blocksBefore.slice(2)]);
  expect(await sectionOrder(page)).toEqual(before);
});
