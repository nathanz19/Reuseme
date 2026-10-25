import { expect, test } from "./test";
import { analyzeDemoJd, canvasBlock, hoverClick, openApp, rankedCard, spaceMeter, vaultCard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("loads the seeded vault and the over-budget default preset", async ({ page }) => {
  await expect(page).toHaveTitle(/Reuseme/);
  await expect(page.getByRole("tab", { name: "Frontend SWE", exact: true })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByLabel("Template")).toHaveValue("classic-ats");
  await expect(spaceMeter(page)).toHaveText("Space 55/49");
  await expect(page.getByText("Suggested to cut for space")).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Work Experience/ }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(vaultCard(page, "Software Engineer")).toContainText("On resume");
  await expect(
    vaultCard(page, "Backend Engineer").getByRole("button", { name: "Cannot fit" }),
  ).toBeDisabled();
});

test("search hides archived blocks until they are included", async ({
  page,
}) => {
  const search = page.getByPlaceholder("Search vault…");
  await search.fill("raft");
  await expect(vaultCard(page, "Distributed Systems Engineer")).toHaveCount(0);

  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByLabel("Include Archived").check();
  await page.getByRole("button", { name: "Close filters", exact: true }).click();
  const archived = vaultCard(page, "Distributed Systems Engineer");
  await expect(archived).toBeVisible();
  await expect(archived).toContainText("Archived");
});

test("tag filters narrow the vault and collapse empty categories", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("button", { name: "Add filter", exact: true }).click();
  await page.getByRole("button", { name: "Tags", exact: true }).click();
  await page.getByLabel("Add tag filter", { exact: true }).selectOption("kafka");
  await page.getByRole("button", { name: "Close filters", exact: true }).click();

  await expect(vaultCard(page, "Backend Engineer")).toBeVisible();
  await expect(vaultCard(page, "Software Engineer")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^Contact Information/ }),
  ).toHaveAttribute("aria-expanded", "false");
});

test("expanding a card reveals the raw source notes", async ({ page }) => {
  const card = vaultCard(page, "Backend Engineer");
  await expect(card.getByText(/Cutover used dual-write 72h/)).toHaveCount(0);
  await card.getByRole("button", { expanded: false }).last().click();
  await expect(card.getByText(/Cutover used dual-write 72h/)).toBeVisible();
});

test("saves a new entry to the vault even when the resume is full", async ({ page }) => {
  const before = await spaceMeter(page).textContent();
  await page.getByRole("button", { name: "Add to Awards & Scholarships", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Add Awards & Scholarships" });
  await dialog.getByLabel("Title", { exact: true }).fill("Dean's List");
  await dialog.getByLabel("Company or organization").fill("Example Organization");
  await dialog.getByLabel("Description", { exact: false }).fill("A detailed achievement saved for a future resume.");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  const card = vaultCard(page, "Dean's List");
  await expect(card).toBeVisible();
  await expect(card.getByRole("button", { name: "Cannot fit", exact: true })).toBeDisabled();
  await expect(page.locator("#resume-print-root")).not.toContainText("Dean's List");
  await expect(spaceMeter(page)).toHaveText(before!);
});

test("editing a vault entry updates every document, and deleting it asks first", async ({ page }) => {
  await hoverClick(canvasBlock(page, "edu-1"), "Edit block");
  const dialog = page.getByRole("dialog", { name: "Edit Education", exact: true });
  await dialog.getByLabel("Degree or qualification").fill("B.S. Computer Engineering");
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(canvasBlock(page, "edu-1")).toContainText("B.S. Computer Engineering");
  await page.getByRole("tab", { name: "Systems Eng", exact: true }).click();
  await expect(canvasBlock(page, "edu-1")).toContainText("B.S. Computer Engineering");

  const card = vaultCard(page, "B.S. Computer Engineering");
  page.once("dialog", (confirm) => confirm.dismiss());
  await hoverClick(card, "Delete block");
  await expect(card).toBeVisible();
  await expect(canvasBlock(page, "edu-1")).toBeVisible();

  let message = "";
  page.once("dialog", (confirm) => {
    message = confirm.message();
    return confirm.accept();
  });
  await hoverClick(card, "Delete block");
  expect(message).toContain("every resume version");
  await expect(card).toHaveCount(0);
  await expect(canvasBlock(page, "edu-1")).toHaveCount(0);
  await page.getByRole("tab", { name: "Frontend SWE", exact: true }).click();
  await expect(canvasBlock(page, "edu-1")).toHaveCount(0);
});


test("compact filters combine section and date and can be cleared", async ({ page }) => {
  await expect(page.getByRole("dialog", { name: "Vault filters" })).toHaveCount(0);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await page.getByRole("button", { name: "Add filter", exact: true }).click();
  await page.getByRole("button", { name: "Sections", exact: true }).click();
  await page.getByLabel("Add section filter", { exact: true }).selectOption("project");
  await page.getByRole("button", { name: "Add filter", exact: true }).click();
  await page.getByRole("button", { name: "Date", exact: true }).click();
  await page.getByLabel("Date from", { exact: true }).fill("2024-01");
  await page.getByLabel("Date to", { exact: true }).fill("2024-12");
  await page.getByRole("button", { name: "Close filters", exact: true }).click();
  await expect(page.getByRole("button", { name: /^Filters/ })).toBeVisible();
  await expect(vaultCard(page, "Open Transit Map")).toBeVisible();
  await expect(vaultCard(page, "Backend Engineer")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Contact Information/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^Filters/ }).click();
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Filters", exact: true })).toBeVisible();
  await expect(vaultCard(page, "Backend Engineer")).toBeVisible();
});

const contentHeight = (page: import("@playwright/test").Page) =>
  page.locator("#resume-print-root [data-resume-content]").evaluate((el) => el.getBoundingClientRect().height);

test("vault cards show how much space adding each block takes, matching the real change", async ({ page }) => {
  // Free enough room that the block fits again.
  for (const id of ["proj-4", "lead-4"]) await hoverClick(canvasBlock(page, id), "Remove from resume");
  const card = vaultCard(page, "Clinic Forms Kit");
  const badge = card.locator("[data-add-cost]");
  await expect(badge).toHaveText(/^\+\d+ lines?$/);
  // A block already on the resume shows no cost.
  await expect(vaultCard(page, "Software Engineer").locator("[data-add-cost]")).toHaveCount(0);

  const title = (await badge.getAttribute("title"))!;
  const px = Number(/about (\d+)px/.exec(title)![1]);
  const before = await contentHeight(page);
  await card.getByRole("button", { name: "Add to Resume" }).click();
  await expect(canvasBlock(page, "proj-4")).toBeVisible();
  await expect.poll(async () => Math.abs((await contentHeight(page)) - before - px)).toBeLessThanOrEqual(1);
  await expect(card.locator("[data-add-cost]")).toHaveCount(0);
});

test("ranked cards show the add cost, except for blocks already on the resume", async ({ page }) => {
  await analyzeDemoJd(page);
  const ranked = rankedCard(page, "proj-2");
  await expect(ranked.locator("[data-add-cost]")).toHaveText(/^\+\d+ lines?$/);
  await expect(ranked.locator("[data-add-cost]")).toHaveAttribute("title", /^Adds about \d+px/);
  await expect(rankedCard(page, "exp-1").locator("[data-add-cost]")).toHaveCount(0);
});
