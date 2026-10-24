import { expect, test } from "@playwright/test";
import {
  analyzeDemoJd,
  canvasBlock,
  hoverClick,
  openApp,
  vaultCard,
} from "./helpers";

test.beforeEach(async ({ page }) => {
  await openApp(page);
});

test("analyzing the demo JD shows coverage and forgotten experience", async ({
  page,
}) => {
  await analyzeDemoJd(page);
  await expect(page.getByText("78%")).toBeVisible();
  await expect(page.getByText("Missing: Docker, Kubernetes")).toBeVisible();

  const forgotten = page.locator("li").filter({
    hasText: "Distributed Systems Engineer · Orbit State Labs",
  });
  await expect(forgotten).toContainText("Score 76");

  await page.getByRole("button", { name: "Vault", exact: true }).first().click();
  await expect(vaultCard(page, "Backend Engineer")).toContainText(
    "Go microservices background",
  );
});

test("a failed match keeps the previous rankings", async ({ page }) => {
  await analyzeDemoJd(page);
  const textarea = page.getByPlaceholder("Paste job description…");
  await textarea.fill(`${await textarea.inputValue()}\n__FIXTURE_MATCH_FAIL__`);
  await page.getByRole("button", { name: "Analyze & Rank Vault" }).click();

  await expect(page.getByText(/simulated API error/)).toBeVisible();
  await expect(page.getByText("78%")).toBeVisible();
});

test("accepting a tailored bullet updates only the canvas and is undoable", async ({
  page,
}) => {
  await hoverClick(canvasBlock(page, "proj-4"), "Remove");
  await analyzeDemoJd(page);

  const block = canvasBlock(page, "exp-1");
  const original = "Built React dashboards consumed by 40k monthly active analysts.";
  await expect(block).toContainText(original);
  await hoverClick(block, "Tailor");

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
  await hoverClick(block, "Tailor");
  const dialog = page.getByRole("dialog", { name: "Tailor bullet" });
  await dialog.getByRole("button", { name: "Reject" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(block).toContainText("Built React dashboards");
  await expect(page.getByRole("button", { name: "Undo" })).toBeDisabled();
});
