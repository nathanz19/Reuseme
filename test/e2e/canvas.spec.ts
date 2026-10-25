import { expect, test } from "@playwright/test";
import { SEED_BLOCKS } from "@/data/seed";
import { canvasBlock, hoverClick, openApp, spaceMeter, vaultCard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("block dates sit on the title row, right-aligned at the title's inset", async ({ page }) => {
  for (const template of ["classic-ats", "modern-tech"]) {
    await page.getByLabel("Template").selectOption(template);
    const ids = await page.locator("[data-canvas-block-id]").evaluateAll((blocks) =>
      blocks.map((block) => block.getAttribute("data-canvas-block-id")!),
    );
    const dateEdges: number[] = [];
    for (const id of ids) {
      const { title, startDate, endDate } = SEED_BLOCKS.find((block) => block.id === id)!;
      const block = canvasBlock(page, id);
      const card = (await block.boundingBox())!;
      const heading = (await block.getByText(title, { exact: true }).boundingBox())!;
      const dates = (await block.getByText(`${startDate} – ${endDate}`, { exact: true }).boundingBox())!;
      expect(Math.abs(dates.y - heading.y), `${id} date row`).toBeLessThan(1);
      const titleInset = heading.x - card.x;
      const dateInset = card.x + card.width - (dates.x + dates.width);
      expect(Math.abs(dateInset - titleInset), `${id} insets`).toBeLessThan(1);
      dateEdges.push(dates.x + dates.width);
    }
    // The over-budget flag's thicker border moves its date in by 1px.
    expect(Math.max(...dateEdges) - Math.min(...dateEdges)).toBeLessThanOrEqual(1);
  }
});

test("remove, undo, redo, and re-add blocks on the canvas", async ({
  page,
}) => {
  const clinicForms = canvasBlock(page, "proj-4");
  await hoverClick(clinicForms, "Remove from resume");
  await expect(clinicForms).toHaveCount(0);
  await expect(page.getByText("Suggested to cut for space")).toHaveCount(0);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(clinicForms).toBeVisible();
  await page.getByRole("button", { name: "Redo" }).click();
  await expect(clinicForms).toHaveCount(0);

  await hoverClick(canvasBlock(page, "lead-4"), "Remove from resume");
  const card = vaultCard(page, "Clinic Forms Kit");
  await card.getByRole("button", { name: "Add to Resume" }).click();
  await expect(clinicForms).toBeVisible();
  await expect(card.getByRole("button", { name: "On resume" })).toBeDisabled();
});

test("canvas edits persist across a reload", async ({ page }) => {
  await hoverClick(canvasBlock(page, "proj-4"), "Remove from resume");
  await expect(spaceMeter(page)).not.toHaveText("Space 46/45");
  const meterAfterRemove = await spaceMeter(page).textContent();

  await page.reload();
  await expect(page.locator("#resume-print-root")).toBeVisible();
  await expect(canvasBlock(page, "proj-4")).toHaveCount(0);
  await expect(spaceMeter(page)).toHaveText(meterAfterRemove!);
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
});

test("document tabs, templates, and new documents switch the canvas", async ({
  page,
}) => {
  await page.getByRole("tab", { name: "Systems Eng", exact: true }).click();
  await expect(page.getByLabel("Template")).toHaveValue("modern-tech");
  await expect(canvasBlock(page, "exp-2")).toBeVisible();
  await expect(canvasBlock(page, "exp-1")).toHaveCount(0);

  await page.getByLabel("Template").selectOption("classic-ats");
  await page.getByRole("button", { name: "New document", exact: true }).click();
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Untitled document 3");
  await expect(page.locator("[data-canvas-block-id]")).toHaveCount(0);
  await page.getByRole("tab", { name: "Systems Eng", exact: true }).click();
  await expect(canvasBlock(page, "exp-2")).toBeVisible();
  await expect(page.getByLabel("Template")).toHaveValue("classic-ats");
});

test("header edits update the resume", async ({ page }) => {
  // Make room before exercising the contact editor.
  await hoverClick(canvasBlock(page, "proj-4"), "Remove from resume");
  const root = page.locator("#resume-print-root");
  await root.locator("header").hover();
  await root.getByRole("button", { name: "Edit Contact Information" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Contact Information" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Full name").fill("Ada Lovelace");
  // The modal must remain clickable after the pointer leaves the header controls.
  await page.mouse.move(5, 5);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(root.getByRole("heading", { level: 1 })).toHaveText(
    "Ada Lovelace",
  );
});


test("skills can be edited from the canvas hover controls and undone", async ({ page }) => {
  const skills = page.getByRole("region", { name: "Resume skills", exact: true });
  await skills.hover();
  await skills.getByRole("button", { name: "Edit Skills & Interests", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Edit Skills & Interests", exact: true });
  const field = dialog.getByRole("textbox");
  await expect(field).toHaveValue(/React/);
  await field.fill("Python, SQL");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(skills.locator("p")).toHaveText("Python, SQL");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(skills.locator("p")).toContainText("React");
});


test("tabs support pencil and double-click renaming, closing, and undo", async ({ page }) => {
  await page.getByRole("button", { name: "Rename Frontend SWE", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Document name", exact: true });
  await name.fill("My frontend resume");
  await name.press("Enter");
  const tab = page.getByRole("tab", { name: "My frontend resume", exact: true });
  await expect(tab).toHaveAttribute("aria-selected", "true");
  await tab.dblclick();
  await name.fill("Cancelled name");
  await name.press("Escape");
  await expect(tab).toBeVisible();
  await tab.dblclick();
  await name.fill("Final resume");
  await name.press("Enter");
  await page.reload();
  await expect(page.getByRole("tab", { name: "Final resume", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Close Final resume", exact: true }).click();
  const confirmation = page.getByRole("dialog", { name: "Delete document?", exact: true });
  await expect(confirmation).toContainText("You can undo this");
  await confirmation.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Final resume", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close Final resume", exact: true }).click();
  await confirmation.getByRole("button", { name: "Delete document", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Final resume", exact: true })).toHaveCount(0);
  await expect(page.getByRole("tab", { name: "Systems Eng", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Undo", exact: true }).click();
  await expect(page.getByRole("tab", { name: "Final resume", exact: true })).toHaveAttribute("aria-selected", "true");
});


test("document tabs drag horizontally, preserve selection, and persist order", async ({ page }) => {
  await page.getByRole("button", { name: "New document", exact: true }).click();
  const first = page.getByRole("tab", { name: "Frontend SWE", exact: true });
  const second = page.getByRole("tab", { name: "Systems Eng", exact: true });
  const start = (await first.boundingBox())!;
  const destination = (await second.boundingBox())!;
  await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
  await page.mouse.down();
  await page.mouse.move(destination.x + destination.width / 2, start.y + start.height / 2 + 60, { steps: 20 });
  const during = (await first.boundingBox())!;
  expect(Math.abs(during.y - start.y)).toBeLessThan(1);
  await page.mouse.up();
  await expect(page.getByRole("tab")).toHaveText(["Systems Eng", "Frontend SWE", "Untitled document 3"]);
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Untitled document 3");
  await page.reload();
  await expect(page.getByRole("tab")).toHaveText(["Systems Eng", "Frontend SWE", "Untitled document 3"]);
  await expect(page.getByRole("tab", { selected: true })).toHaveText("Untitled document 3");
});
