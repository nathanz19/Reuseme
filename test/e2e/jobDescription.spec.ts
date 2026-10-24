import { expect, test } from "@playwright/test";
import {
  analyzeDemoJd,
  canvasBlock,
  hoverClick,
  openApp,
  rankedCard,
  vaultCard,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("analyzing the demo JD shows required skill chips and a status line", async ({
  page,
}) => {
  await analyzeDemoJd(page);
  await expect(page.getByText("7 of 9 covered")).toBeVisible();
  await expect(
    page.getByText("Ranked 8 vault entries against 9 required skills."),
  ).toBeVisible();

  const missing = page.locator('[data-skill-state="missing"]');
  await expect(missing).toHaveText([/Docker/, /Kubernetes/]);
  await expect(missing.first()).toHaveClass(/border-dashed/);
  await expect(page.locator('[data-skill-state="covered"]')).toHaveCount(7);

  await page.getByRole("button", { name: "Vault", exact: true }).first().click();
  await expect(vaultCard(page, "Backend Engineer")).toContainText(
    "Go microservices background",
  );
});

test("analyze shows a disabled spinner button while the match request runs", async ({
  page,
}) => {
  let release: () => void = () => {};
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/jd/match", async (route) => {
    await gate;
    await route.continue();
  });

  await page.getByRole("button", { name: "Job Description" }).click();
  const analyze = page.getByRole("button", { name: "Analyze & Rank Vault" });
  await analyze.click();
  await expect(analyze).toBeDisabled();
  await expect(page.locator("[data-ranked-block-id]")).toHaveCount(0);

  release();
  await expect(analyze).toBeEnabled();
  await expect(page.locator("[data-ranked-block-id]")).toHaveCount(8);
});

test("the required skills section collapses to give the ranked list more space", async ({
  page,
}) => {
  await analyzeDemoJd(page);
  const toggle = page.getByRole("button", { name: /Required skills/ });
  const list = page.getByLabel("Ranked vault").locator("ol");
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('[data-skill-state="covered"]').first()).toBeVisible();
  const before = (await list.boundingBox())!.height;

  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator("[data-skill-state]").first()).toBeHidden();
  await expect(page.getByText("7 of 9 covered")).toBeVisible();
  expect((await list.boundingBox())!.height).toBeGreaterThan(before);

  await toggle.click();
  await expect(page.locator('[data-skill-state="covered"]').first()).toBeVisible();
});

test("the ranked vault lists 8 numbered non-archived cards, best first", async ({
  page,
}) => {
  await analyzeDemoJd(page);

  const cards = page.locator("[data-ranked-block-id]");
  await expect(cards).toHaveCount(8);
  const ids = await cards.evaluateAll((nodes) =>
    nodes.map((n) => n.getAttribute("data-ranked-block-id")),
  );
  expect(ids).toEqual([
    "proj-2",
    "exp-4",
    "proj-1",
    "exp-3",
    "lead-2",
    "exp-1",
    "exp-2",
    "proj-6",
  ]);
  for (const archived of ["exp-6", "exp-7", "proj-7", "proj-8", "proj-9"]) {
    await expect(rankedCard(page, archived)).toHaveCount(0);
  }
  await expect(page.getByText("Forgotten experience")).toHaveCount(0);

  for (let rank = 1; rank <= 8; rank++) {
    await expect(cards.nth(rank - 1).getByLabel(`Rank ${rank}`)).toBeVisible();
  }
  await expect(page.getByText("Score, high to low")).toBeVisible();

  const first = rankedCard(page, "proj-2");
  await expect(first).toContainText("74");
  await expect(first).toContainText("PARTIAL");
  await expect(first).toContainText("Not on resume");
  await expect(rankedCard(page, "exp-1")).toContainText("On resume");
});

test("adding a ranked card fades it in place and removing it restores it", async ({
  page,
}) => {
  // Free enough room that a ranked card fits on the one-page budget.
  for (const id of ["proj-4", "lead-1", "lead-4"]) {
    await hoverClick(canvasBlock(page, id), "Remove from resume");
    await expect(canvasBlock(page, id)).toHaveCount(0);
  }
  await analyzeDemoJd(page);

  const card = rankedCard(page, "proj-2");
  await expect(card).toHaveAttribute("data-on-resume", "false");
  await expect(card).toHaveCSS("opacity", "1");

  await card.hover();
  await card.getByRole("button", { name: "Add to Resume" }).click();
  await expect(canvasBlock(page, "proj-2")).toBeVisible();

  await expect(card).toHaveAttribute("data-on-resume", "true");
  await expect(card).toHaveCSS("opacity", "0.5");
  await expect(card).toContainText("On resume");
  await expect(
    page.locator("[data-ranked-block-id]").first(),
  ).toHaveAttribute("data-ranked-block-id", "proj-2");
  await expect(card.getByRole("button", { name: "Add to Resume" })).toBeDisabled();
  await expect(card.getByRole("button", { name: "Drag to resume" })).toBeDisabled();

  await hoverClick(canvasBlock(page, "proj-2"), "Remove from resume");
  await expect(card).toHaveAttribute("data-on-resume", "false");
  await expect(card).toHaveCSS("opacity", "1");
  await expect(card).toContainText("Not on resume");
});

test("a failed match keeps the previous rankings", async ({ page }) => {
  await analyzeDemoJd(page);
  const textarea = page.getByPlaceholder("Paste job description…");
  await textarea.fill(`${await textarea.inputValue()}\n__FIXTURE_MATCH_FAIL__`);
  await page.getByRole("button", { name: "Analyze & Rank Vault" }).click();

  await expect(page.getByText(/simulated API error/)).toBeVisible();
  await expect(page.getByText("7 of 9 covered")).toBeVisible();
});

test("accepting a tailored bullet updates only the canvas and is undoable", async ({
  page,
}) => {
  await hoverClick(canvasBlock(page, "proj-4"), "Remove from resume");
  await analyzeDemoJd(page);

  const block = canvasBlock(page, "exp-1");
  const original = "Built React dashboards consumed by 40k monthly active analysts.";
  await expect(block).toContainText(original);
  await hoverClick(block, "Tailor bullet");

  const dialog = page.getByRole("dialog", { name: "Tailor bullet" });
  await expect(dialog.getByRole("button", { name: "Accept" })).toBeVisible();
  await expect(dialog.getByText("not in your notes: Kubernetes")).toBeVisible();
  await dialog.getByRole("button", { name: "Concise" }).click();
  await dialog.getByRole("button", { name: "Accept" }).click();
  await expect(dialog).toHaveCount(0);

  await expect(block).toContainText("Led Raft-based metadata service");
  await expect(block).not.toContainText(original);

  await page.getByRole("button", { name: "Undo" }).click();
  await expect(block).toContainText(original);
});

test("rejecting a tailored bullet leaves the canvas unchanged", async ({
  page,
}) => {
  await analyzeDemoJd(page);
  const block = canvasBlock(page, "exp-1");
  await hoverClick(block, "Tailor bullet");
  const dialog = page.getByRole("dialog", { name: "Tailor bullet" });
  await dialog.getByRole("button", { name: "Reject" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(block).toContainText("Built React dashboards");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
});
