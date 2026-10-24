import { expect, test } from "@playwright/test";
import { canvasBlock, hoverClick, openApp, spaceMeter, vaultCard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("flags the over-budget seed preset and blocks adds", async ({ page }) => {
  await expect(page.getByText("Suggested to cut for space")).toBeVisible();
  await expect(
    vaultCard(page, "Backend Engineer").getByRole("button", {
      name: "Cannot fit",
    }),
  ).toBeDisabled();
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

test("presets, templates, and new versions switch the canvas", async ({
  page,
}) => {
  const preset = page.getByLabel("Resume preset");
  await preset.selectOption("systems-eng");
  await expect(page.getByLabel("Template")).toHaveValue("modern-tech");
  await expect(canvasBlock(page, "exp-2")).toBeVisible();
  await expect(canvasBlock(page, "exp-1")).toHaveCount(0);

  await page.getByLabel("Template").selectOption("classic-ats");
  await page.getByRole("button", { name: "New version" }).click();
  await expect(preset.locator("option:checked")).toHaveText(
    "Systems Eng (copy)",
  );
  await expect(page.getByLabel("Template")).toHaveValue("classic-ats");
});

test("header edits update the resume", async ({ page }) => {
  // Any canvas change is refused while the seed preset is over budget.
  await hoverClick(canvasBlock(page, "proj-4"), "Remove from resume");
  const root = page.locator("#resume-print-root");
  await root.getByRole("button", { name: "Edit Contact Information" }).click({ force: true });
  await page.getByLabel("Full name").fill("Ada Lovelace");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(root.getByRole("heading", { level: 1 })).toHaveText(
    "Ada Lovelace",
  );
});
