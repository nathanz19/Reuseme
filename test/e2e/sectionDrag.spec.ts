import { expect, test, type Page } from "@playwright/test";
import { openApp } from "./helpers";

test.use({ reducedMotion: "no-preference" });

function sectionOrder(page: Page) {
  return page
    .locator("#resume-print-root [data-resume-section]")
    .evaluateAll((sections) => sections.map((section) => section.getAttribute("data-resume-section")));
}

function sectionGrip(page: Page, label: string) {
  return page.getByRole("button", { name: `Drag ${label} section`, exact: true });
}

test("dragging a section's grip moves the whole section, and undo restores it", async ({ page }) => {
  await openApp(page);
  const before = await sectionOrder(page);
  expect(before.indexOf("experience")).toBeLessThan(before.indexOf("project"));

  const experience = page.locator('[data-resume-section="experience"]');
  const projects = page.locator('[data-resume-section="project"]');
  await projects.hover();
  const grip = sectionGrip(page, "Projects");
  await expect(grip).toBeVisible();
  const gripBox = (await grip.boundingBox())!;
  const targetBox = (await experience.boundingBox())!;
  // Approach the grip gradually across the margin, as a person would.
  await page.mouse.move(gripBox.x + 120, gripBox.y + gripBox.height / 2);
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2, { steps: 15 });
  await expect(grip).toHaveCSS("opacity", "1");
  await page.mouse.down();
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y - 10, { steps: 4 });
  await page.mouse.move(gripBox.x + gripBox.width / 2, targetBox.y + 4, { steps: 20 });
  await page.waitForTimeout(250);

  // The section stays in the page as a hidden skeleton that reaches equally into
  // both page margins to hold its grip, while an elevated copy follows the pointer.
  const skeleton = page.locator('[data-resume-section="project"][data-dragging="true"]');
  const overlay = page.locator("[data-dragging]:not([data-resume-section])");
  await expect(skeleton).toBeVisible();
  await expect(skeleton.locator("> div")).toHaveCSS("visibility", "hidden");
  await expect(overlay).toContainText("Projects");
  const layout = await skeleton.evaluate((section) => {
    const box = (element: Element) => element.getBoundingClientRect();
    const sheet = box(section.closest("#resume-print-root")!);
    const shell = box(section);
    return {
      margins: [shell.left - sheet.left, sheet.right - shell.right],
      shellLeft: shell.left,
      grip: box(section.querySelector(".resume-section-handle")!),
      headingLeft: box(section.querySelector("h2")!).left,
    };
  });
  expect(Math.abs(layout.margins[0] - layout.margins[1])).toBeLessThan(1);
  expect(layout.grip.left).toBeGreaterThanOrEqual(layout.shellLeft);
  expect(layout.grip.right).toBeLessThanOrEqual(layout.headingLeft);
  const overlayStart = (await overlay.boundingBox())!;
  await page.mouse.move(gripBox.x + gripBox.width / 2 + 30, targetBox.y + 44, { steps: 5 });
  await expect.poll(async () => {
    const moved = (await overlay.boundingBox())!;
    return [Math.round(moved.x - overlayStart.x), Math.round(moved.y - overlayStart.y)];
  }).toEqual([30, 40]);
  await page.mouse.move(gripBox.x + gripBox.width / 2, targetBox.y + 4, { steps: 5 });
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

  await sectionGrip(page, "Projects").focus();
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

test("the header stays pinned at the top and has no section grip", async ({ page }) => {
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
  await first.hover();
  const grip = first.getByRole("button", { name: /^Drag .* section$/ });
  const gripBox = (await grip.boundingBox())!;
  const headerBox = (await header.boundingBox())!;
  await page.mouse.move(gripBox.x + gripBox.width / 2, gripBox.y + gripBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(gripBox.x + gripBox.width / 2, headerBox.y, { steps: 20 });
  await page.mouse.up();
  await expect(page.locator("#resume-print-root [data-resume-section]").first()).toHaveAttribute(
    "data-resume-section",
    firstId!,
  );
  const firstBox = (await page.locator("#resume-print-root [data-resume-section]").first().boundingBox())!;
  expect(firstBox.y).toBeGreaterThan(headerBox.y + headerBox.height - 1);
  await expect(page.getByRole("button", { name: "Undo", exact: true })).toBeDisabled();
});
