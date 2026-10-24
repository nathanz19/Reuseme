import { expect, test } from "@playwright/test";
import { openApp, spaceMeter, vaultCard } from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("loads the seeded vault and default preset", async ({ page }) => {
  await expect(page).toHaveTitle(/Reuseme/);
  await expect(page.getByLabel("Resume preset")).toHaveValue("frontend-swe");
  await expect(page.getByLabel("Template")).toHaveValue("classic-ats");
  await expect(spaceMeter(page)).toHaveText("Space 46/45");
  await expect(
    page.getByRole("button", { name: /^Work Experience/ }),
  ).toHaveAttribute("aria-expanded", "true");
  await expect(vaultCard(page, "Software Engineer")).toContainText("On resume");
});

test("search hides archived blocks until they are included", async ({
  page,
}) => {
  const search = page.getByPlaceholder("Search vault…");
  await search.fill("raft");
  await expect(vaultCard(page, "Distributed Systems Engineer")).toHaveCount(0);

  await page.getByLabel("Include Archived").check();
  const archived = vaultCard(page, "Distributed Systems Engineer");
  await expect(archived).toBeVisible();
  await expect(archived).toContainText("Archived");
});

test("tag filters narrow the vault and collapse empty categories", async ({
  page,
}) => {
  await page
    .getByRole("list", { name: "Filter by tag" })
    .getByRole("button", { name: "kafka", exact: true })
    .click();

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
